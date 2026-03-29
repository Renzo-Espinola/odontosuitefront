// App.tsx
import { useEffect, useState } from "react"
import { BottomNav, type Tab } from "./components/BottomNav"
import { Layout } from "./components/Layout"
import { BottomSheet } from "./components/BottomSheet"
import { NewMovementSheet } from "./components/NewMovementSheet"

import HomeScreen from "./screens/HomeScreen"
import CashScreen from "./screens/CashScreen"
import AppointmentsScreen from "./screens/AppointmentsScreen"
import SettingsScreen from "./screens/SettingsScreen"
import ClinicalScreen from "./screens/ClinicalScreen"
import LoginScreen from "./screens/LoginScreen"

import { clearToken, getToken } from "./lib/auth" // ✅ FALTABA getToken

type Nature = "INCOME" | "EXPENSE"

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [newOpen, setNewOpen] = useState(false)
  const [newNature, setNewNature] = useState<Nature>("INCOME")

  // ✅ auth gate
  const [authed, setAuthed] = useState(() => !!getToken())

  function openNewMovement(nature: Nature) {
    setNewNature(nature)
    setNewOpen(true)
  }

  function closeNewMovement() {
    setNewOpen(false)
  }

  // BottomNav: cuando tocan "new", abre en INCOME por default
  useEffect(() => {
    if (activeTab === "new") {
      openNewMovement("INCOME")
      setActiveTab("home")
    }
  }, [activeTab])

  // (opcional) si cambia el token en otra pestaña
  useEffect(() => {
    const onStorage = () => setAuthed(!!getToken())
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  function logout() {
    clearToken()
    setAuthed(false)
    setActiveTab("home")
    setNewOpen(false)
  }

  // ✅ si no está logueado, mostramos login “primero”
  if (!authed) {
    return (
      <LoginScreen
        onLoggedIn={() => {
          setAuthed(true)
          setActiveTab("home")
        }}
      />
    )
  }

  return (
    <Layout>
      <main className="flex-1 p-6 pb-28">
        {activeTab === "home" && <HomeScreen onNewMovement={openNewMovement} />}
        {activeTab === "cash" && <CashScreen />}
        {activeTab === "appointments" && <AppointmentsScreen />}
        {activeTab === "settings" && <SettingsScreen onLogout={logout} />}
        {activeTab === "clinical" && <ClinicalScreen />}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} newOpen={newOpen} />

      <BottomSheet open={newOpen} title="Nuevo movimiento" onClose={closeNewMovement}>
        <NewMovementSheet
          key={`${newOpen}-${newNature}`} // fuerza reset al cambiar tipo
          initialNature={newNature}
          onCreated={closeNewMovement}
        />
      </BottomSheet>
    </Layout>
  )
}
