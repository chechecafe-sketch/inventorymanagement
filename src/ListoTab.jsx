import { useState, useEffect } from 'react'
import { READY_ITEMS } from './constants'
import { loadCocinaListo, upsertCocinaListo } from './db'
import { fmtAge } from './utils'
import { C, FONT_BODY } from './theme'

// Cocina Central: cantidad que ya tiene LISTA para entregar a las tiendas.
// Se actualiza cuando prepara o reparte; las tiendas ven este número al
// solicitar un semiterminado (así piden lo justo y no se acumula de más).
export default function ListoTab({ userName }) {
  const [rows, setRows] = useState({})
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    let alive = true
    loadCocinaListo().then(data => {
      if (!alive) return
      const m = {}
      data.forEach(r => { m[r.item] = r })
      setRows(m); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const save = async (item, cfg, raw) => {
    if (raw === '' || raw === null) return
    const quantity = Number(raw)
    if (Number.isNaN(quantity) || quantity < 0) return
    if (cfg.max && quantity > cfg.max &&
        !window.confirm(`${quantity} ${cfg.unit} de ${item} es muy alto (lo normal es hasta ${cfg.max} ${cfg.unit}). ¿Está bien el número?`)) return
    setRows(r => ({ ...r, [item]: { item, unit: cfg.unit, quantity, reported_by: userName, reported_at: new Date().toISOString() } }))
    const ok = await upsertCocinaListo({ item, unit: cfg.unit, quantity, reportedBy: userName })
    if (ok) { setSaved(item); setTimeout(() => setSaved(s => (s === item ? null : s)), 1200) }
  }

  const bump = (item, cfg, delta) => {
    const cur = Number(rows[item]?.quantity || 0)
    save(item, cfg, Math.max(0, Math.round((cur + delta) * 10) / 10))
  }

  const btn = { width: 44, height: 44, borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.chipBg,
    color: C.text, fontSize: 22, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }

  return (
    <div>
      <div style={{ fontSize: 12, color: C.textFaint, marginBottom: 12 }}>
        Captura cuánto tienes LISTO para entregar a las tiendas. Usa + y − al preparar o repartir. Las tiendas ven este número al solicitar.
      </div>
      {loading ? (
        <div style={{ color: C.textFaint, fontSize: 13, textAlign: 'center', padding: 24 }}>Cargando…</div>
      ) : Object.entries(READY_ITEMS).map(([item, cfg]) => {
        const row = rows[item]
        const qty = row ? Number(row.quantity) : ''
        return (
          <div key={item} style={{ background: C.card, borderRadius: 12, padding: '13px 14px', marginBottom: 8,
            border: `1.5px solid ${saved === item ? C.ok : C.cardBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{item}</span>
              <span style={{ color: C.textFaint, fontSize: 12 }}>({cfg.label})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button style={btn} onClick={() => bump(item, cfg, -cfg.step)}>−</button>
              <input key={`${item}-${qty}`} type="number" inputMode="decimal" min="0" step={cfg.step}
                defaultValue={qty} placeholder={cfg.unit}
                onBlur={e => { if (e.target.value !== String(qty)) save(item, cfg, e.target.value) }}
                style={{ flex: 1, minWidth: 0, padding: '10px 6px', borderRadius: 8, border: `1.5px solid ${C.cardBorder}`,
                  background: C.chipBg, color: C.text, fontSize: 18, fontWeight: 800, textAlign: 'center',
                  boxSizing: 'border-box', fontFamily: FONT_BODY }} />
              <button style={btn} onClick={() => bump(item, cfg, cfg.step)}>+</button>
            </div>
            {row && (
              <div style={{ fontSize: 10, color: C.textFaint, marginTop: 6, textAlign: 'center' }}>
                👤 {row.reported_by || '—'} · hace {fmtAge(row.reported_at)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
