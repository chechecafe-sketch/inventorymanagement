import { useState, useEffect, useMemo } from 'react'
import { STORES, ADMINS, CATEGORIES, CRITICAL_ITEMS } from './constants'
import { haversineKm, fmtAge, fmtTime, getAgeColor, avgResupplyHours, priorityScore } from './utils'
import { C, FONT_DISPLAY, FONT_BODY } from './theme'
import StockPanel from './StockPanel'

// Total de ítems que se trackean por tienda (mismo catálogo base para las 5) —
// se usa para que la barra de salud sea proporcional de verdad, en vez de
// saturarse con tiendas que acumulan muchas alertas.
const TOTAL_TRACKED_ITEMS = Object.values(CATEGORIES).reduce((s, c) => s + c.items.length, 0)

export default function MasterScreen({ alerts, onBack, onMarkOk, consumoStats, stockCounts, onEnterStore }) {
  const [tick, setTick] = useState(0)
  const [expandedStore, setExpandedStore] = useState(null)

  useEffect(() => {
    const t = setInterval(() => setTick(x => x+1), 30000)
    return () => clearInterval(t)
  }, [])

  const urgent = alerts.filter(a => a.status === 'urgent' || a.status === 'out')
  const critical = alerts.filter(a => a.isCritical)
  const storesWithIssues = new Set(urgent.map(a => a.store_id)).size

  // "Surtir primero" — ranking determinístico, sin IA ni llaves expuestas:
  // combina severidad, antigüedad del reporte y qué tan rápido se agota ese
  // ítem históricamente en esa tienda (consumo_historico ya trackea esto).
  const surtirPrimero = useMemo(() => {
    return alerts
      .filter(a => a.status !== 'ok')
      .map(a => ({ ...a, score: priorityScore(a, consumoStats[a.store_id]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }, [alerts, consumoStats])

  return (
    <div style={{ minHeight:'100vh', background:C.bg, paddingBottom:40, fontFamily:FONT_BODY }}>
      <div style={{ background:C.bgHeader, padding:'20px 20px', borderBottom:`1px solid ${C.divider}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={onBack} style={{ background:'none', border:'none', color:C.textDim, fontSize:26, cursor:'pointer' }}>‹</button>
            <div>
              <div style={{ fontFamily:FONT_DISPLAY, fontWeight:700, color:C.text, fontSize:22, letterSpacing:-0.3 }}>Dashboard Master</div>
              <div style={{ color:C.textFaint, fontSize:12, marginTop:2 }}>
                {new Date().toLocaleString('es-MX',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:14 }}>
        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { lbl:'Críticas', val:critical.length, col:critical.length>0?C.out:C.ok, icon:'🔴' },
            { lbl:'Urgentes/Agotadas', val:urgent.length, col:urgent.length>0?C.urgent:C.ok, icon:'🟠' },
            { lbl:'Tiendas con issues', val:storesWithIssues, col:C.text, icon:'🏪' },
            { lbl:'Sin resolver >2h', val:urgent.filter(a=>(Date.now()-new Date(a.reported_at).getTime())>7200000).length, col:C.out, icon:'⏰' },
          ].map((k,i) => (
            <div key={i} style={{ background:C.card, borderRadius:14, padding:'14px 16px', border:`1px solid ${C.cardBorder}` }}>
              <div style={{ fontSize:12, color:C.textDim, fontWeight:600 }}>{k.icon} {k.lbl}</div>
              <div style={{ fontSize:32, fontWeight:800, color:k.col, fontFamily:FONT_DISPLAY, marginTop:4 }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Per-store */}
        <div style={{ fontWeight:700, fontSize:14, marginBottom:10, color:C.text, fontFamily:FONT_DISPLAY, textTransform:'uppercase', letterSpacing:0.5 }}>Estado por tienda</div>
        {STORES.map(store => {
          const sa = urgent.filter(a => a.store_id === store.id)
          const cr = sa.filter(a => a.isCritical).length
          // % de ítems trackeados que SÍ están bien (proporcional al catálogo real,
          // ya no se satura en 5% cuando una tienda acumula muchas alertas)
          const pct = Math.max(0, Math.round(100 - (sa.length / TOTAL_TRACKED_ITEMS) * 100))
          const barCol = pct < 55 ? C.out : pct < 80 ? C.urgent : C.ok
          const oldest = sa.length ? Math.min(...sa.map(a=>new Date(a.reported_at).getTime())) : null
          const isExpanded = expandedStore === store.id

          return (
            <div key={store.id} style={{ background:C.card, borderRadius:14, padding:'14px 16px', marginBottom:10, border:`1.5px solid ${cr>0?C.out:C.cardBorder}` }}>
              <div onClick={() => setExpandedStore(isExpanded ? null : store.id)}
                style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:store.color,
                    display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:12, fontFamily:FONT_DISPLAY }}>
                    P{store.priority}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:C.text, fontFamily:FONT_DISPLAY }}>{store.fullName}</div>
                    {oldest && <div style={{ fontSize:11, color:getAgeColor(oldest), fontWeight:600, marginTop:2 }}>⏱ alerta más vieja: {fmtAge(oldest)}</div>}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  {cr>0 && <span style={{ color:C.out, fontWeight:800, fontSize:14 }}>🔴{cr}</span>}
                  <span style={{ fontSize:13, fontWeight:700, color:sa.length>0?C.urgent:C.ok }}>{sa.length} alertas</span>
                  {onEnterStore && (
                    <button onClick={e => { e.stopPropagation(); onEnterStore(store) }}
                      style={{ background:C.text, color:'#000', border:'none', borderRadius:7,
                        padding:'5px 10px', fontSize:11, fontWeight:800, cursor:'pointer' }}>
                      Entrar →
                    </button>
                  )}
                  <span style={{ color:C.textFaint, fontSize:18 }}>{isExpanded?'∧':'∨'}</span>
                </div>
              </div>

              <div style={{ height:6, background:C.chipBg, borderRadius:3, overflow:'hidden', marginTop:10 }}>
                <div style={{ height:'100%', borderRadius:3, background:barCol, width:`${pct}%`, transition:'width 0.4s' }} />
              </div>

              {isExpanded && sa.map((a,i) => (
                <div key={i} style={{ marginTop:10, padding:'10px 12px', background:C.chipBg, borderRadius:9,
                  border:`1px solid ${a.status==='out'?C.out:C.urgent}`,
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{a.status==='out'?'🔴':'🟠'} {a.item}</div>
                    <div style={{ fontSize:11, color:C.textDim, marginTop:3 }}>
                      👤 {a.reported_by} · ⏱ <span style={{ color:getAgeColor(a.reported_at), fontWeight:700 }}>{fmtAge(a.reported_at)}</span>
                      {a.resolved_by && <span style={{ color:C.ok, marginLeft:6 }}>🔧 {a.resolved_by}</span>}
                    </div>
                    {/* Avg resupply prediction */}
                    {(() => {
                      const avg = avgResupplyHours(consumoStats[store.id]||[], a.item)
                      return avg ? <div style={{ fontSize:11, color:C.textFaint, marginTop:3 }}>📊 promedio resurtido: {avg.toFixed(1)}h</div> : null
                    })()}
                  </div>
                  {/* Admin assign + resolve */}
                  <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-end' }}>
                    <select defaultValue={a.resolved_by||''}
                      onChange={e => {/* in full app, call updateResolver */}}
                      style={{ fontSize:11, borderRadius:6, border:`1px solid ${C.cardBorder}`, padding:'3px 6px', background:C.card, color:C.text }}>
                      <option value=''>🔧 Asignar...</option>
                      {ADMINS.map(adm => <option key={adm} value={adm}>{adm}</option>)}
                    </select>
                    <button onClick={() => onMarkOk(store.id, a.item)}
                      style={{ background:'rgba(52,211,153,0.12)', color:C.ok, border:`1px solid ${C.ok}`,
                        borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                      ✓ Surtido
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}

        {/* Surtir primero — ranking determinístico (severidad + antigüedad + qué tan rápido
            se agota históricamente), reemplaza el bloque de IA que llamaba a Anthropic sin
            llave desde el navegador y nunca funcionó. */}
        <div style={{ background:C.card, borderRadius:16, padding:'16px', border:`1.5px solid ${C.cardBorderHi}`, marginTop:16 }}>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontWeight:800, fontSize:16, color:C.text, fontFamily:FONT_DISPLAY }}>⬆️ Surtir primero</div>
            <div style={{ fontSize:12, color:C.textDim, marginTop:2 }}>Orden automático por urgencia, antigüedad y qué tan rápido se acaba</div>
          </div>

          {surtirPrimero.length === 0 ? (
            <div style={{ color:C.textFaint, fontSize:13, fontStyle:'italic', borderTop:`1px solid ${C.divider}`, paddingTop:12 }}>
              Nada pendiente por ahora — todo en verde.
            </div>
          ) : (
            <div style={{ borderTop:`1px solid ${C.divider}`, paddingTop:8 }}>
              {surtirPrimero.map((a, i) => (
                <div key={`${a.store_id}-${a.item}`} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
                  padding:'9px 0', borderBottom: i < surtirPrimero.length-1 ? `0.5px solid ${C.divider}` : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                    <span style={{ fontSize:12, color:C.textFaint, fontWeight:800, width:16 }}>{i+1}</span>
                    <span style={{ fontSize:13 }}>{a.status==='out'?'🔴':a.status==='urgent'?'🟠':'🟡'}</span>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.item}</div>
                      <div style={{ fontSize:11, color:C.textDim, marginTop:1 }}>{a.storeName} · ⏱ {fmtAge(a.reported_at)}</div>
                    </div>
                  </div>
                  <button onClick={() => onMarkOk(a.store_id, a.item)}
                    style={{ background:'rgba(52,211,153,0.12)', color:C.ok, border:`1px solid ${C.ok}`,
                      borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                    ✓ Surtido
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <StockPanel stockCounts={stockCounts || []} />

        {/* Distance quick ref */}
        <div style={{ background:C.card, borderRadius:14, padding:'14px 16px', border:`1px solid ${C.cardBorder}`, marginTop:14 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color:C.textDim, textTransform:'uppercase', letterSpacing:0.5 }}>📍 Distancias entre tiendas</div>
          {[
            ['SMR → Taba',   haversineKm(19.4481714,-99.1542853,19.4389001,-99.1558311)],
            ['SMR → Jardín', haversineKm(19.4481714,-99.1542853,19.4501148,-99.1610219)],
            ['Taba → Centro',haversineKm(19.4389001,-99.1558311,19.4351227,-99.1327956)],
            ['Jardín → Taba',haversineKm(19.4501148,-99.1610219,19.4389001,-99.1558311)],
            ['Centro → Studio',haversineKm(19.4351227,-99.1327956,19.3734283,-99.1607971)],
          ].map(([r,km],i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12,
              color:C.textDim, padding:'5px 0', borderBottom:`0.5px solid ${C.divider}` }}>
              <span>{r}</span>
              <span style={{ fontWeight:700, color:C.text }}>{km.toFixed(1)} km · ~{Math.round(km*1.4*3)}min</span>
            </div>
          ))}
        </div>

        {/* Consumption predictions */}
        {STORES.map(store => {
          const stats = consumoStats[store.id] || []
          if (!stats.length) return null
          const items = [...new Set(stats.map(s=>s.item))].slice(0,5)
          return (
            <div key={store.id} style={{ background:C.card, borderRadius:14, padding:'14px 16px', border:`1px solid ${C.cardBorder}`, marginTop:12 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:8, color:C.textDim, textTransform:'uppercase', letterSpacing:0.5 }}>📊 Datos históricos · {store.name}</div>
              {items.map(item => {
                const avg = avgResupplyHours(stats, item)
                return avg ? (
                  <div key={item} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0' }}>
                    <span style={{ color:C.text }}>{item}</span>
                    <span style={{ color:C.textDim, fontWeight:600 }}>se acaba en ~{avg.toFixed(0)}h</span>
                  </div>
                ) : null
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
