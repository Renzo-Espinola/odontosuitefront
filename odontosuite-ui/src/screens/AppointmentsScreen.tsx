import { useEffect, useState } from "react"
import { BottomSheet } from "../components/BottomSheet"
import {
  fetchTodayAppointments,
  type AppointmentResponse,
  updateAppointmentStatus,
} from "../lib/api"
import { Plus } from "lucide-react"
import { NewAppointmentSheet } from "../components/NewAppointmentSheet"

function fmtTimeLocal(localIso: string) {
  // "YYYY-MM-DDTHH:mm:ss"
  return localIso?.length >= 16 ? localIso.slice(11, 16) : localIso
}

function toLocalDateString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dayRange(dateStr: string) {
  // dateStr: "YYYY-MM-DD"
  const from = `${dateStr}T00:00:00`
  const to = `${dateStr}T23:59:59`
  return { from, to }
}

export default function AppointmentsScreen() {
  const [items, setItems] = useState<AppointmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateString(new Date()))
  const statusColor = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-indigo-100 text-indigo-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-orange-100 text-orange-700",
  }
  
  async function load() {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchTodayAppointments()
      setItems(data.sort((a, b) => a.startTime.localeCompare(b.startTime)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function setStatus(id: number, status: AppointmentResponse["status"]) {
    await updateAppointmentStatus(id, status)
    await load()
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Turnos</h1>
          <p className="text-sm text-gray-500">Hoy</p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-(--clinic-blue) px-4 py-3 text-sm font-semibold text-white active:scale-[0.99]"
        >
          <Plus size={16} />
          Nuevo
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            className="mt-3 rounded-xl bg-red-600 px-3 py-2 text-white active:scale-[0.99]"
            onClick={load}
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="grid gap-3">
        {loading && <div className="text-sm text-gray-500">Cargando…</div>}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
            <div className="text-sm text-gray-600">No hay turnos cargados</div>
            <div className="mt-1 text-xs text-gray-400">Creá uno con “Nuevo”</div>
          </div>
        )}

        {items.map((a) => {
          const locked = a.status === "CANCELLED" || a.status === "COMPLETED"

          return (
            <div key={a.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {fmtTimeLocal(a.startTime)} {a.endTime ? `– ${fmtTimeLocal(a.endTime)}` : ""}
              </div>
              <div className="mt-1 text-xs text-gray-500">Paciente #{a.patientId}</div>
              {a.reason && <div className="mt-2 text-sm text-gray-700">{a.reason}</div>}
            </div>

            <div className="flex flex-col items-end gap-2">
              {a.createdLate && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800">
                  Cargado tarde
                </span>
              )}

              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[a.status]}`}>
                {a.status}
              </span>
            </div>
          </div>
      
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={locked}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setStatus(a.id, "CONFIRMED")}
                >
                  Confirmar
                </button>
                <button
                  disabled={locked}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setStatus(a.id, "COMPLETED")}
                >
                  Completar
                </button>
                <button
                  disabled={locked}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setStatus(a.id, "NO_SHOW")}
                >
                  No vino
                </button>
                <button
                  disabled={locked}
                  className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setStatus(a.id, "CANCELLED")}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <BottomSheet open={open} title="Nuevo turno" onClose={() => setOpen(false)}>
        <NewAppointmentSheet
          onCreated={() => {
            setOpen(false)
            load()
          }}
        />
      </BottomSheet>
    </div>
  )
}
