import { useEffect, useMemo, useState } from "react"
import { BottomSheet } from "../components/BottomSheet"
import { NewAppointmentSheet } from "../components/NewAppointmentSheet"
import {
  fetchAppointments,
  updateAppointmentStatus,
  type AppointmentResponse,
} from "../lib/api"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { DayTooltip } from "../components/Tooltip"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function monthRange(d: Date) {
  const from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01T00:00:00`
  const last = endOfMonth(d).getDate()
  const to = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(last)}T23:59:59`
  return { from, to }
}

// backend LocalDateTime sin TZ
function fmtTimeLocal(localIso: string) {
  return localIso?.length >= 16 ? localIso.slice(11, 16) : localIso
}

function monthTitle(d: Date) {
  const m = d.toLocaleString("es-AR", { month: "long" })
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}`
}

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"]

type DaySummary = {
  count: number
  completed: number
  pending: number
  cancelled: number
  late: number
}

export default function AppointmentsScreen() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMonth, setLoadingMonth] = useState(false)

  const [monthCursor, setMonthCursor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => toYMD(new Date()))
  const [monthItems, setMonthItems] = useState<AppointmentResponse[]>([])

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentResponse[]>()
    for (const a of monthItems) {
      const ymd = a.startTime.slice(0, 10)
      const arr = map.get(ymd) ?? []
      arr.push(a)
      map.set(ymd, arr)
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
      map.set(k, arr)
    }
    return map
  }, [monthItems])

  const daySummary = useMemo(() => {
    const map = new Map<string, DaySummary>()

    for (const a of monthItems) {
      const ymd = a.startTime.slice(0, 10)
      const s: DaySummary = map.get(ymd) ?? {
        count: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        late: 0,
      }

      s.count += 1
      if (a.status === "COMPLETED") s.completed += 1
      if (a.status === "SCHEDULED" || a.status === "CONFIRMED") s.pending += 1
      if (a.status === "CANCELLED") s.cancelled += 1
      if ((a as any).createdLate) s.late += 1

      map.set(ymd, s)
    }

    return map
  }, [monthItems])

  const selectedItems = byDay.get(selectedDay) ?? []

  useEffect(() => {
    async function loadMonth() {
      try {
        setLoadingMonth(true)
        setError(null)

        const { from, to } = monthRange(monthCursor)
        const data = await fetchAppointments(from, to)

        data.sort((a, b) => a.startTime.localeCompare(b.startTime))
        setMonthItems(data)

        const y = monthCursor.getFullYear()
        const m = monthCursor.getMonth() + 1
        if (!selectedDay.startsWith(`${y}-${pad(m)}`)) {
          setSelectedDay(`${y}-${pad(m)}-01`)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoadingMonth(false)
      }
    }

    loadMonth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthCursor])

  async function setStatus(id: number, status: AppointmentResponse["status"]) {
    try {
      setError(null)
      await updateAppointmentStatus(id, status)

      const { from, to } = monthRange(monthCursor)
      const data = await fetchAppointments(from, to)
      data.sort((a, b) => a.startTime.localeCompare(b.startTime))
      setMonthItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function goPrevMonth() {
    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  function goNextMonth() {
    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const calendarCells = useMemo(() => {
    const first = startOfMonth(monthCursor)
    const last = endOfMonth(monthCursor)

    const firstDow = (first.getDay() + 6) % 7 // lunes=0
    const daysInMonth = last.getDate()
    const cells: { date: Date; inMonth: boolean; ymd: string }[] = []

    for (let i = 0; i < firstDow; i++) {
      const d = new Date(first)
      d.setDate(first.getDate() - (firstDow - i))
      cells.push({ date: d, inMonth: false, ymd: toYMD(d) })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(first.getFullYear(), first.getMonth(), day)
      cells.push({ date: d, inMonth: true, ymd: toYMD(d) })
    }

    while (cells.length % 7 !== 0) {
      const prev = cells[cells.length - 1].date
      const d = new Date(prev)
      d.setDate(prev.getDate() + 1)
      cells.push({ date: d, inMonth: false, ymd: toYMD(d) })
    }

    return cells
  }, [monthCursor])

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Turnos</h1>
          <p className="text-sm text-gray-500">Calendario</p>
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
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goPrevMonth}
            className="rounded-xl p-2 hover:bg-gray-50"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-sm font-semibold text-gray-900">{monthTitle(monthCursor)}</div>

          <button
            type="button"
            onClick={goNextMonth}
            className="rounded-xl p-2 hover:bg-gray-50"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2 text-center">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-xs font-semibold text-gray-500">
              {d}
            </div>
          ))}

          {calendarCells.map((c, idx) => {
            const col = idx % 7
            const isRightSide = col >= 4

            const summary = daySummary.get(c.ymd)
            const count = summary?.count ?? 0
            const isSelected = c.ymd === selectedDay

            const badgeColor =
              summary && summary.pending > 0
                ? "bg-blue-600 text-white"
                : summary && summary.late > 0
                ? "bg-amber-500 text-white"
                : summary && summary.cancelled > 0
                ? "bg-red-500 text-white"
                : summary && summary.count > 0 && summary.completed === summary.count
                ? "bg-green-600 text-white"
                : "bg-(--clinic-blue) text-white"

            return (
              <button
                key={c.ymd}
                type="button"
                onClick={() => setSelectedDay(c.ymd)}
                className={[
                  "relative rounded-xl px-0 py-2 text-sm",
                  c.inMonth ? "text-gray-900" : "text-gray-400",
                  isSelected ? "bg-(--clinic-blue) text-white" : "hover:bg-gray-50",
                ].join(" ")}
                aria-current={isSelected ? "date" : undefined}
              >
                <div className="leading-none">{c.date.getDate()}</div>

                {count > 0 && summary && (
                  <div className="group absolute -top-1 -right-1">
                    <span
                      className={[
                        "rounded-full text-[10px] font-semibold px-1.5 py-0.5",
                        isSelected ? "bg-white/90 text-(--clinic-blue)" : badgeColor,
                      ].join(" ")}
                    >
                      {count > 9 ? "9+" : count}
                    </span>

                    {/* Tooltip (arriba del badge) */}
                    <div
                      className={[
                        "pointer-events-none absolute bottom-full mb-2 z-50",
                        "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                        isRightSide ? "right-0" : "left-0",
                      ].join(" ")}
                    >
                      <DayTooltip summary={summary} align={isRightSide ? "right" : "left"} />
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-600" /> Pendientes
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-600" /> Completados
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Cancelados
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Cargado tarde
          </span>
        </div>

        {loadingMonth && <div className="mt-3 text-xs text-gray-500">Cargando turnos del mes…</div>}
      </section>

      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">
            Turnos del {selectedDay.split("-").reverse().join("/")}
          </div>
          <div className="text-xs text-gray-500">{selectedItems.length} turno(s)</div>
        </div>

        {selectedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
            <div className="text-sm text-gray-600">No hay turnos ese día</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {selectedItems.map((a) => {
              const locked = a.status === "CANCELLED" || a.status === "COMPLETED"

              return (
                <div key={a.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {fmtTimeLocal(a.startTime)}{" "}
                        {a.endTime ? `– ${fmtTimeLocal(a.endTime)}` : ""}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">Paciente #{a.patientId}</div>
                      {a.reason && <div className="mt-2 text-sm text-gray-700">{a.reason}</div>}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {(a as any).createdLate && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800">
                          Cargado tarde
                        </span>
                      )}
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
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
        )}
      </section>

      <BottomSheet open={open} title="Nuevo turno" onClose={() => setOpen(false)}>
        <NewAppointmentSheet
          onCreated={() => {
            setOpen(false)
            ;(async () => {
              const { from, to } = monthRange(monthCursor)
              const data = await fetchAppointments(from, to)
              data.sort((a, b) => a.startTime.localeCompare(b.startTime))
              setMonthItems(data)
            })()
          }}
        />
      </BottomSheet>
    </div>
  )
}
