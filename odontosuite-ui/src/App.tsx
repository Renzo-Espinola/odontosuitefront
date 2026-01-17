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

type Nature = "INCOME" | "EXPENSE"

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [newOpen, setNewOpen] = useState(false)
  const [newNature, setNewNature] = useState<Nature>("INCOME")

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

  return (
    <Layout>
      <main className="flex-1 p-6 pb-28">
        {activeTab === "home" && <HomeScreen onNewMovement={openNewMovement} />}
        {activeTab === "cash" && <CashScreen />}
        {activeTab === "appointments" && <AppointmentsScreen />}
        {activeTab === "settings" && <SettingsScreen />}
        {activeTab === "clinical" && <ClinicalScreen />}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} newOpen={newOpen} />

      <BottomSheet open={newOpen} title="Nuevo movimiento" onClose={closeNewMovement}>
        <NewMovementSheet
          key={`${newOpen}-${newNature}`}   // fuerza reset al cambiar tipo
          initialNature={newNature}
          onCreated={closeNewMovement}
        />
      </BottomSheet>
    </Layout>
  )
}
