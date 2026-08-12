import { useState, useEffect, useMemo } from 'react'
import { STORES, ADMINS, CATEGORIES, CRITICAL_ITEMS } from './constants'
import { haversineKm, fmtAge, fmtTime, getAgeColor, avgResupplyHours, priorityScore } from './utils'

// Total de ítems que se trackean por tienda (mismo catálogo base para las 5) —
// se usa para que la barra de salud sea proporcional de verdad, en vez de
// saturarse con tiendas que acumulan muchas alertas.
const TOTAL_TRACKED_ITEMS = Object.values(CATEGORIES).reduce((s, c) => s + c.items.length, 0)

export default function MasterScreen({ alerts, onBack, onMarkOk, consumoStats }) {
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
    <div style={{ minHeight:'100vh', background:'#f7f5f0', paddingBottom:40 }}>
      <div style={{ background:'#2d2d2a', padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={onBack} style={{ background:'none', border:'none', color:'#888', fontSize:24, cursor:'pointer' }}>‹</button>
            <div>
              <div style={{ fontFamily:"'DM Serif Display'", color:'#e8e0d0', fontSize:20 }}>Dashboard Master</div>
              <div style={{ color:'#666', fontSize:11 }}>
                {new Date().toLocaleString('es-MX',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:14 }}>
        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          {[
            { lbl:'Críticas', val:critical.length, col:critical.length>0?'#c1121f':'#4a7c59', icon:'🔴' },
            { lbl:'Urgentes/Agotadas', val:urgent.length, col:urgent.length>0?'#e76f51':'#4a7c59', icon:'🟠' },
            { lbl:'Tiendas con issues', val:storesWithIssues, col:'#555', icon:'🏪' },
            { lbl:'Sin resolver >2h', val:urgent.filter(a=>(Date.now()-new Date(a.reported_at).getTime())>7200000).length, col:'#c1121f', icon:'⏰' },
          ].map((k,i) => (
            <div key={i} style={{ background:'#fff', borderRadius:10, padding:'12px 14px', border:'1px solid #e8e4dc' }}>
              <div style={{ fontSize:11, color:'#888' }}>{k.icon} {k.lbl}</div>
              <div style={{ fontSize:28, fontWeight:700, color:k.col }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Per-store */}
        <div style={{ fontWeight:600, fontSize:13, marginBottom:8, color:'#1a1a1a' }}>Estado por tienda</div>
        {STORES.map(store => {
          const sa = urgent.filter(a => a.store_id === store.id)
          const cr = sa.filter(a => a.isCritical).length
          // % de ítems trackeados que SÍ están bien (proporcional al catálogo real,
          // ya no se satura en 5% cuando una tienda acumula muchas alertas)
          const pct = Math.max(0, Math.round(100 - (sa.length / TOTAL_TRACKED_ITEMS) * 100))
          const barCol = pct < 55 ? '#c1121f' : pct < 80 ? '#e9c46a' : '#4a7c59'
          const oldest = sa.length ? Math.min(...sa.map(a=>new Date(a.reported_at).getTime())) : null
          const isExpanded = expandedStore === store.id

          return (
            <div key={store.id} style={{ background:'#fff', borderRadius:10, padding:'12px 14px', marginBottom:8, border:`1.5px solid ${cr>0?'#e76f51':'#e8e4dc'}` }}>
              <div onClick={() => setExpandedStore(isExpanded ? null : store.id)}
                style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:6, background:store.color,
                    display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:11 }}>
                    P{store.priority}
                  </div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{store.fullName}</div>
                    {oldest && <div style={{ fontSize:11, color:getAgeColor(oldest) }}>⏱ alerta más vieja: {fmtAge(oldest)}</div>}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {cr>0 && <span style={{ color:'#c1121f', fontWeight:700, fontSize:13 }}>🔴{cr}</span>}
                  <span style={{ fontSize:13, fontWeight:600, color:sa.length>0?'#e76f51':'#4a7c59' }}>{sa.length} alertas</span>
                  <span style={{ color:'#ccc', fontSize:18 }}>{isExpanded?'∧':'∨'}</span>
                </div>
              </div>

              <div style={{ height:5, background:'#f0ede8', borderRadius:3, overflow:'hidden', marginTop:8 }}>
                <div style={{ height:'100%', borderRadius:3, background:barCol, width:`${pct}%`, transition:'width 0.4s' }} />
              </div>

              {isExpanded && sa.map((a,i) => (
                <div key={i} style={{ marginTop:8, padding:'8px 10px', background:'#fafafa', borderRadius:7,
                  border:`1px solid ${a.status==='out'?'#f7c1c1':'#fce8d8'}`,
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600 }}>{a.status==='out'?'🔴':'🟠'} {a.item}</div>
                    <div style={{ fontSize:10, color:'#888', marginTop:2 }}>
                      👤 {a.reported_by} · ⏱ <span style={{ color:getAgeColor(a.reported_at), fontWeight:600 }}>{fmtAge(a.reported_at)}</span>
                      {a.resolved_by && <span style={{ color:'#4a7c59', marginLeft:6 }}>🔧 {a.resolved_by}</span>}
                    </div>
                    {/* Avg resupply prediction */}
                    {(() => {
                      const avg = avgResupplyHours(consumoStats[store.id]||[], a.item)
                      return avg ? <div style={{ fontSize:10, color:'#7c5c4a', marginTop:2 }}>📊 promedio resurtido: {avg.toFixed(1)}h</div> : null
                    })()}
                  </div>
                  {/* Admin assign + resolve */}
                  <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
                    <select defaultValue={a.resolved_by||''}
                      onChange={e => {/* in full app, call updateResolver */}}
                      style={{ fontSize:11, borderRadius:5, border:'1px solid #ddd', padding:'2px 5px', background:'#fff' }}>
                      <option value=''>🔧 Asignar...</option>
                      {ADMINS.map(adm => <option key={adm} value={adm}>{adm}</option>)}
                    </select>
                    <button onClick={() => onMarkOk(store.id, a.item)}
                      style={{ background:'#e8f5e9', color:'#2d6a4f', border:'1px solid #b7dfc5',
                        borderRadius:5, padding:'3px 9px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
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
        <div style={{ background:'#fff', borderRadius:12, padding:'14px', border:'1.5px solid #ddd', marginTop:14 }}>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontWeight:600, fontSize:14 }}>⬆️ Surtir primero</div>
            <div style={{ fontSize:11, color:'#888' }}>Orden automático por urgencia, antigüedad y qué tan rápido se acaba</div>
          </div>

          {surtirPrimero.length === 0 ? (
            <div style={{ color:'#bbb', fontSize:12, fontStyle:'italic', borderTop:'1px solid #f0ede8', paddingTop:10 }}>
              Nada pendiente por ahora — todo en verde.
            </div>
          ) : (
            <div style={{ borderTop:'1px solid #f0ede8', paddingTop:6 }}>
              {surtirPrimero.map((a, i) => (
                <div key={`${a.store_id}-${a.item}`} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
                  padding:'7px 0', borderBottom: i < surtirPrimero.length-1 ? '0.5px solid #f5f3ef' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                    <span style={{ fontSize:11, color:'#bbb', fontWeight:700, width:14 }}>{i+1}</span>
                    <span style={{ fontSize:12 }}>{a.status==='out'?'🔴':a.status==='urgent'?'🟠':'🟡'}</span>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.item}</div>
                      <div style={{ fontSize:10, color:'#888' }}>{a.storeName} · ⏱ {fmtAge(a.reported_at)}</div>
                    </div>
                  </div>
                  <button onClick={() => onMarkOk(a.store_id, a.item)}
                    style={{ background:'#e8f5e9', color:'#2d6a4f', border:'1px solid #b7dfc5',
                      borderRadius:5, padding:'3px 9px', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                    ✓ Surtido
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distance quick ref */}
        <div style={{ background:'#fff', borderRadius:10, padding:'12px 14px', border:'1px solid #e8e4dc', marginTop:12 }}>
          <div style={{ fontWeight:600, fontSize:12, marginBottom:8, color:'#555' }}>📍 Distancias entre tiendas</div>
          {[
            ['SMR → Taba',   haversineKm(19.4481714,-99.1542853,19.4389001,-99.1558311)],
            ['SMR → Jardín', haversineKm(19.4481714,-99.1542853,19.4501148,-99.1610219)],
            ['Taba → Centro',haversineKm(19.4389001,-99.1558311,19.4351227,-99.1327956)],
            ['Jardín → Taba',haversineKm(19.4501148,-99.1610219,19.4389001,-99.1558311)],
            ['Centro → Studio',haversineKm(19.4351227,-99.1327956,19.3734283,-99.1607971)],
          ].map(([r,km],i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:11,
              color:'#555', padding:'3px 0', borderBottom:'0.5px solid #f0ede8' }}>
              <span>{r}</span>
              <span style={{ fontWeight:600, color:'#2d2d2a' }}>{km.toFixed(1)} km · ~{Math.round(km*1.4*3)}min</span>
            </div>
          ))}
        </div>

        {/* Consumption predictions */}
        {STORES.map(store => {
          const stats = consumoStats[store.id] || []
          if (!stats.length) return null
          const items = [...new Set(stats.map(s=>s.item))].slice(0,5)
          return (
            <div key={store.id} style={{ background:'#fff', borderRadius:10, padding:'12px 14px', border:'1px solid #e8e4dc', marginTop:10 }}>
              <div style={{ fontWeight:600, fontSize:12, marginBottom:6, color:'#555' }}>📊 Datos históricos · {store.name}</div>
              {items.map(item => {
                const avg = avgResupplyHours(stats, item)
                return avg ? (
                  <div key={item} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'2px 0' }}>
                    <span style={{ color:'#333' }}>{item}</span>
                    <span style={{ color:'#7c5c4a', fontWeight:600 }}>se acaba en ~{avg.toFixed(0)}h</span>
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
