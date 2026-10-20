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

// Histórico de stock para el Dashboard Master — todas las tiendas, últimos N días
export async function loadStockCountsSince(sinceDate) {
  const { data, error } = await supabase
    .from('stock_counts')
    .select('*')
    .gte('count_date', sinceDate)
    .order('count_date', { ascending: true })
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

// ── COCINA CENTRAL: stock listo para entregar ───────────────────────────────
// Una fila por ítem (lo más reciente que reportó la cocina).
export async function loadCocinaListo() {
  const { data, error } = await supabase.from('cocina_listo').select('*')
  if (error) console.error(error)
  return data || []
}

export async function upsertCocinaListo({ item, unit, quantity, reportedBy }) {
  const { error } = await supabase.from('cocina_listo').upsert({
    item, unit, quantity, reported_by: reportedBy, reported_at: new Date().toISOString(),
  }, { onConflict: 'item' })
  if (error) console.error(error)
  return !error
}

// ── ÚLTIMA ACTIVIDAD POR TIENDA ──────────────────────────────────────────────
// Para detectar tiendas "calladas" (ver alerta de 12h en MasterScreen) y para
// mostrar quién sí ha reportado hoy. Combina el último toque en `faltantes`
// (cualquier status, no solo agotado/urgente — updated_at se mueve incluso al
// marcar "Surtido") con la última captura en `stock_counts` (leche/café/pan).
// Con solo 5 tiendas, es más simple traer los últimos N movimientos ya
// ordenados y reducir "el más reciente por tienda" aquí mismo que armar una
// vista/RPC en Supabase.
export async function loadLastActivityPerStore() {
  const [{ data: faltRows, error: e1 }, { data: stockRows, error: e2 }] = await Promise.all([
    supabase.from('faltantes').select('store_id, updated_at, reported_by').order('updated_at', { ascending: false }).limit(500),
    supabase.from('stock_counts').select('store_id, reported_at, reported_by').order('reported_at', { ascending: false }).limit(500),
  ])
  if (e1) console.error(e1)
  if (e2) console.error(e2)

  const last = {} // { [store_id]: { at, by } }
  const consider = (storeId, at, by) => {
    if (!storeId || !at) return
    if (!last[storeId] || new Date(at) > new Date(last[storeId].at)) last[storeId] = { at, by: by || null }
  }
  ;(faltRows || []).forEach(r => consider(r.store_id, r.updated_at, r.reported_by))
  ;(stockRows || []).forEach(r => consider(r.store_id, r.reported_at, r.reported_by))
  return last
}

// ── QUIÉN HA REPORTADO HOY, POR TIENDA ───────────────────────────────────────
// Junta nombres únicos de faltantes_log (cambios de estado) + stock_counts de
// la fecha dada, agrupados por tienda. Sirve para ver de un vistazo si alguien
// del turno ya usó la app hoy, sin tener que entrar tienda por tienda.
export async function loadReportersToday(countDate) {
  const dayStart = `${countDate}T00:00:00`
  const [{ data: logRows, error: e1 }, { data: stockRows, error: e2 }] = await Promise.all([
    supabase.from('faltantes_log').select('store_id, changed_by, changed_at').gte('changed_at', dayStart),
    supabase.from('stock_counts').select('store_id, reported_by').eq('count_date', countDate),
  ])
  if (e1) console.error(e1)
  if (e2) console.error(e2)

  const byStore = {} // { [store_id]: Set(nombres) }
  const add = (storeId, name) => {
    if (!storeId || !name) return
    if (!byStore[storeId]) byStore[storeId] = new Set()
    byStore[storeId].add(name)
  }
  ;(logRows || []).forEach(r => add(r.store_id, r.changed_by))
  ;(stockRows || []).forEach(r => add(r.store_id, r.reported_by))

  const out = {}
  Object.entries(byStore).forEach(([storeId, set]) => { out[storeId] = [...set] })
  return out
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
