import { useState, useEffect, useMemo } from 'react'
import { QUANTITY_ITEMS, SHIFTS, PRIORITY_ITEMS } from './constants'
import { loadStockCounts, upsertStockCount } from './db'
import { C, FONT_BODY } from './theme'

// Fecha local (CDMX) en formato YYYY-MM-DD — usamos la fecha del dispositivo,
// no UTC, para que el corte de día no se recorra por zona horaria (evita que
// un reporte de cierre a las 11pm caiga en el día siguiente en la BD).
function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function StockTab({ store, userName }) {
  const date = useMemo(() => todayStr(), [])
  const [counts, setCounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [savedFlash, setSavedFlash] = useState(null) // "item-shift" que acaba de guardarse, para el check verde

  useEffect(() => {
    let alive = true
    setLoading(true)
    loadStockCounts(store.id, date).then(rows => {
      if (alive) { setCounts(rows); setLoading(false) }
    })
    return () => { alive = false }
  }, [store.id, date])

  const getValue = (item, shift) => {
    const row = counts.find(c => c.item === item && c.shift === shift)
    return row ? row.quantity : ''
  }

  const handleSave = async (item, unit, shift, rawValue) => {
    if (rawValue === '' || rawValue === null || rawValue === undefined) return
    const quantity = Number(rawValue)
    if (Number.isNaN(quantity) || quantity < 0) return

    setCounts(prev => {
      const exists = prev.find(c => c.item === item && c.shift === shift)
      if (exists) return prev.map(c => (c.item === item && c.shift === shift) ? { ...c, quantity } : c)
      return [...prev, { item, shift, quantity, unit }]
    })

    const ok = await upsertStockCount({ storeId: store.id, item, unit, shift, quantity, reportedBy: userName, countDate: date })
    if (ok) {
      const key = `${item}-${shift}`
      setSavedFlash(key)
      setTimeout(() => setSavedFlash(f => (f === key ? null : f)), 1200)
    }
  }

  const items = Object.entries(QUANTITY_ITEMS)

  return (
    <div>
      <div style={{ fontSize: 12, color: C.textFaint, marginBottom: 12 }}>
        Captura el stock de hoy en cada turno — el número se guarda solo al salir del campo.
      </div>

      {loading ? (
        <div style={{ color: C.textFaint, fontSize: 13, textAlign: 'center', padding: 24 }}>Cargando…</div>
      ) : items.map(([item, cfg]) => (
        <div key={item} style={{ background: C.card, borderRadius: 12, padding: '13px 14px', marginBottom: 8, border: `1.5px solid ${PRIORITY_ITEMS.includes(item) ? C.critTxt : C.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {PRIORITY_ITEMS.includes(item) && (
              <span style={{ fontSize: 9, background: C.critBg, color: C.critTxt, borderRadius: 4, padding: '2px 6px', fontWeight: 800, letterSpacing: 0.3 }}>★ PRIORITARIO</span>
            )}
            <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{item}</span>
            <span style={{ color: C.textFaint, fontWeight: 500, fontSize: 12 }}>({cfg.label})</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {SHIFTS.map(s => {
              const key = `${item}-${s.key}`
              const val = getValue(item, s.key)
              const hasValue = val !== ''
              const justSaved = savedFlash === key
              return (
                <div key={s.key} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700,
                    color: justSaved ? C.ok : hasValue ? C.textDim : C.textFaint,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.label}{hasValue ? ' ✓' : ''}
                  </div>
                  <input
                    type="number" inputMode="decimal" min="0" step="0.1"
                    defaultValue={val}
                    placeholder={cfg.unit}
                    onBlur={e => handleSave(item, cfg.unit, s.key, e.target.value)}
                    style={{
                      width: '100%', padding: '10px 6px', borderRadius: 8,
                      border: `1.5px solid ${justSaved ? C.ok : C.cardBorder}`,
                      background: C.chipBg, color: C.text, fontSize: 15, fontWeight: 700, textAlign: 'center',
                      boxSizing: 'border-box', fontFamily: FONT_BODY, transition: 'border-color 0.2s',
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
