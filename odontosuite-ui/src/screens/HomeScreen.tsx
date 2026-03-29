import { useEffect, useMemo, useState } from "react"
import { fetchTodayCashSummary, type CashSummaryResponse } from "../lib/api"
import { ArrowDownRight, ArrowUpRight, Calendar, RefreshCw } from "lucide-react"

function formatARS(n: number) {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export default function HomeScreen({
  onNewMovement,
}: {
  onNewMovement: (nature: "INCOME" | "EXPENSE") => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<CashSummaryResponse | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>("—")

  async function load() {
    try {
      setLoading(true)
      setError(null)

      const s = await fetchTodayCashSummary()
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

  const todayBalance = useMemo(() => summary?.netTotal ?? 0, [summary])
  const todayIncome = useMemo(() => summary?.totalIncome ?? 0, [summary])
  const todayExpense = useMemo(() => summary?.totalExpense ?? 0, [summary])
  

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Inicio</h1>
        <p className="text-sm text-gray-500">Resumen rápido del día</p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">No pude traer datos del backend</div>
          <div className="mt-1 wrap-break-words">{error}</div>
          <button
            className="mt-3 rounded-xl bg-red-600 px-3 py-2 text-white active:scale-[0.99]"
            onClick={load}
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="grid gap-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Caja del día</p>

              <p className="mt-1 text-3xl font-bold text-(--clinic-blue)">
                {loading ? "Cargando…" : `$ ${formatARS(todayBalance)}`}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Última actualización: {loading ? "—" : lastUpdated}
              </p>
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

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button" onClick={() => onNewMovement("INCOME")}
              className="rounded-2xl bg-(--clinic-green) px-4 py-4 text-left text-white shadow-sm active:scale-[0.99]">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={18} />
                <span className="text-sm font-semibold">Ingreso</span>
              </div>
              <p className="mt-2 text-xs opacity-90">Nuevo movimiento</p>
            </button>

            <button
              type="button" onClick={() => onNewMovement("EXPENSE")}
              className="rounded-2xl bg-(--clinic-violet) px-4 py-4 text-left text-white shadow-sm active:scale-[0.99]">
              <div className="flex items-center gap-2">
                <ArrowDownRight size={18} />
                <span className="text-sm font-semibold">Egreso</span>
              </div>
              <p className="mt-2 text-xs opacity-90">Nuevo movimiento</p>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Resumen de hoy</h2>

          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Ingresos</span>
              <span className="text-sm font-semibold text-green-600">
                {loading ? "—" : `$ ${formatARS(todayIncome)}`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Egresos</span>
              <span className="text-sm font-semibold text-red-600">
                {loading ? "—" : `$ ${formatARS(todayExpense)}`}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Turnos de hoy</h2>

            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              <Calendar size={14} />
              0 hoy
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-dashed border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-600">No hay turnos cargados</p>
            <p className="mt-1 text-xs text-gray-400">Agregá un turno desde “Turnos”</p>
          </div>
        </section>
      </div>
    </div>
  )
}
