import { useState, useEffect, useCallback } from 'react'
import { STORES, CATEGORIES, CRITICAL_ITEMS, STATUS_ORDER } from './constants'
import { loadAllAlerts, upsertFaltante, loadConsumoStats, loadCustomItems, addCustomItem as dbAddCustomItem, subscribeAlerts } from './db'
import HomeScreen   from './HomeScreen'
import LoginScreen  from './LoginScreen'
import StoreScreen  from './StoreScreen'
import MasterScreen from './MasterScreen'

function enrichAlerts(raw) {
  return raw.map(a => ({
    ...a,
    isCritical: CRITICAL_ITEMS.includes(a.item) || a.category === 'servicios',
    storeName:  STORES.find(s => s.id === a.store_id)?.name || a.store_id,
  }))
}

export default function App() {
  const [view,        setView]        = useState('home')  // home | login | store | master
  const [activeStore, setActiveStore] = useState(null)
  const [userName,    setUserName]    = useState('')
  const [isAdmin,     setIsAdmin]     = useState(false)
  const [alerts,      setAlerts]      = useState([])
  const [customItems, setCustomItems] = useState({})   // { [storeId]: { [cat]: [itemName] } }
  const [consumoStats,setConsumoStats]= useState({})   // { [storeId]: [...] }
  const [loading,     setLoading]     = useState(true)

  // ── Load alerts on mount + realtime ───────────────────────────────────────
  const refreshAlerts = useCallback(async () => {
    const raw = await loadAllAlerts()
    setAlerts(enrichAlerts(raw))
  }, [])

  useEffect(() => {
    refreshAlerts().finally(() => setLoading(false))
    const channel = subscribeAlerts(refreshAlerts)
    return () => channel?.unsubscribe?.()
  }, [refreshAlerts])

  // ── Load custom items when entering a store ───────────────────────────────
  const loadStoreCustomItems = useCallback(async (storeId) => {
    const rows = await loadCustomItems(storeId)
    const grouped = {}
    rows.forEach(r => {
      if (!grouped[r.category]) grouped[r.category] = []
      grouped[r.category].push(r.item_name)
    })
    setCustomItems(prev => ({ ...prev, [storeId]: grouped }))
  }, [])

  // ── Load consumption stats for master ─────────────────────────────────────
  const loadAllConsumo = useCallback(async () => {
    const results = {}
    for (const store of STORES) {
      results[store.id] = await loadConsumoStats(store.id)
    }
    setConsumoStats(results)
  }, [])

  // ── Cycle item status ─────────────────────────────────────────────────────
  const handleCycle = useCallback(async (storeId, item, category) => {
    const current = alerts.find(a => a.store_id === storeId && a.item === item)?.status || 'ok'
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(current)+1) % STATUS_ORDER.length]
    // Optimistic update
    setAlerts(prev => {
      const exists = prev.find(a => a.store_id===storeId && a.item===item)
      if (next === 'ok') return prev.filter(a => !(a.store_id===storeId && a.item===item))
      if (exists) return prev.map(a => a.store_id===storeId&&a.item===item ? {...a, status:next, reported_by:userName, reported_at:new Date().toISOString()} : a)
      return [...prev, { store_id:storeId, item, category, status:next, reported_by:userName, reported_at:new Date().toISOString(),
        isCritical:CRITICAL_ITEMS.includes(item)||category==='servicios',
        storeName: STORES.find(s=>s.id===storeId)?.name||storeId }]
    })
    await upsertFaltante({ storeId, category, item, status:next, reportedBy:userName })
  }, [alerts, userName])

  // ── Mark as restocked ─────────────────────────────────────────────────────
  const handleMarkOk = useCallback(async (storeId, item) => {
    setAlerts(prev => prev.filter(a => !(a.store_id===storeId && a.item===item)))
    const cat = Object.entries(CATEGORIES).find(([,c]) => c.items.includes(item))?.[0] || ''
    await upsertFaltante({ storeId, category:cat, item, status:'ok', reportedBy:userName, adminName:userName })
  }, [userName])

  // ── Add custom item ───────────────────────────────────────────────────────
  const handleAddItem = useCallback(async (storeId, category, itemName) => {
    setCustomItems(prev => ({
      ...prev,
      [storeId]: { ...prev[storeId], [category]: [...(prev[storeId]?.[category]||[]), itemName] }
    }))
    await dbAddCustomItem({ storeId, category, itemName, addedBy:userName })
  }, [userName])

  // ── Navigation ────────────────────────────────────────────────────────────
  const goHome = () => { setView('home'); setUserName(''); setIsAdmin(false); setActiveStore(null) }

  const selectStore = (store) => {
    setActiveStore(store)
    setView('login')
    loadStoreCustomItems(store.id)
  }

  const loginSuccess = (name, admin) => {
    setUserName(name)
    setIsAdmin(admin)
    setView('store')
  }

  const goMaster = () => {
    setActiveStore(null)
    setView('login-master')
  }

  const masterLoginSuccess = (name, admin) => {
    if (!admin) { alert('Necesitas acceso admin'); return }
    setUserName(name)
    setIsAdmin(true)
    loadAllConsumo()
    setView('master')
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#f7f5f0', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontFamily:"'DM Serif Display'", color:'#2d2d2a', fontSize:22, opacity:0.4 }}>Che Che Café</div>
      </div>
    )
  }

  if (view === 'home') return (
    <HomeScreen alerts={alerts} onSelectStore={selectStore} onMaster={goMaster} />
  )

  if (view === 'login') return (
    <LoginScreen store={activeStore} onLogin={loginSuccess} onAdmin={() => {}} />
  )

  if (view === 'login-master') return (
    <LoginScreen store={null} onLogin={masterLoginSuccess} />
  )

  if (view === 'store' && activeStore) return (
    <StoreScreen
      store={activeStore}
      userName={userName}
      isAdmin={isAdmin}
      alerts={alerts}
      onBack={goHome}
      onCycle={(storeId, item, cat) => handleCycle(storeId, item, cat)}
      onMarkOk={handleMarkOk}
      onAddItem={(cat, name) => handleAddItem(activeStore.id, cat, name)}
      customItems={customItems[activeStore.id] || {}}
    />
  )

  if (view === 'master') return (
    <MasterScreen
      alerts={alerts}
      onBack={goHome}
      onMarkOk={handleMarkOk}
      consumoStats={consumoStats}
    />
  )

  return null
}
