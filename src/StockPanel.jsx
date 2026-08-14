import { useMemo } from 'react'
import { STORES, QUANTITY_ITEMS, SHIFTS } from './constants'
import { C, FONT_DISPLAY } from './theme'

// Últimos 7 días (fecha local, no UTC) como YYYY-MM-DD, del más viejo al más nuevo
function last7Dates() {
  const arr = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return arr
}

// Sparkline mínimo en SVG — sin librería, solo para ver la tendencia de un vistazo
function Sparkline({ values, color }) {
  const w = 84, h = 26, pad = 3
  const known = values.filter(v => v != null)
  if (known.length === 0) {
    return <div style={{ width: w, height: h, display: 'flex', alignItems: 'center', fontSize: 10, color: C.textFaint }}>sin datos</div>
  }
  const max = Math.max(1, ...known)
  const step = w / Math.max(1, values.length - 1)
  const yOf = v => h - pad - (v / max) * (h - pad * 2)
  const pts = values.map((v, i) => v == null ? null : `${(i * step).toFixed(1)},${yOf(v).toFixed(1)}`).filter(Boolean).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => v != null && (
        <circle key={i} cx={i * step} cy={yOf(v)} r="2.2" fill={color} />
      ))}
    </svg>
  )
}

export default function StockPanel({ stockCounts }) {
  const dates = useMemo(() => last7Dates(), [])
  const today = dates[dates.length - 1]

  const hasAnyData = stockCounts.length > 0

  return (
    <div style={{ background: C.card, borderRadius: 16, padding: '16px', border: `1.5px solid ${C.cardBorderHi}`, marginTop: 14 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: C.text, fontFamily: FONT_DISPLAY }}>📦 Stock — leche, café y pan</div>
        <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>Hoy por turno, y tendencia de cierre en los últimos 7 días</div>
      </div>

      {!hasAnyData ? (
        <div style={{ color: C.textFaint, fontSize: 13, fontStyle: 'italic', borderTop: `1px solid ${C.divider}`, paddingTop: 12 }}>
          Aún no hay capturas de stock esta semana.
        </div>
      ) : STORES.map(store => {
        const storeCounts = stockCounts.filter(c => c.store_id === store.id)
        if (!storeCounts.length) return null
        return (
          <div key={store.id} style={{ borderTop: `1px solid ${C.divider}`, paddingTop: 10, marginTop: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 8, fontFamily: FONT_DISPLAY }}>{store.fullName}</div>
            {Object.entries(QUANTITY_ITEMS).map(([item, cfg]) => {
              const itemCounts = storeCounts.filter(c => c.item === item)
              if (!itemCounts.length) return null

              const cierreByDate = dates.map(d => {
                const row = itemCounts.find(c => c.count_date === d && c.shift === 'cierre')
                return row ? Number(row.quantity) : null
              })
              const todayVals = SHIFTS.map(s => {
                const row = itemCounts.find(c => c.count_date === today && c.shift === s.key)
                return row ? Number(row.quantity) : null
              })

              // Huella de quién tocó el último número de hoy para este ítem —
              // así el admin ve quién está reportando sin tener que entrar
              // tienda por tienda.
              const todayRows = itemCounts.filter(c => c.count_date === today && c.reported_at)
              const lastRow = todayRows.sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at))[0]

              return (
                <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 0' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item}</div>
                    <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 2 }}>
                      Hoy: {todayVals.map((v, i) => `${SHIFTS[i].label.slice(0, 3)} ${v ?? '–'}${cfg.unit}`).join(' · ')}
                    </div>
                    {lastRow?.reported_by && (
                      <div style={{ fontSize: 10, color: C.textFaint, marginTop: 1 }}>👤 último: {lastRow.reported_by}</div>
                    )}
                  </div>
                  <Sparkline values={cierreByDate} color={C.ok} />
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
