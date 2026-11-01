import { useMemo } from 'react'
import { STORES, CENTRAL_KITCHEN, CATEGORIES, QUANTITY_ITEMS, CLASS_META, classOf, categoriesFor } from './constants'
import { fmtAge } from './utils'
import { C, FONT_DISPLAY } from './theme'

// ── Resumen visual para admin ───────────────────────────────────────────────
// Modelo: todo ítem del catálogo se asume OK salvo que tenga un faltante activo
// (alerts solo trae los no-OK). Los ítems de cantidad exacta (café/leches/pan)
// se evalúan contra su mínimo con la última captura de hoy; sin captura hoy
// no cuentan (no sabemos), para no inflar ni hundir la salud.
// Salud = 1 − (Σ peso del problema × peso de clase / Σ peso de clase), con
// peso de problema agotado 1 · urgente .66 · poco .33, y peso de clase
// A ×3 · B ×2 · C ×1 (un crítico agotado debe doler más que un trapo faltante).

const WEIGHT = { out: 1, urgent: 0.66, low: 0.33, ok: 0 }
const CW = { A: 3, B: 2, C: 1 }
const healthOf = rows => {
  const den = rows.reduce((t, r) => t + CW[r.cls], 0)
  return den ? Math.round((1 - rows.reduce((t, r) => t + WEIGHT[r.status] * CW[r.cls], 0) / den) * 100) : 100
}
const SEV = { ok: 0, low: 1, urgent: 2, out: 3 }
const COLOR = { ok: C.ok, low: C.low, urgent: C.urgent, out: C.out }
const LABEL = { ok: 'OK', low: 'Poco', urgent: 'Urgente', out: 'Agotado' }
const worse = (a, b) => (SEV[b] > SEV[a] ? b : a)

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function stockStatus(value, cfg) {
  if (value <= 0) return 'out'
  if (value < cfg.min) return 'urgent'
  if (value < cfg.min * 1.5) return 'low'
  return 'ok'
}

const healthColor = h => (h >= 85 ? C.ok : h >= 65 ? C.low : h >= 45 ? C.urgent : C.out)

// ── Piezas visuales ─────────────────────────────────────────────────────────
function Donut({ counts, size = 150, center, sub }) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1
  const r = size / 2 - 12, circ = 2 * Math.PI * r
  let offset = 0
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.chipBg} strokeWidth="14" />
        {['out', 'urgent', 'low', 'ok'].map(k => {
          const len = (counts[k] / total) * circ
          const el = counts[k] > 0 && (
            <circle key={k} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLOR[k]} strokeWidth="14"
              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} />
          )
          offset += len
          return el
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: size * 0.24, color: C.text, lineHeight: 1 }}>{center}</div>
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  )
}

