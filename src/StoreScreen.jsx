import { useState, useEffect, useMemo, useCallback } from 'react'
import { CATEGORIES, STATUS_CFG, CRITICAL_ITEMS } from './constants'
import { fmtTime, fmtAge, getAgeColor } from './utils'
import { C, FONT_DISPLAY, FONT_BODY } from './theme'
import StockTab from './StockTab'

const PENDIENTES = 'pendientes'
const STOCK = 'stock'
const STATUS_KEYS = ['ok', 'low', 'urgent', 'out']

export default function StoreScreen({ store, userName, isAdmin, alerts, onBack, onSetStatus, onMarkOk, onAddItem, customItems }) {
  const [activeCat, setActiveCat] = useState(PENDIENTES)
  const [query, setQuery] = useState('')
  const [newItemVal, setNewItemVal] = useState('')
  const [, setTick] = useState(0)

  // Tick every minute to refresh age timers
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const storeAlerts = useMemo(() => alerts.filter(a => a.store_id === store.id), [alerts, store.id])

  const alertMap = useMemo(() => {
    const m = {}
    storeAlerts.forEach(a => { m[a.item] = a })
    return m
  }, [storeAlerts])

  const getStatus = (item) => alertMap[item]?.status || 'ok'
  const getAlert  = (item) => alertMap[item] || null

  // ── Orden congelado ──────────────────────────────────────────────────────
  // Antes la lista se reordenaba en cada render según el estado actual de cada
  // ítem: en cuanto tocabas un botón, ese ítem saltaba de posición (o
  // desaparecía, en Pendientes) y el dedo terminaba tocando otro ítem sin
  // querer — se sentía "raro" al tocar. Ahora el orden se calcula una sola vez
  // al entrar a la pestaña (o al agregar un ítem nuevo) y se queda fijo
  // mientras reportas; los botones y colores sí se actualizan al instante,
  // solo la posición no se mueve. Para refrescar el orden, vuelve a tocar la
  // misma pestaña.
  const buildOrder = useCallback((cat) => {
    if (cat === STOCK) return [] // el tab de Stock tiene su propia UI, no usa esta lista
    if (cat === PENDIENTES) {
      return storeAlerts
        .slice()
        .sort((a, b) =>
          (STATUS_CFG[b.status]?.weight || 0) - (STATUS_CFG[a.status]?.weight || 0) ||
          new Date(a.reported_at) - new Date(b.reported_at)
        )
        .map(a => ({ item: a.item, category: a.category }))
    }
    const catData = CATEGORIES[cat]
    const allItems = [...catData.items, ...(customItems[cat] || [])]
    return allItems
      .map(item => ({ item, category: cat }))
      .sort((a, b) => (STATUS_CFG[getStatus(b.item)]?.weight || 0) - (STATUS_CFG[getStatus(a.item)]?.weight || 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeAlerts, customItems])

  const [order, setOrder] = useState(() => buildOrder(PENDIENTES))
  const customCount = (customItems[activeCat] || []).length

  useEffect(() => {
    setOrder(buildOrder(activeCat))
    // Se recalcula al cambiar de pestaña, de tienda, o al agregar un ítem
    // nuevo a la categoría activa — no cuando solo cambia un estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCat, store.id, customCount])

  const selectCat = (cat) => {
    if (cat === activeCat) setOrder(buildOrder(cat)) // re-tocar la pestaña = refrescar orden
    else setActiveCat(cat)
  }

  // ── Build the row list for the active tab ──────────────────────────────
  let rows = order
  if (query.trim()) {
    const q = query.trim().toLowerCase()
    rows = rows.filter(r => r.item.toLowerCase().includes(q))
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 90, fontFamily: FONT_BODY }}>
      {/* Header */}
      <div style={{ background: C.bgHeader, padding: '16px 16px', position: 'sticky', top: 0, zIndex: 100, borderBottom:`1px solid ${C.divider}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 26, cursor: 'pointer', padding: 0 }}>‹</button>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: C.text, fontSize: 20 }}>{store.fullName}</div>
            <div style={{ color: C.textDim, fontSize: 12, marginTop:2 }}>
              {userName} · {new Date().toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
              {isAdmin && <span style={{ background: C.chipBg, color:C.text, borderRadius: 4, padding: '1px 6px', marginLeft: 6, fontSize: 10, fontWeight:700 }}>ADMIN</span>}
            </div>
          </div>
        </div>

        {/* Category tabs — Pendientes va primero */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
          <button onClick={() => selectCat(PENDIENTES)}
            style={{ background: activeCat === PENDIENTES ? C.text : C.chipBg,
              color: activeCat === PENDIENTES ? '#000' : C.textDim,
              border: 'none', borderRadius: 20, padding: '7px 13px', fontSize: 12, fontWeight: 800,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, position: 'relative', fontFamily:FONT_BODY }}>
            📋 Pendientes
            {storeAlerts.length > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: C.out,
                color: '#240707', borderRadius: 10, fontSize: 9, padding: '1px 4px', fontWeight: 800 }}>
                {storeAlerts.length}
              </span>
            )}
          </button>
          <button onClick={() => selectCat(STOCK)}
            style={{ background: activeCat === STOCK ? C.text : C.chipBg,
              color: activeCat === STOCK ? '#000' : C.textDim,
              border: 'none', borderRadius: 20, padding: '7px 13px', fontSize: 12, fontWeight: 800,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily:FONT_BODY }}>
            📦 Stock
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => {
            const catAlerts = storeAlerts.filter(a => a.category === key)
            return (
              <button key={key} onClick={() => selectCat(key)}
                style={{ background: activeCat === key ? C.text : C.chipBg,
                  color: activeCat === key ? '#000' : C.textDim,
                  border: 'none', borderRadius: 20, padding: '7px 13px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, position: 'relative', fontFamily:FONT_BODY }}>
                {cat.icon} {cat.label}
                {catAlerts.length > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, background: C.out,
                    color: '#240707', borderRadius: 10, fontSize: 9, padding: '1px 4px', fontWeight: 800 }}>
                    {catAlerts.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '14px 14px' }}>
        {activeCat === STOCK ? (
          <StockTab store={store} userName={userName} />
        ) : (
        <>
        {/* Buscador */}
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="🔍 Buscar ítem..."
          style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${C.cardBorder}`, fontSize: 14, marginBottom: 12,
            boxSizing: 'border-box', background:C.card, color:C.text, fontFamily:FONT_BODY }}
        />

        {activeCat === PENDIENTES ? (
          <div style={{ fontSize: 12, color: C.textFaint, marginBottom: 10 }}>
            {storeAlerts.length === 0 ? '✓ Nada pendiente en esta tienda ahora mismo' : `Toca un botón para actualizar el estado · ${storeAlerts.length} pendiente${storeAlerts.length === 1 ? '' : 's'}`}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.textFaint, marginBottom: 10 }}>Toca un botón para actualizar el estado · {CATEGORIES[activeCat].label}</div>
        )}

        {rows.map(({ item, category }) => {
          const st = getStatus(item)
          const alert = getAlert(item)
          const isCrit = CRITICAL_ITEMS.includes(item) || category === 'servicios'
          const borderCol = st === 'ok' ? C.cardBorder : STATUS_CFG[st].bg

          return (
            <div key={`${category}-${item}`} style={{
              background: C.card, borderRadius: 12, padding: '13px 14px', marginBottom: 8,
              border: `1.5px solid ${borderCol}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {activeCat === PENDIENTES && (
                      <span style={{ fontSize: 10, color: C.textFaint }}>{CATEGORIES[category]?.icon}</span>
                    )}
                    {isCrit && <span style={{ fontSize: 9, background: C.critBg, color: C.critTxt, borderRadius: 4, padding: '2px 6px', fontWeight: 800, letterSpacing: 0.3 }}>★ CRÍTICO</span>}
                    <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{item}</span>
                  </div>

                  {alert && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                      <span style={{ fontSize: 11, color: C.textDim }}>👤 {alert.reported_by}</span>
                      <span style={{ fontSize: 11, color: C.textDim }}>🕐 {fmtTime(alert.reported_at)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: getAgeColor(alert.reported_at) }}>⏱ {fmtAge(alert.reported_at)}</span>
                      {alert.resolved_by && <span style={{ fontSize: 11, color: C.ok }}>🔧 {alert.resolved_by}</span>}
                    </div>
                  )}
                </div>

                {/* 4 botones de estado directo — un toque deja el estado exacto.
                    44x44 con separación amplia: objetivo de toque cómodo, para
                    no fallar el botón ni tocar el de al lado por accidente. */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {STATUS_KEYS.map(key => {
                    const sc = STATUS_CFG[key]
                    const active = st === key
                    return (
                      <button key={key} onClick={() => onSetStatus(store.id, item, category, key)}
                        title={sc.label}
                        style={{
                          background: active ? sc.bg : C.chipBg,
                          color: active ? sc.txt : C.textFaint,
                          border: active ? `2px solid ${sc.bg}` : `1px solid ${C.cardBorder}`,
                          borderRadius: 10, width: 44, height: 44, fontSize: 20, lineHeight: 1,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: active ? 1 : 0.55,
                          transform: active ? 'scale(1.08)' : 'none', transition: 'transform 0.1s, opacity 0.1s',
                        }}>
                        {sc.short}
                      </button>
                    )
                  })}
                </div>
              </div>

              {isAdmin && st !== 'ok' && (
                <div style={{ marginTop: 10, textAlign: 'right' }}>
                  <button onClick={() => onMarkOk(store.id, item)}
                    style={{ background: 'rgba(52,211,153,0.12)', color: C.ok, border: `1px solid ${C.ok}`,
                      borderRadius: 7, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✓ Surtido
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Add custom item — solo tiene sentido dentro de una categoría concreta */}
        {activeCat !== PENDIENTES && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input value={newItemVal} onChange={e => setNewItemVal(e.target.value)}
              placeholder="+ Agregar ítem..."
              style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${C.cardBorder}`, fontSize: 14,
                background:C.card, color:C.text, fontFamily:FONT_BODY, boxSizing:'border-box' }}
              onKeyDown={e => { if (e.key === 'Enter' && newItemVal.trim()) { onAddItem(activeCat, newItemVal.trim()); setNewItemVal('') } }}
            />
            <button onClick={() => { if (newItemVal.trim()) { onAddItem(activeCat, newItemVal.trim()); setNewItemVal('') } }}
              style={{ background: C.text, color: '#000', border: 'none', borderRadius: 10, padding: '11px 16px', fontSize: 18, fontWeight:800, cursor: 'pointer' }}>+</button>
          </div>
        )}
        </>
        )}
      </div>

      {/* Status legend — no aplica en el tab de Stock (usa números, no estados) */}
      {activeCat !== STOCK && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.bgHeader,
          borderTop: `1px solid ${C.divider}`, padding: '11px 16px', display: 'flex', gap: 16, justifyContent: 'center' }}>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: v.bg, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{v.short}</div>
              <span style={{ fontSize: 12, color: C.textDim, fontWeight:500 }}>{v.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
