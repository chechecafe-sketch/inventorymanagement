import { useState, useEffect, useMemo } from 'react'
import { QUANTITY_ITEMS, SHIFTS, PRIORITY_ITEMS, ROUND_STEPS } from './constants'
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

// group: 'stock' (café/leches/totopos, número libre) | 'pan' (panadería,
// botones de número redondo para reportar de un toque — ver ROUND_STEPS).
export default function StockTab({ store, userName, group = 'stock' }) {
  const date = useMemo(() => todayStr(), [])
  const [counts, setCounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [savedFlash, setSavedFlash] = useState(null) // "item-shift" que acaba de guardarse, para el check verde
  const [customVal, setCustomVal] = useState({}) // "item-shift" -> texto libre cuando no aplica un botón redondo

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

  // Huella de quién tocó el número — para que quede claro quién reportó
  // cada captura, no solo qué valor quedó.
  // Consumo desde el turno anterior capturado (apertura → medio → cierre).
  // Negativo = bajó el stock (consumo); positivo = hubo reposición.
  const getDelta = (item, shiftKey) => {
    const idx = SHIFTS.findIndex(x => x.key === shiftKey)
    const cur = getValue(item, shiftKey)
    if (cur === '' || idx <= 0) return null
    for (let i = idx - 1; i >= 0; i--) {
      const prev = getValue(item, SHIFTS[i].key)
      if (prev !== '') return Number(cur) - Number(prev)
    }
    return null
  }

  const getReporter = (item, shift) => {
    const row = counts.find(c => c.item === item && c.shift === shift)
    return row?.reported_by || null
  }

  const handleSave = async (item, unit, shift, rawValue) => {
    if (rawValue === '' || rawValue === null || rawValue === undefined) return
    const quantity = Number(rawValue)
    if (Number.isNaN(quantity) || quantity < 0) return

    // Validación de plausibilidad: evita capturas con la unidad equivocada
    // (ej. gramos tecleados donde se esperaban kilos) y números disparados.
    const cfg = QUANTITY_ITEMS[item]
    if (cfg?.max && quantity > cfg.max) {
      const okGo = window.confirm(`${quantity} ${cfg.unit} de ${item} es muy alto (lo normal es hasta ${cfg.max} ${cfg.unit}). ¿Está bien el número?`)
      if (!okGo) return
    } else if (cfg?.warnBelow && quantity > 0 && quantity < cfg.warnBelow) {
      const okGo = window.confirm(`${quantity} ${cfg.unit} de ${item} es muy poco. ¿Seguro? Aquí se captura en ${cfg.label.toLowerCase()}.`)
      if (!okGo) return
    }

    setCounts(prev => {
      const exists = prev.find(c => c.item === item && c.shift === shift)
      if (exists) return prev.map(c => (c.item === item && c.shift === shift) ? { ...c, quantity, reported_by: userName } : c)
      return [...prev, { item, shift, quantity, unit, reported_by: userName }]
    })

    const ok = await upsertStockCount({ storeId: store.id, item, unit, shift, quantity, reportedBy: userName, countDate: date })
    if (ok) {
      const key = `${item}-${shift}`
      setSavedFlash(key)
      setTimeout(() => setSavedFlash(f => (f === key ? null : f)), 1200)
    }
  }

  const items = Object.entries(QUANTITY_ITEMS).filter(([, cfg]) => (cfg.group || 'stock') === group)
  const isPan = group === 'pan'

  return (
    <div>
      <div style={{ fontSize: 12, color: C.textFaint, marginBottom: 12 }}>
        {isPan
          ? 'Toca el número más cercano por turno — el número se guarda al instante. Si no cae justo, usa "otro" para teclear el exacto.'
          : 'Captura el stock de hoy en cada turno — el número se guarda solo al salir del campo.'}
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
              const reporter = getReporter(item, s.key)
              // ¿El valor guardado cae justo en un botón redondo? si no, y hay
              // algo capturado, lo tratamos como "otro" para no perder el dato.
              const valNum = hasValue ? Number(val) : null
              const matchesStep = valNum !== null && ROUND_STEPS.includes(valNum)
              const showCustomInput = isPan && (customVal[key] !== undefined || (hasValue && !matchesStep))

              return (
                <div key={s.key} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700,
                    color: justSaved ? C.ok : hasValue ? C.textDim : C.textFaint,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.label}{hasValue ? ' ✓' : ''}
                  </div>
                  {hasValue && cfg.min != null && Number(val) <= cfg.min && (
                    <div style={{ fontSize: 9, fontWeight: 800, color: Number(val) === 0 ? C.critTxt : '#e9a23b', marginBottom: 3 }}>
                      {Number(val) === 0 ? '⛔ AGOTADO' : '⚠ BAJO MÍNIMO'}
                    </div>
                  )}

                  {isPan ? (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {ROUND_STEPS.map(n => {
                          const active = valNum === n
                          return (
                            <button key={n} onClick={() => { setCustomVal(cv => { const { [key]: _drop, ...rest } = cv; return rest }); handleSave(item, cfg.unit, s.key, n) }}
                              style={{
                                minWidth: 30, padding: '6px 4px', borderRadius: 7, fontSize: 12, fontWeight: 800,
                                border: `1.5px solid ${active ? C.ok : C.cardBorder}`,
                                background: active ? C.ok : C.chipBg,
                                color: active ? '#0d1f16' : C.textDim,
                                cursor: 'pointer',
                              }}>
                              {n}
                            </button>
                          )
                        })}
                        <button onClick={() => setCustomVal(cv => ({ ...cv, [key]: hasValue ? String(val) : '' }))}
                          style={{
                            padding: '6px 8px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                            border: `1.5px dashed ${showCustomInput ? C.textDim : C.cardBorder}`,
                            background: C.chipBg, color: C.textFaint, cursor: 'pointer',
                          }}>
                          otro…
                        </button>
                      </div>
                      {showCustomInput && (
                        <input
                          type="number" inputMode="numeric" min="0" step="1"
                          autoFocus
                          defaultValue={hasValue ? val : ''}
                          placeholder={cfg.unit}
                          onBlur={e => { handleSave(item, cfg.unit, s.key, e.target.value); setCustomVal(cv => ({ ...cv, [key]: e.target.value })) }}
                          style={{
                            width: '100%', marginTop: 6, padding: '8px 6px', borderRadius: 8,
                            border: `1.5px solid ${justSaved ? C.ok : C.cardBorder}`,
                            background: C.chipBg, color: C.text, fontSize: 14, fontWeight: 700, textAlign: 'center',
                            boxSizing: 'border-box', fontFamily: FONT_BODY,
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <input
                      type="number" inputMode="decimal" min="0" step={cfg.step || 0.1}
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
                  )}

                  {(() => {
                    const d = getDelta(item, s.key)
                    if (d === null || d === 0) return null
                    return (
                      <div style={{ fontSize: 10, color: d < 0 ? C.textFaint : C.ok, marginTop: 3, textAlign: 'center' }}>
                        {d > 0 ? '+' : ''}{Math.round(d * 10) / 10} {cfg.unit} vs turno anterior
                      </div>
                    )
                  })()}

                  {/* Huella de quién reportó este número — visible para que el
                      admin pueda ver quién está tocando qué sin adivinar. */}
                  {reporter && (
                    <div style={{
                      fontSize: 9, color: C.textFaint, marginTop: 3, textAlign: 'center',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }} title={`Reportado por ${reporter}`}>
                      👤 {reporter}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
