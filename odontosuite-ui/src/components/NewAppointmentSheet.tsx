import { useEffect, useMemo, useState } from "react"
import { createAppointment, searchPatients } from "../lib/api"
import type { CreateAppointmentRequest, PatientResponse } from "../lib/api"

// input type="datetime-local" devuelve "YYYY-MM-DDTHH:mm"
function normalizeDateTimeLocal(v: string) {
  const t = v.trim()
  if (!t) return ""
  // datetime-local: YYYY-MM-DDTHH:mm
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t) && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(t)) {
    return "" // fuerza error amigable
  }
  return t.length === 16 ? `${t}:00` : t
}

function patientLabel(p: PatientResponse) {
  return `${p.lastName}, ${p.firstName} · DNI ${p.documentNumber} (#${p.id})`
}

function toDateTimeLocalMin(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

export function NewAppointmentSheet({ onCreated }: { onCreated: () => void }) {
  const [startTime, setStartTime] = useState("")
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const minStart = useMemo(() => {
  const d = new Date()
  d.setSeconds(0, 0)
  return toDateTimeLocalMin(d)}, [])

  // --- Autocomplete paciente
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<PatientResponse[]>([])
  const [selected, setSelected] = useState<PatientResponse | null>(null)

  // Debounce search
  useEffect(() => {
    if (selected) return // si ya elegiste, no busques
    const q = query.trim()

    if (q.length < 2) {
      setResults([])
      return
    }

    const t = setTimeout(async () => {
      try {
        setSearching(true)
        setError(null)
        const data = await searchPatients(q)
        setResults(data.filter((p) => p.active).slice(0, 20))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(t)
  }, [query, selected])

  const canSave = !saving && !!selected && !!normalizeDateTimeLocal(startTime)

  async function submit() {
  try {
    setSaving(true)
    setError(null)

    if (!selected) throw new Error("Seleccioná un paciente")

    const normalized = normalizeDateTimeLocal(startTime)
    if (!normalized) throw new Error("Seleccioná una fecha válida")

    const payload: CreateAppointmentRequest = {
      patientId: selected.id,
      startTime: normalized,
      reason: reason.trim() ? reason.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
    }

    await createAppointment(payload)
    onCreated()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    setError(msg.includes("HTTP 409") ? "Ya existe un turno en ese horario." : msg)
  } finally {
    setSaving(false)
  }
}

  return (
    <div className="grid gap-4">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Paciente */}
      {!selected ? (
        <div className="grid gap-2">
          <span className="text-xs font-semibold text-gray-600">Paciente</span>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por apellido, nombre o DNI…"
            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
          />

          {searching && <div className="text-xs text-gray-500">Buscando…</div>}

          {query.trim().length >= 2 && !searching && results.length === 0 && (
            <div className="text-xs text-gray-500">Sin resultados</div>
          )}

          {results.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-2xl border border-gray-200 bg-white">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelected(p)
                    setResults([])
                    setQuery("")
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
                >
                  <div className="font-semibold text-gray-900">
                    {p.lastName}, {p.firstName}
                  </div>
                  <div className="text-xs text-gray-500">
                    DNI {p.documentNumber} · #{p.id}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold text-gray-600">Paciente</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{patientLabel(selected)}</div>

          <button
            type="button"
            onClick={() => {
              setSelected(null)
              setQuery("")
              setResults([])
            }}
            className="mt-3 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
          >
            Cambiar
          </button>
        </div>
      )}

      {/* Inicio */}
      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Inicio</span>
        <input
          type="datetime-local"
          value={startTime}
          min={minStart}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        />
        <span className="text-xs text-gray-400">Duración: 30 min (por defecto)</span>
      </label>

      {!startTime && (
        <div className="text-xs text-gray-500">
            Seleccioná fecha y hora para habilitar “Crear turno”.
        </div>
      )}

      {/* Motivo */}
      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Motivo (opcional)</span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: Control / Limpieza"
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        />
      </label>

      {/* Notas */}
      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Notas (opcional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Ej: Llegar 10 min antes…"
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        />
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={!canSave}
        className="rounded-2xl bg-(--clinic-blue) px-4 py-4 text-sm font-semibold text-white shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? "Guardando…" : "Crear turno"}
      </button>
    </div>
  )
}
