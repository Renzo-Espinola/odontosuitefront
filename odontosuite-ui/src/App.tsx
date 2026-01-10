import { useEffect, useState } from "react"
import { BottomNav } from "./components/BottomNav"
import { Layout } from "./components/Layout"
import { BottomSheet } from "./components/BottomSheet"
import { NewMovementSheet } from "./components/NewMovementSheet"

import HomeScreen from "./screens/HomeScreen"
import CashScreen from "./screens/CashScreen"
import AppointmentsScreen from "./screens/AppointmentsScreen"
import SettingsScreen from "./screens/SettingsScreen"

type Tab = "home" | "cash" | "new" | "appointments" | "settings"

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [newOpen, setNewOpen] = useState(false)

  useEffect(() => {
    if (activeTab === "new") {
      setNewOpen(true)
      setActiveTab("home")
    }
  }, [activeTab])

  return (
    <Layout>
      <main className="flex-1 p-6 pb-28">
        {activeTab === "home" && <HomeScreen />}
        {activeTab === "cash" && <CashScreen />}
        {activeTab === "appointments" && <AppointmentsScreen />}
        {activeTab === "settings" && <SettingsScreen />}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} newOpen={newOpen} />

      <BottomSheet open={newOpen} title="Nuevo movimiento" onClose={() => setNewOpen(false)}>
        <NewMovementSheet
          key={newOpen ? "open" : "closed"}
          onCreated={() => {
            setNewOpen(false)
          }}
        />
      </BottomSheet>
    </Layout>
  )
}
