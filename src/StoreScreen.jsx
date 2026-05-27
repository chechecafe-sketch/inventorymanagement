import { useState, useEffect } from 'react'
import { CATEGORIES, STATUS_CFG, STATUS_ORDER, CRITICAL_ITEMS, ADMINS } from './constants'
import { fmtTime, fmtAge, getAgeColor } from './utils'

function getNext(s) { return STATUS_ORDER[(STATUS_ORDER.indexOf(s)+1) % STATUS_ORDER.length] }

export default function StoreScreen({ store, userName, isAdmin, alerts, onBack, onCycle, onMarkOk, onAddItem, customItems }) {
  const [activeCat, setActiveCat] = useState('cafeteria')
  const [newItemVal, setNewItemVal] = useState('')
  const [tick, setTick] = useState(0)

  // Tick every minute to refresh age timers
  useEffect(() => {
    const t = setInterval(() => setTick(x => x+1), 60000)
    return () => clearInterval(t)
  }, [])

  const catData = CATEGORIES[activeCat]
  const allItems = [...catData.items, ...(customItems[activeCat]||[])]

  // Build a quick lookup from alerts
  const alertMap = {}
  alerts.filter(a => a.store_id === store.id).forEach(a => { alertMap[a.item] = a })

  const getStatus = (item) => alertMap[item]?.status || 'ok'
  const getAlert  = (item) => alertMap[item] || null

  return (
    <div style={{ minHeight:'100vh', background:'#f7f5f0', paddingBottom:80 }}>
      {/* Header */}
      <div style={{ background:store.color, padding:'14px 16px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <button onClick={onBack}
            style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', fontSize:24, cursor:'pointer', padding:0 }}>‹</button>
          <div>
            <div style={{ fontFamily:"'DM Serif Display'", color:'#fff', fontSize:18 }}>{store.fullName}</div>
            <div style={{ color:'rgba(255,255,255,0.65)', fontSize:11 }}>
              {userName} · {new Date().toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'})}
              {isAdmin && <span style={{ background:'rgba(255,255,255,0.2)', borderRadius:4, padding:'1px 6px', marginLeft:6, fontSize:10 }}>ADMIN</span>}
            </div>
          </div>
        </div>
        {/* Category tabs */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' }}>
          {Object.entries(CATEGORIES).map(([key, cat]) => {
            const catAlerts = alerts.filter(a => a.store_id===store.id && a.category===key)
            return (
              <button key={key} onClick={() => setActiveCat(key)}
                style={{ background:activeCat===key?'#fff':'rgba(255,255,255,0.18)',
                  color:activeCat===key?store.color:'#fff',
                  border:'none', borderRadius:20, padding:'5px 11px', fontSize:11, fontWeight:500,
                  cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, position:'relative' }}>
                {cat.icon} {cat.label}
                {catAlerts.length > 0 && (
                  <span style={{ position:'absolute', top:-3, right:-3, background:'#c1121f',
                    color:'#fff', borderRadius:10, fontSize:9, padding:'1px 4px', fontWeight:700 }}>
                    {catAlerts.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding:'12px 14px' }}>
        <div style={{ fontSize:11, color:'#888', marginBottom:10 }}>Toca el botón para cambiar estado · {catData.label}</div>

        {allItems.map(item => {
          const st = getStatus(item)
          const alert = getAlert(item)
          const isCrit = CRITICAL_ITEMS.includes(item) || activeCat==='servicios'
          const sc = STATUS_CFG[st]

          return (
            <div key={item} style={{
              background:'#fff', borderRadius:10, padding:'11px 13px', marginBottom:7,
              border:`1.5px solid ${st==='ok'?'#e8e4dc':st==='low'?'#e9c46a':st==='urgent'?'#e76f51':'#c1121f'}`,
              display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10
            }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                  {isCrit && <span style={{ fontSize:9, background:'#fff0ee', color:'#c1121f', borderRadius:4, padding:'1px 5px', fontWeight:700, letterSpacing:0.3 }}>★ CRÍTICO</span>}
                  <span style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>{item}</span>
                </div>

                {alert && (
                  <div style={{ marginTop:4, display:'flex', flexWrap:'wrap', gap:8 }}>
                    {/* Who reported */}
                    <span style={{ fontSize:11, color:'#666' }}>
                      👤 {alert.reported_by}
                    </span>
                    {/* When reported */}
                    <span style={{ fontSize:11, color:'#666' }}>
                      🕐 {fmtTime(alert.reported_at)}
                    </span>
                    {/* Age timer with color coding */}
                    <span style={{ fontSize:11, fontWeight:600, color: getAgeColor(alert.reported_at) }}>
                      ⏱ {fmtAge(alert.reported_at)}
                    </span>
                    {/* Who's resolving */}
                    {alert.resolved_by && (
                      <span style={{ fontSize:11, color:'#4a7c59' }}>🔧 {alert.resolved_by}</span>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-end' }}>
                {/* Admin mark as resolved */}
                {isAdmin && st !== 'ok' && (
                  <button onClick={() => onMarkOk(store.id, item)}
                    style={{ background:'#e8f5e9', color:'#2d6a4f', border:'1px solid #b7dfc5',
                      borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                    ✓ Surtido
                  </button>
                )}
                <button onClick={() => onCycle(store.id, item, activeCat)}
                  style={{ background:sc.bg, color:sc.txt, border:'none', borderRadius:8,
                    padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer', minWidth:74, textAlign:'center' }}>
                  {sc.label}
                </button>
              </div>
            </div>
          )
        })}

        {/* Add custom item */}
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <input value={newItemVal} onChange={e => setNewItemVal(e.target.value)}
            placeholder="+ Agregar ítem..."
            style={{ flex:1, padding:'9px 12px', borderRadius:8, border:'1.5px solid #ddd', fontSize:13 }}
            onKeyDown={e => { if(e.key==='Enter' && newItemVal.trim()){ onAddItem(activeCat, newItemVal.trim()); setNewItemVal('') } }}
          />
          <button onClick={() => { if(newItemVal.trim()){ onAddItem(activeCat, newItemVal.trim()); setNewItemVal('') }}}
            style={{ background:store.color, color:'#fff', border:'none', borderRadius:8, padding:'9px 14px', fontSize:16, cursor:'pointer' }}>+</button>
        </div>
      </div>

      {/* Status legend */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'#fff',
        borderTop:'1px solid #e8e4dc', padding:'9px 16px', display:'flex', gap:14, justifyContent:'center' }}>
        {Object.entries(STATUS_CFG).map(([k,v]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:10, height:10, borderRadius:3, background:v.bg }} />
            <span style={{ fontSize:11, color:'#555' }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
