import { useMemo } from 'react'
import { STORES, QUANTITY_ITEMS, STATUS_CFG } from './constants'
import { fmtAge, priorityScore } from './utils'
import { C, FONT_DISPLAY } from './theme'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Tablero consolidado — pedido #2/#3 ───────────────────────────────────────
// Junta lo que antes había que armar a mano (una consulta SQL + agrupar por
// producto): (A) todos los faltantes activos agrupados por PRODUCTO en vez de
// por tienda, mostrando de un vistazo qué tiendas lo necesitan y qué tan
// urgente es en conjunto; (B) el total de stock (leche/café/pan) sumado entre
// las 5 tiendas hoy, usando el mismo stockCounts que ya carga el Dashboard.
export default function ConsolidatedPanel({ alerts, consumoStats, stockCounts }) {
  const today = useMemo(() => todayStr(), [])

  // ── (A) Faltantes agrupados por producto, todas las tiendas ───────────────
  const byProduct = useMemo(() => {
    const groups = {}
    alerts.forEach(a => {
      if (!groups[a.item]) groups[a.item] = { item: a.item, category: a.category, entries: [] }
      groups[a.item].entries.push(a)
    })
    return Object.values(groups).map(g => {
      const worstWeight = Math.max(...g.entries.map(e => STATUS_CFG[e.status]?.weight || 0))
      const worstStatus = Object.entries(STATUS_CFG).find(([, cfg]) => cfg.weight === worstWeight)?.[0] || 'low'
      const score = Math.max(...g.entries.map(e => priorityScore(e, consumoStats[e.store_id])))
      return { ...g, worstStatus, score }
    }).sort((a, b) => b.score - a.score)
  }, [alerts, consumoStats])

  const agotados = byProduct.filter(g => g.worstStatus === 'out')
  const resto = byProduct.filter(g => g.worstStatus !== 'out')

  // ── (B) Totales de stock (leche/café/pan) sumados hoy entre tiendas ──────
  const stockTotals = useMemo(() => {
    return Object.entries(QUANTITY_ITEMS).map(([item, cfg]) => {
      const perStore = STORES.map(store => {
        const rows = stockCounts.filter(c => c.store_id === store.id && c.item === item && c.count_date === today)
        if (!rows.length) return { store, value: null }
        const last = rows.sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at))[0]
        return { store, value: Number(last.quantity) }
      })
      const reporting = perStore.filter(p => p.value != null)
      const total = reporting.reduce((s, p) => s + p.value, 0)
      const missing = perStore.filter(p => p.value == null).map(p => p.store.name)
      return { item, cfg, perStore, total, missing, hasAny: reporting.length > 0 }
    }).filter(t => t.hasAny)
  }, [stockCounts, today])

  const renderProductRow = (g, i, listLen) => (
    <div key={g.item} style={{
      display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8,
      padding:'9px 0', borderBottom: i < listLen-1 ? `0.5px solid ${C.divider}` : 'none' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:9, minWidth:0 }}>
        <span style={{ fontSize:13, marginTop:1 }}>{g.worstStatus==='out'?'🔴':g.worstStatus==='urgent'?'🟠':'🟡'}</span>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{g.item}</div>
          <div style={{ fontSize:11.5, color:C.textDim, marginTop:2, display:'flex', flexWrap:'wrap', gap:6 }}>
            {g.entries
              .slice().sort((a,b) => (STATUS_CFG[b.status]?.weight||0) - (STATUS_CFG[a.status]?.weight||0))
              .map(e => {
                const store = STORES.find(s => s.id === e.store_id)
                const sc = STATUS_CFG[e.status]
                return (
                  <span key={e.store_id} style={{ background:C.chipBg, borderRadius:6, padding:'2px 6px', border:`1px solid ${sc?.bg || C.cardBorder}` }}>
                    {store?.name || e.store_id} · {sc?.label} · {fmtAge(e.reported_at)}
                  </span>
                )
              })}
          </div>
        </div>
      </div>
      <span style={{ fontSize:11, fontWeight:800, color:C.textFaint, flexShrink:0 }}>{g.entries.length} tienda{g.entries.length===1?'':'s'}</span>
    </div>
  )

  return (
    <div style={{ background:C.card, borderRadius:16, padding:'16px', border:`1.5px solid ${C.cardBorderHi}`, marginTop:16 }}>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontWeight:800, fontSize:16, color:C.text, fontFamily:FONT_DISPLAY }}>📋 Pedido consolidado — todas las tiendas</div>
        <div style={{ fontSize:12, color:C.textDim, marginTop:2 }}>Agrupado por producto, no por tienda — para armar un solo pedido</div>
      </div>

      {byProduct.length === 0 ? (
        <div style={{ color:C.textFaint, fontSize:13, fontStyle:'italic', borderTop:`1px solid ${C.divider}`, paddingTop:12 }}>
          Nada pendiente por ahora — todo en verde.
        </div>
      ) : (
        <>
          {agotados.length > 0 && (
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.out, textTransform:'uppercase', letterSpacing:0.5, borderTop:`1px solid ${C.divider}`, paddingTop:10 }}>
                🔴 Agotado ({agotados.length})
              </div>
              {agotados.map((g,i) => renderProductRow(g, i, agotados.length))}
            </div>
          )}
          {resto.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:C.urgent, textTransform:'uppercase', letterSpacing:0.5, borderTop:`1px solid ${C.divider}`, paddingTop:10 }}>
                🟡 Urgente / Poco ({resto.length})
              </div>
              {resto.map((g,i) => renderProductRow(g, i, resto.length))}
            </div>
          )}
        </>
      )}

      {stockTotals.length > 0 && (
        <div style={{ marginTop:16, borderTop:`1px solid ${C.divider}`, paddingTop:12 }}>
          <div style={{ fontSize:11, fontWeight:800, color:C.textDim, textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>
            📦 Totales de hoy (leche · café · pan), suma de las 5 tiendas
          </div>
          {stockTotals.map(t => (
            <div key={t.item} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:`0.5px solid ${C.divider}` }}>
              <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{t.item}</div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{t.total.toLocaleString('es-MX')} {t.cfg.unit}</div>
                {t.missing.length > 0 && (
                  <div style={{ fontSize:9.5, color:C.textFaint }}>sin reporte hoy: {t.missing.join(', ')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
