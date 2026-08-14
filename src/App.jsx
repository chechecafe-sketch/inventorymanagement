import { useState, useEffect, useCallback } from 'react'
import { STORES, CATEGORIES, CRITICAL_ITEMS } from './constants'
import { loadAllAlerts, upsertFaltante, loadConsumoStats, loadCustomItems, addCustomItem as dbAddCustomItem, subscribeAlerts, loadStockCountsSince } from './db'
import HomeScreen   from './HomeScreen'
import LoginScreen  from './LoginScreen'
import StoreScreen  from './StoreScreen'
import MasterScreen from './MasterScreen'
import { C } from './theme'

function enrichAlerts(raw) {
  return raw.map(a => ({
    ...a,
    isCritical: CRITICAL_ITEMS.includes(a.item) || a.category === 'servicios',
    storeName:  STORES.find(s => s.id === a.store_id)?.name || a.store_id,
  }))
}

// ── Ruteo simple por URL (para QR directo por tienda: /t/<storeId>) ─────────
// No usamos una librería de routing — la app es chica y solo necesitamos
// resolver la ruta inicial (y reflejarla al navegar) para que un QR pegado
// en la tienda abra directo la pantalla de login de esa sucursal.
function parseRoute() {
  const path = window.location.pathname
  const storeMatch = path.match(/^\/t\/([a-z]+)\/?$/)
  if (storeMatch) {
    const store = STORES.find(s => s.id === storeMatch[1])
    if (store) return { view: 'login', store }
  }
  if (/^\/admin\/?$/.test(path)) return { view: 'login-master', store: null }
  return { view: 'home', store: null }
}

export default function App() {
  const initialRoute = (() => parseRoute())()
  const [view,        setView]        = useState(initialRoute.view)  // home | login | login-master | store | master
  const [activeStore, setActiveStore] = useState(initialRoute.store)
  const [userName,    setUserName]    = useState('')
  const [isAdmin,     setIsAdmin]     = useState(false)
  // De dónde entramos a una tienda — así "‹ volver" regresa al lugar correcto
  // (Home si es empleado normal, Dashboard Master si el admin brincó desde ahí,
  // sin pedirle el PIN otra vez).
  const [enteredFrom, setEnteredFrom] = useState('home') // 'home' | 'master'
  const [alerts,      setAlerts]      = useState([])
  const [customItems, setCustomItems] = useState({})   // { [storeId]: { [cat]: [itemName] } }
  const [consumoStats,setConsumoStats]= useState({})   // { [storeId]: [...] }
  const [stockCounts, setStockCounts] = useState([])   // capturas de stock (leche/café/pan), últimos 7 días, todas las tiendas
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

  // Si entramos por un deep link (/t/smr), precargamos los ítems custom de esa tienda
  useEffect(() => {
    if (initialRoute.store) loadStoreCustomItems(initialRoute.store.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Soporte básico de back/forward del navegador
  useEffect(() => {
    const onPopState = () => {
      const r = parseRoute()
      setView(r.view)
      setActiveStore(r.store)
      if (r.store) loadStoreCustomItems(r.store.id)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [loadStoreCustomItems])

  // ── Load consumption stats for master ─────────────────────────────────────
  const loadAllConsumo = useCallback(async () => {
    const results = {}
    for (const store of STORES) {
      results[store.id] = await loadConsumoStats(store.id)
    }
    setConsumoStats(results)
  }, [])

  // ── Load stock history (leche/café/pan) for master — últimos 7 días ───────
  const loadStockHistory = useCallback(async () => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    const sinceDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const rows = await loadStockCountsSince(sinceDate)
    setStockCounts(rows)
  }, [])

  // ── Set item status directly (un toque = estado exacto, ya no cíclico) ────
  const handleSetStatus = useCallback(async (storeId, item, category, next) => {
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
  }, [userName])

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
  const goHome = () => {
    window.history.pushState({}, '', '/')
    setView('home'); setUserName(''); setIsAdmin(false); setActiveStore(null)
  }

  const selectStore = (store) => {
    window.history.pushState({}, '', `/t/${store.id}`)
    setActiveStore(store)
    setEnteredFrom('home')
    setView('login')
    loadStoreCustomItems(store.id)
  }

  const loginSuccess = (name, admin) => {
    setUserName(name)
    setIsAdmin(admin)
    setView('store')
  }

  const goMaster = () => {
    window.history.pushState({}, '', '/admin')
    setActiveStore(null)
    setView('login-master')
  }

  const masterLoginSuccess = (name, admin) => {
    if (!admin) { alert('Necesitas acceso admin'); return }
    setUserName(name)
    setIsAdmin(true)
    loadAllConsumo()
    loadStockHistory()
    setView('master')
  }

  // ── Admin: entrar/brincar directo a una tienda sin volver a Home ni pedir
  // login otra vez (ya está autenticado como admin desde /admin). Así puede
  // recorrer las 5 tiendas seguidas. ─────────────────────────────────────
  const enterStoreAsAdmin = (store) => {
    window.history.pushState({}, '', `/t/${store.id}`)
    setActiveStore(store)
    setEnteredFrom('master')
    setView('store')
    loadStoreCustomItems(store.id)
  }

  // Volver al Dashboard Master sin re-pedir PIN (ya autenticado en esta sesión).
  const backToMaster = () => {
    window.history.pushState({}, '', '/admin')
    setActiveStore(null)
    setView('master')
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <img src="/che-che-logo-white.png" alt="Che Che Café" style={{ height:34, opacity:0.5 }} />
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
      onBack={enteredFrom === 'master' ? backToMaster : goHome}
      onSetStatus={(storeId, item, cat, status) => handleSetStatus(storeId, item, cat, status)}
      onMarkOk={handleMarkOk}
      onAddItem={(cat, name) => handleAddItem(activeStore.id, cat, name)}
      customItems={customItems[activeStore.id] || {}}
      onSwitchStore={isAdmin ? enterStoreAsAdmin : undefined}
    />
  )

  if (view === 'master') return (
    <MasterScreen
      alerts={alerts}
      onBack={goHome}
      onMarkOk={handleMarkOk}
      consumoStats={consumoStats}
      stockCounts={stockCounts}
      onEnterStore={enterStoreAsAdmin}
    />
  )

  return null
}
