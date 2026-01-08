import React from "react"
import { BottomNav } from "./BottomNav"

type Tab = "home" | "cash" | "new" | "appointments" | "settings"

export function Layout({ children }: { children: React.ReactNode }) {
  const [active, setActive] = React.useState<Tab>("cash")

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-(--clinic-blue)">OdontoSuite</h1>
          <span className="text-xs text-gray-500">Admin</span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-md px-4 py-4 pb-24">{children}</main>

      {/* Bottom nav */}
      <BottomNav active={active} onChange={setActive} />
    </div>
  )
}