function Ring({ pct, size = 54 }) {
  const r = size / 2 - 5, circ = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.chipBg} strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={healthColor(pct)} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * circ} ${circ}`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14, color: C.text }}>{pct}</div>
    </div>
  )
}

const Card = ({ children, style }) => (
  <div style={{ background: C.card, borderRadius: 14, padding: '14px 16px', border: `1px solid ${C.cardBorder}`, marginBottom: 12, ...style }}>{children}</div>
)
const Title = ({ children, sub }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontWeight: 700, fontSize: 13, color: C.text, fontFamily: FONT_DISPLAY, textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</div>
    {sub && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>{sub}</div>}
  </div>
)

export default function OverviewPanel({ alerts, stockCounts, lastActivity = {}, onEnterStore }) {
  const today = useMemo(() => todayStr(), [])
  const locations = useMemo(() => [...STORES, CENTRAL_KITCHEN], [])

  // Última captura de hoy por tienda+ítem de cantidad exacta
  const stockLatest = useMemo(() => {
    const m = {}
    stockCounts.filter(c => c.count_date === today).forEach(c => {
      const k = `${c.store_id}|${c.item}`
      if (!m[k] || new Date(c.reported_at) > new Date(m[k].reported_at)) m[k] = c
    })
    return m
  }, [stockCounts, today])

  // Evaluación por ubicación: lista de {item, category, cls, status} de todo lo evaluado
  const perLoc = useMemo(() => {
    return locations.map(loc => {
      const rows = []
      const flagged = new Map(alerts.filter(a => a.store_id === loc.id).map(a => [a.item, a]))
      categoriesFor(loc).forEach(([cat, c]) => {
        c.items.forEach(item => {
          const a = flagged.get(item)
          rows.push({ item, category: cat, cls: classOf(item, cat), status: a ? a.status : 'ok', alert: a })
          flagged.delete(item)
        })
      })
      flagged.forEach(a => rows.push({ item: a.item, category: a.category, cls: classOf(a.item, a.category), status: a.status, alert: a })) // ítems custom
      if (!loc.isCentral) {
        Object.entries(QUANTITY_ITEMS).forEach(([item, cfg]) => {
          const s = stockLatest[`${loc.id}|${item}`]
          if (!s) return
          rows.push({ item, category: `stock_${cfg.group}`, cls: 'A', status: stockStatus(Number(s.quantity), cfg), stock: Number(s.quantity), cfg })
        })
      }
      const health = healthOf(rows)
      return { loc, rows, health }
    })
  }, [locations, alerts, stockLatest])

  const storesOnly = perLoc.filter(p => !p.loc.isCentral)
  const allRows = storesOnly.flatMap(p => p.rows)
  const globalCounts = { ok: 0, low: 0, urgent: 0, out: 0 }
  allRows.forEach(r => { globalCounts[r.status]++ })
  const globalHealth = healthOf(allRows)

  // Salud por clase (global, tiendas)
  const byClass = ['A', 'B', 'C'].map(k => {
    const rs = allRows.filter(r => r.cls === k)
    const bad = rs.filter(r => r.status !== 'ok')
    const health = healthOf(rs)
    return { k, total: rs.length, bad: bad.length, out: bad.filter(r => r.status === 'out').length, health }
  })

  // Heatmap categoría × ubicación (peor estado; "stock" agrupa los de cantidad exacta)
  const heatCats = useMemo(() => {
    const base = Object.entries(CATEGORIES).map(([key, c]) => ({ key, label: c.label, icon: c.icon }))
    return [...base, { key: 'stock_stock', label: 'Stock exacto', icon: '📦' }, { key: 'stock_pan', label: 'Pan · conteo', icon: '🥖' }]
  }, [])
  const cell = (p, catKey) => {
    const rs = p.rows.filter(r => r.category === catKey)
    if (!rs.length) return null
    const bad = rs.filter(r => r.status !== 'ok')
    return { status: bad.reduce((w, r) => worse(w, r.status), 'ok'), n: bad.length }
  }

  // Productos en riesgo en varias tiendas
  const multi = useMemo(() => {
    const g = {}
    storesOnly.forEach(p => p.rows.filter(r => r.status !== 'ok').forEach(r => {
      (g[r.item] ||= { item: r.item, cls: r.cls, worst: 'ok', stores: [] })
      g[r.item].worst = worse(g[r.item].worst, r.status)
      g[r.item].stores.push({ store: p.loc, status: r.status })
    }))
    return Object.values(g).filter(x => x.stores.length >= 2)
      .sort((a, b) => b.stores.length - a.stores.length || SEV[b.worst] - SEV[a.worst]).slice(0, 6)
  }, [storesOnly])

  const stockRows = Object.entries(QUANTITY_ITEMS)

  return (
    <div>
      {/* ── Global ── */}
      <Card>
        <Title sub="Las 5 tiendas · ítems evaluados hoy">🌎 Estado global de insumos</Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Donut counts={globalCounts} center={`${globalHealth}%`} sub="salud" />
          <div style={{ flex: 1 }}>
            {['out', 'urgent', 'low', 'ok'].map(k => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                <span style={{ color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i style={{ width: 10, height: 10, borderRadius: 3, background: COLOR[k], display: 'inline-block' }} />{LABEL[k]}
                </span>
                <b style={{ color: C.text, fontFamily: FONT_DISPLAY }}>{globalCounts[k]}</b>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Clasificación A/B/C ── */}
      <Card>
        <Title sub="Por impacto operativo — empieza siempre por la A">🏷️ Clasificación de insumos</Title>
        {byClass.map(({ k, total, bad, out, health }) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: CLASS_META[k].color, fontFamily: FONT_DISPLAY }}>{CLASS_META[k].label}</span>
              <span style={{ fontSize: 12, color: bad ? C.urgent : C.ok, fontWeight: 700 }}>
                {bad ? `${bad} con problema${out ? ` · ${out} agotado${out > 1 ? 's' : ''}` : ''}` : 'todo en orden'}
              </span>
            </div>
            <div style={{ height: 8, background: C.chipBg, borderRadius: 4, overflow: 'hidden', margin: '6px 0 3px' }}>
              <div style={{ height: '100%', width: `${health}%`, background: healthColor(health), borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 11, color: C.textFaint }}>{CLASS_META[k].hint} · {health}% salud · {total} evaluados</div>
          </div>
        ))}
      </Card>

      {/* ── Mapa de calor ── */}
      <Card>
        <Title sub="Color = peor estado de la categoría · número = ítems con problema">🗺️ Mapa de calor: categoría × tienda</Title>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) repeat(6, 34px)', gap: 4, alignItems: 'center' }}>
          <div />
          {locations.map(l => <div key={l.id} style={{ fontSize: 10, color: C.textDim, textAlign: 'center', fontWeight: 700 }}>{l.isCentral ? '🍳' : l.name}</div>)}
          {heatCats.map(hc => {
            const cells = perLoc.map(p => cell(p, hc.key))
            if (cells.every(c => !c)) return null
            return [
              <div key={hc.key} style={{ fontSize: 12, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hc.icon} {hc.label.split('/')[0]}</div>,
              ...cells.map((c, i) => (
                <div key={hc.key + i} style={{ height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: c ? (c.status === 'ok' ? 'rgba(52,211,153,0.16)' : COLOR[c.status]) : 'transparent',
                  color: c && c.status !== 'ok' ? '#14140f' : C.textFaint, fontWeight: 800, fontSize: 12 }}>
                  {c ? (c.status === 'ok' ? '✓' : c.n) : '·'}
                </div>
              )),
            ]
          })}
        </div>
      </Card>

      {/* ── Stock exacto vs mínimo ── */}
      <Card>
        <Title sub="Última captura de hoy · rojo bajo mínimo · amarillo cerca del mínimo">📦 Stock exacto por tienda</Title>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) repeat(5, 42px)', gap: 4, alignItems: 'center' }}>
          <div />
          {STORES.map(s => <div key={s.id} style={{ fontSize: 10, color: C.textDim, textAlign: 'center', fontWeight: 700 }}>{s.name}</div>)}
          {stockRows.map(([item, cfg]) => [
            <div key={item} style={{ fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.15 }}>
              {item}
              <div style={{ color: C.textFaint, fontSize: 10 }}>mín {cfg.min}{cfg.unit}</div>
            </div>,
            ...STORES.map(s => {
              const rec = stockLatest[`${s.id}|${item}`]
              const st = rec ? stockStatus(Number(rec.quantity), cfg) : null
              return (
                <div key={item + s.id} style={{ height: 34, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800,
                  background: st ? (st === 'ok' ? 'rgba(52,211,153,0.16)' : COLOR[st]) : 'transparent',
                  color: st ? (st === 'ok' ? C.ok : '#14140f') : C.textFaint }}>
                  {rec ? Math.round(Number(rec.quantity) * 10) / 10 : '–'}
                </div>
              )
            }),
          ])}
        </div>
        <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 8 }}>“–” = esa tienda no ha capturado hoy.</div>
      </Card>

      {/* ── Productos en varias tiendas ── */}
      {multi.length > 0 && (
        <Card>
          <Title sub="Si falta en 2+ tiendas, es tema de compra o de Cocina Central">🔁 Faltantes repetidos</Title>
          {multi.map(m => (
            <div key={m.item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderTop: `0.5px solid ${C.divider}` }}>
              <div style={{ fontSize: 13, color: C.text }}>
                <b style={{ color: CLASS_META[m.cls].color, marginRight: 6 }}>{m.cls}</b>{m.item}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {m.stores.map(x => (
                  <span key={x.store.id} title={`${x.store.name}: ${LABEL[x.status]}`}
                    style={{ background: COLOR[x.status], color: '#14140f', borderRadius: 6, fontSize: 10, fontWeight: 800, padding: '3px 6px' }}>{x.store.name}</span>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* ── Por tienda ── */}
      <div style={{ fontWeight: 700, fontSize: 14, margin: '18px 0 10px', color: C.text, fontFamily: FONT_DISPLAY, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cómo se ve cada tienda</div>
      {[...perLoc].sort((a, b) => a.health - b.health).map(({ loc, rows, health }) => {
        const bad = rows.filter(r => r.status !== 'ok')
        const counts = { out: 0, urgent: 0, low: 0 }
        bad.forEach(r => { counts[r.status]++ })
        const classBars = ['A', 'B', 'C'].map(k => {
          const rs = rows.filter(r => r.cls === k)
          return { k, n: rs.length, bad: rs.filter(r => r.status !== 'ok').length }
        }).filter(c => c.n > 0)
        const top = [...bad].sort((a, b) => SEV[b.status] - SEV[a.status] || 'ABC'.indexOf(a.cls) - 'ABC'.indexOf(b.cls)).slice(0, 4)
        const last = lastActivity[loc.id]
        return (
          <Card key={loc.id} style={{ borderColor: counts.out ? C.out : C.cardBorder }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Ring pct={health} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text, fontFamily: FONT_DISPLAY }}>{loc.fullName}</div>
                <div style={{ fontSize: 11.5, color: C.textDim, marginTop: 2 }}>
                  {bad.length === 0 ? <span style={{ color: C.ok, fontWeight: 700 }}>Todo en orden</span> : <>
                    {counts.out > 0 && <span style={{ color: C.out, fontWeight: 700 }}>{counts.out} agotado{counts.out > 1 ? 's' : ''} </span>}
                    {counts.urgent > 0 && <span style={{ color: C.urgent, fontWeight: 700 }}>· {counts.urgent} urgente{counts.urgent > 1 ? 's' : ''} </span>}
                    {counts.low > 0 && <span style={{ color: C.low, fontWeight: 700 }}>· {counts.low} poco</span>}
                  </>}
                </div>
                <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>
                  {last ? `Último reporte hace ${fmtAge(last.at)}` : 'Sin reportes registrados'}
                </div>
              </div>
              {onEnterStore && (
                <button onClick={() => onEnterStore(loc)}
                  style={{ background: C.text, color: '#000', border: 'none', borderRadius: 7, padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Entrar →</button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              {classBars.map(c => (
                <div key={c.k} style={{ flex: 1, background: C.chipBg, borderRadius: 8, padding: '6px 8px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: CLASS_META[c.k].color }}>Clase {c.k}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.bad ? C.urgent : C.ok, marginTop: 1 }}>{c.bad ? `${c.bad} de ${c.n}` : '✓ ok'}</div>
                </div>
              ))}
            </div>

            {top.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {top.map(r => (
                  <div key={r.item} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '4px 0', color: C.text }}>
                    <span><i style={{ width: 8, height: 8, borderRadius: 2, background: COLOR[r.status], display: 'inline-block', marginRight: 8 }} />
                      <b style={{ color: CLASS_META[r.cls].color, marginRight: 5 }}>{r.cls}</b>{r.item}</span>
                    <span style={{ color: C.textDim }}>{r.stock != null ? `${Math.round(r.stock * 10) / 10}${r.cfg.unit} (mín ${r.cfg.min})` : LABEL[r.status]}</span>
                  </div>
                ))}
                {bad.length > top.length && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>+{bad.length - top.length} más</div>}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
