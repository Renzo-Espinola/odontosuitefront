import { useState } from "react"
import { BottomNav } from "./components/BottomNav"
import { Layout } from "./components/Layout"

import HomeScreen from "./screens/HomeScreen"
import CashScreen from "./screens/CashScreen"
import AppointmentsScreen from "./screens/AppointmentsScreen"
import SettingsScreen from "./screens/SettingsScreen"

type Tab = "home" | "cash" | "new" | "appointments" | "settings"

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home")

  return (
    <Layout>
      <main className="flex-1 p-4 pb-32">
        {activeTab === "home" && <HomeScreen />}
        {activeTab === "cash" && <CashScreen />}
        {activeTab === "appointments" && <AppointmentsScreen />}
        {activeTab === "settings" && <SettingsScreen />}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </Layout>
  )
}
