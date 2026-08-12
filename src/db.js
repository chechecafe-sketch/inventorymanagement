import { supabase } from './supabase'

// ── LOAD all faltantes for a store ──────────────────────────────────────────
export async function loadStoreFaltantes(storeId) {
  const { data, error } = await supabase
    .from('faltantes')
    .select('*')
    .eq('store_id', storeId)
    .neq('status', 'ok')
  if (error) console.error(error)
  return data || []
}

// ── LOAD all active (non-ok) alerts across all stores ───────────────────────
export async function loadAllAlerts() {
  const { data, error } = await supabase
    .from('faltantes')
    .select('*')
    .neq('status', 'ok')
    .order('reported_at', { ascending: false })
  if (error) console.error(error)
  return data || []
}

// ── UPSERT a faltante (insert or update by store+item) ──────────────────────
// Nota: `faltantes` tiene un constraint único (store_id, item) — un solo
// registro "estado actual" por ítem. Usamos upsert real con onConflict en
// vez de select-then-insert-or-update: eso fue lo que antes generaba filas
// duplicadas sin fin cuando ya existía más de un registro para el mismo ítem.
export async function upsertFaltante({ storeId, category, item, status, reportedBy, adminName }) {
  const now = new Date().toISOString()

  // maybeSingle: no truena si no hay fila (ítem nunca reportado antes)
  const { data: existing } = await supabase
    .from('faltantes')
    .select('id, status')
    .eq('store_id', storeId)
    .eq('item', item)
    .maybeSingle()

  const prevStatus = existing?.status || 'ok'

  const payload = status === 'ok'
    ? {
        store_id: storeId, category, item, status: 'ok',
        resolved_by: adminName || reportedBy, resolved_at: now, updated_at: now,
      }
    : {
        store_id: storeId, category, item, status,
        reported_by: reportedBy, reported_at: now,
        resolved_by: null, resolved_at: null, updated_at: now,
      }

  const { data: upserted, error } = await supabase
    .from('faltantes')
    .upsert(payload, { onConflict: 'store_id,item' })
    .select('id')
    .single()

  if (error) { console.error(error); return }
  const faltanteId = upserted?.id

  // Log the change
  if (faltanteId && prevStatus !== status) {
    await supabase.from('faltantes_log').insert({
      faltante_id: faltanteId,
      store_id: storeId,
      item,
      status_from: prevStatus,
      status_to: status,
      changed_by: reportedBy,
      admin_name: adminName || null,
      changed_at: now,
    })

    // Track consumption cycle
    await trackConsumoCycle({ storeId, item, category, prevStatus, newStatus: status, now })
  }
}

// ── TRACK consumption cycle for predictions ─────────────────────────────────
async function trackConsumoCycle({ storeId, item, category, prevStatus, newStatus, now }) {
  if (prevStatus === 'ok' && newStatus !== 'ok') {
    // Start a new cycle
    await supabase.from('consumo_historico').insert({
      store_id: storeId, item, category,
      cycle_start: now,
      min_status: newStatus,
      week_day: new Date(now).getDay(),
      week_num: getWeekNum(new Date(now)),
    })
  } else if (newStatus === 'ok' && prevStatus !== 'ok') {
    // Close the most recent open cycle
    const { data: cycle } = await supabase
      .from('consumo_historico')
      .select('*')
      .eq('store_id', storeId)
      .eq('item', item)
      .is('cycle_end', null)
      .order('cycle_start', { ascending: false })
      .limit(1)
      .single()

    if (cycle) {
      const startMs = new Date(cycle.cycle_start).getTime()
      const endMs = new Date(now).getTime()
      const hoursTotal = (endMs - startMs) / 3600000

      await supabase.from('consumo_historico').update({
        cycle_end: now,
        hours_to_resolve: hoursTotal,
        min_status: cycle.min_status === 'ok' ? prevStatus : cycle.min_status,
      }).eq('id', cycle.id)
    }
  }
}

// ── LOAD historical avg cycle times per item ─────────────────────────────────
export async function loadConsumoStats(storeId) {
  const { data, error } = await supabase
    .from('consumo_historico')
    .select('item, hours_to_resolve, cycle_start, week_day')
    .eq('store_id', storeId)
    .not('cycle_end', 'is', null)
    .order('cycle_start', { ascending: false })
    .limit(200)
  if (error) console.error(error)
  return data || []
}

// ── LOAD custom items for a store ────────────────────────────────────────────
export async function loadCustomItems(storeId) {
  const { data } = await supabase
    .from('faltantes_items_custom')
    .select('*')
    .eq('store_id', storeId)
    .eq('active', true)
  return data || []
}

// ── ADD custom item ───────────────────────────────────────────────────────────
export async function addCustomItem({ storeId, category, itemName, addedBy }) {
  const { error } = await supabase.from('faltantes_items_custom').upsert({
    store_id: storeId, category, item_name: itemName, added_by: addedBy, active: true,
  }, { onConflict: 'store_id,category,item_name' })
  return !error
}

// ── STOCK COUNTS — leche/café/pan capturados 3x al día (apertura/medio/cierre) ─
export async function loadStockCounts(storeId, countDate) {
  const { data, error } = await supabase
    .from('stock_counts')
    .select('*')
    .eq('store_id', storeId)
    .eq('count_date', countDate)
  if (error) console.error(error)
  return data || []
}

export async function upsertStockCount({ storeId, item, unit, shift, quantity, reportedBy, countDate }) {
  const { error } = await supabase
    .from('stock_counts')
    .upsert({
      store_id: storeId, item, unit, shift, quantity,
      reported_by: reportedBy, reported_at: new Date().toISOString(),
      count_date: countDate,
    }, { onConflict: 'store_id,item,count_date,shift' })
  if (error) console.error(error)
  return !error
}

// ── SUBSCRIBE to real-time alerts ────────────────────────────────────────────
export function subscribeAlerts(callback) {
  return supabase
    .channel('faltantes_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'faltantes' }, callback)
    .subscribe()
}

function getWeekNum(d) {
  const onejan = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7)
}
