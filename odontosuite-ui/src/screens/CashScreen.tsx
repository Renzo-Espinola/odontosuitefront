import { useEffect, useMemo, useState } from "react"
import { RefreshCw } from "lucide-react"
import { fetchTodayMovements, fetchTodayCashSummary } from "../lib/api"
import type { MoneyMovementResponse, CashSummaryResponse } from "../lib/api"

function formatARS(n: number) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
}

export default function CashScreen() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>("—")
  const [items, setItems] = useState<MoneyMovementResponse[]>([])
  const [summary, setSummary] = useState<CashSummaryResponse | null>(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)

      const [m, s] = await Promise.all([fetchTodayMovements(), fetchTodayCashSummary()])
      setItems(m)
      setSummary(s)
      setLastUpdated(new Date().toLocaleString("es-AR"))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [items])

  const income = summary?.totalIncome ?? 0
  const expense = summary?.totalExpense ?? 0
  const net = summary?.netTotal ?? 0

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Caja</h1>
          <p className="text-sm text-gray-500">Movimientos de hoy</p>
          <p className="mt-1 text-xs text-gray-400">Última actualización: {loading ? "—" : lastUpdated}</p>
        </div>

        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 active:scale-[0.99]"
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">No pude traer los movimientos</div>
          <div className="mt-1 wrap-break-words">{error}</div>
          <button className="mt-3 rounded-xl bg-red-600 px-3 py-2 text-white active:scale-[0.99]" onClick={load}>
            Reintentar
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Resumen de hoy</h2>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Ingresos</p>
            <p className="mt-1 text-sm font-semibold text-green-700">$ {formatARS(income)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Egresos</p>
            <p className="mt-1 text-sm font-semibold text-red-700">$ {formatARS(expense)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Neto</p>
            <p className="mt-1 text-sm font-semibold text-(--clinic-blue)">$ {formatARS(net)}</p>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Listado</h2>
          <span className="text-xs text-gray-500">{loading ? "—" : `${sorted.length} mov.`}</span>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Cargando…</div>
          ) : sorted.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No hay movimientos cargados hoy</div>
          ) : (
            sorted.map((m) => {
              const isIncome = m.movementNature === "INCOME"
              const sign = isIncome ? "+" : "-"
              const amountColor = isIncome ? "text-green-700" : "text-red-700"

              return (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{m.description}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatTime(m.createdAt)}</p>
                  </div>
                  <div className={`ml-4 shrink-0 text-sm font-semibold ${amountColor}`}>
                    {sign}$ {formatARS(m.amount)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
