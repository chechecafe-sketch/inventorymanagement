import { useState, useEffect, useMemo } from 'react'
import { CATEGORIES, STATUS_CFG, CRITICAL_ITEMS } from './constants'
import { fmtTime, fmtAge, getAgeColor } from './utils'

const PENDIENTES = 'pendientes'
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

  // ── Build the row list for the active tab ──────────────────────────────
  let rows
  if (activeCat === PENDIENTES) {
    rows = storeAlerts
      .slice()
      .sort((a, b) =>
        (STATUS_CFG[b.status]?.weight || 0) - (STATUS_CFG[a.status]?.weight || 0) ||
        new Date(a.reported_at) - new Date(b.reported_at)
      )
      .map(a => ({ item: a.item, category: a.category }))
  } else {
    const catData = CATEGORIES[activeCat]
    const allItems = [...catData.items, ...(customItems[activeCat] || [])]
    rows = allItems
      .map(item => ({ item, category: activeCat }))
      .sort((a, b) => (STATUS_CFG[getStatus(b.item)]?.weight || 0) - (STATUS_CFG[getStatus(a.item)]?.weight || 0))
  }

  if (query.trim()) {
    const q = query.trim().toLowerCase()
    rows = rows.filter(r => r.item.toLowerCase().includes(q))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f5f0', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: store.color, padding: '14px 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 24, cursor: 'pointer', padding: 0 }}>‹</button>
          <div>
            <div style={{ fontFamily: "'DM Serif Display'", color: '#fff', fontSize: 18 }}>{store.fullName}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
              {userName} · {new Date().toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
              {isAdmin && <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '1px 6px', marginLeft: 6, fontSize: 10 }}>ADMIN</span>}
            </div>
          </div>
        </div>

        {/* Category tabs — Pendientes va primero */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
          <button onClick={() => setActiveCat(PENDIENTES)}
            style={{ background: activeCat === PENDIENTES ? '#fff' : 'rgba(255,255,255,0.18)',
              color: activeCat === PENDIENTES ? store.color : '#fff',
              border: 'none', borderRadius: 20, padding: '5px 11px', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, position: 'relative' }}>
            📋 Pendientes
            {storeAlerts.length > 0 && (
              <span style={{ position: 'absolute', top: -3, right: -3, background: '#c1121f',
                color: '#fff', borderRadius: 10, fontSize: 9, padding: '1px 4px', fontWeight: 700 }}>
                {storeAlerts.length}
              </span>
            )}
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => {
            const catAlerts = storeAlerts.filter(a => a.category === key)
            return (
              <button key={key} onClick={() => setActiveCat(key)}
                style={{ background: activeCat === key ? '#fff' : 'rgba(255,255,255,0.18)',
                  color: activeCat === key ? store.color : '#fff',
                  border: 'none', borderRadius: 20, padding: '5px 11px', fontSize: 11, fontWeight: 500,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, position: 'relative' }}>
                {cat.icon} {cat.label}
                {catAlerts.length > 0 && (
                  <span style={{ position: 'absolute', top: -3, right: -3, background: '#c1121f',
                    color: '#fff', borderRadius: 10, fontSize: 9, padding: '1px 4px', fontWeight: 700 }}>
                    {catAlerts.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {/* Buscador */}
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="🔍 Buscar ítem..."
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }}
        />

        {activeCat === PENDIENTES ? (
          <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>
            {rows.length === 0 ? '✓ Nada pendiente en esta tienda ahora mismo' : `Toca un botón para actualizar el estado · ${rows.length} pendiente${rows.length === 1 ? '' : 's'}`}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>Toca un botón para actualizar el estado · {CATEGORIES[activeCat].label}</div>
        )}

        {rows.map(({ item, category }) => {
          const st = getStatus(item)
          const alert = getAlert(item)
          const isCrit = CRITICAL_ITEMS.includes(item) || category === 'servicios'

          return (
            <div key={`${category}-${item}`} style={{
              background: '#fff', borderRadius: 10, padding: '11px 13px', marginBottom: 7,
              border: `1.5px solid ${st === 'ok' ? '#e8e4dc' : st === 'low' ? '#e9c46a' : st === 'urgent' ? '#e76f51' : '#c1121f'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {activeCat === PENDIENTES && (
                      <span style={{ fontSize: 9, color: '#999' }}>{CATEGORIES[category]?.icon}</span>
                    )}
                    {isCrit && <span style={{ fontSize: 9, background: '#fff0ee', color: '#c1121f', borderRadius: 4, padding: '1px 5px', fontWeight: 700, letterSpacing: 0.3 }}>★ CRÍTICO</span>}
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{item}</span>
                  </div>

                  {alert && (
                    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#666' }}>👤 {alert.reported_by}</span>
                      <span style={{ fontSize: 11, color: '#666' }}>🕐 {fmtTime(alert.reported_at)}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: getAgeColor(alert.reported_at) }}>⏱ {fmtAge(alert.reported_at)}</span>
                      {alert.resolved_by && <span style={{ fontSize: 11, color: '#4a7c59' }}>🔧 {alert.resolved_by}</span>}
                    </div>
                  )}
                </div>

                {/* 4 botones de estado directo — un toque deja el estado exacto */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {STATUS_KEYS.map(key => {
                    const sc = STATUS_CFG[key]
                    const active = st === key
                    return (
                      <button key={key} onClick={() => onSetStatus(store.id, item, category, key)}
                        title={sc.label}
                        style={{
                          background: active ? sc.bg : '#f4f2ee',
                          color: active ? sc.txt : '#999',
                          border: active ? 'none' : '1px solid #e8e4dc',
                          borderRadius: 7, width: 30, height: 30, fontSize: 13, fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transform: active ? 'scale(1.05)' : 'none', transition: 'all 0.1s',
                        }}>
                        {sc.short}
                      </button>
                    )
                  })}
                </div>
              </div>

              {isAdmin && st !== 'ok' && (
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <button onClick={() => onMarkOk(store.id, item)}
                    style={{ background: '#e8f5e9', color: '#2d6a4f', border: '1px solid #b7dfc5',
                      borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    ✓ Surtido
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Add custom item — solo tiene sentido dentro de una categoría concreta */}
        {activeCat !== PENDIENTES && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input value={newItemVal} onChange={e => setNewItemVal(e.target.value)}
              placeholder="+ Agregar ítem..."
              style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13 }}
              onKeyDown={e => { if (e.key === 'Enter' && newItemVal.trim()) { onAddItem(activeCat, newItemVal.trim()); setNewItemVal('') } }}
            />
            <button onClick={() => { if (newItemVal.trim()) { onAddItem(activeCat, newItemVal.trim()); setNewItemVal('') } }}
              style={{ background: store.color, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 16, cursor: 'pointer' }}>+</button>
          </div>
        )}
      </div>

      {/* Status legend */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff',
        borderTop: '1px solid #e8e4dc', padding: '9px 16px', display: 'flex', gap: 14, justifyContent: 'center' }}>
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: v.bg, color: v.txt, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{v.short}</div>
            <span style={{ fontSize: 11, color: '#555' }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
