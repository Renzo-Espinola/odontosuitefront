import { Calendar, Home, PlusCircle, Receipt, Settings } from "lucide-react"

type Tab = "home" | "cash" | "new" | "appointments" | "settings"

export function BottomNav({
  active,
  onChange,
}: {
  active: Tab
  onChange: (tab: Tab) => void
}) {
  const Item = ({
    id,
    label,
    children,
  }: {
    id: Tab
    label: string
    children: React.ReactNode
  }) => {
    const isActive = active === id
    return (
      <button
        type="button"
        onClick={() => onChange(id)}
        className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl
          ${isActive ? "bg-gray-100" : "hover:bg-gray-50"}`}
        aria-current={isActive ? "page" : undefined}
      >
        <div className={`${isActive ? "text-(--clinic-blue)" : "text-gray-600"}`}>
          {children}
        </div>
        <span className={`text-xs ${isActive ? "text-(--clinic-blue)" : "text-gray-600"}`}>
          {label}
        </span>
      </button>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-md px-3 py-2 flex items-center justify-between">
        <Item id="home" label="Inicio">
          <Home size={22} />
        </Item>

        <Item id="cash" label="Caja">
          <Receipt size={22} />
        </Item>

        <button
          type="button"
          onClick={() => onChange("new")}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl bg-(--clinic-green) text-white shadow-sm active:scale-[0.99]"
        >
          <PlusCircle size={22} />
          <span className="text-xs font-semibold">Nuevo</span>
        </button>

        <Item id="appointments" label="Turnos">
          <Calendar size={22} />
        </Item>

        <Item id="settings" label="Ajustes">
          <Settings size={22} />
        </Item>
      </div>
    </nav>
  )
}
