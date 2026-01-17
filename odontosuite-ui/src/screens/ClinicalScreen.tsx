// ClinicalScreen.tsx
import { useEffect, useMemo, useState } from "react"
import {
  fetchOdontogram,
  upsertOdontogramItem,
  searchPatients,
  type OdontogramResponse,
  type ToothSurface,
  type OdontogramStatus,
  type PatientResponse,
  type CreatePatientRequest,
} from "../lib/api"
import { BottomSheet } from "../components/BottomSheet"
import { NewPatientSheet } from "../components/NewPatientSheet"
import { RefreshCw } from "lucide-react"

type HttpError = { status: number; message: string; raw?: string }

const SURFACES: ToothSurface[] = ["GENERAL", "O", "M", "D", "B", "L"]
const LETTER_SURFACES: ToothSurface[] = ["O", "M", "D", "B", "L"]

const STATUSES: { value: OdontogramStatus; label: string }[] = [
  { value: "HEALTHY", label: "Sano" },
  { value: "CARIES", label: "Caries" },
  { value: "FILLING", label: "Restauración" },
  { value: "CROWN", label: "Corona" },
  { value: "ENDODONTIC", label: "Endodoncia" },
  { value: "IMPLANT", label: "Implante" },
  { value: "MISSING", label: "Ausente" },
  { value: "EXTRACTED", label: "Extraído" },
]

const STATUS_WEIGHT: Record<OdontogramStatus, number> = {
  HEALTHY: 0,
  CROWN: 1,
  FILLING: 2,
  ENDODONTIC: 3,
  CARIES: 4,
  IMPLANT: 5,
  MISSING: 6,
  EXTRACTED: 7,
}

const SURFACE_ORDER: Record<ToothSurface, number> = {
  GENERAL: 0,
  O: 1,
  M: 2,
  D: 3,
  B: 4,
  L: 5,
}

function statusLabel(s: OdontogramStatus) {
  return STATUSES.find((x) => x.value === s)?.label ?? s
}

function surfaceLabel(s: ToothSurface) {
  return s === "GENERAL" ? "General" : s
}

function keyOf(toothCode: string, surface: ToothSurface) {
  return `${toothCode}:${surface}`
}

function patientLabel(p: PatientResponse) {
  return `${p.lastName}, ${p.firstName} · DNI ${p.documentNumber} (#${p.id})`
}

function guessInitialPatientFromQuery(q: string): Partial<CreatePatientRequest> {
  const t = q.trim()
  if (!t) return {}
  if (/^\d+$/.test(t)) return { documentNumber: t }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return { lastName: parts[0], firstName: parts.slice(1).join(" ") }
  return { lastName: t }
}

// ✅ Badge tipo "M+D" (máx 3 letras, si hay más: "M+D+B+")
function surfacesBadgeFor(idx: Map<string, any>, toothCode: string) {
  const present = LETTER_SURFACES.filter((s) => idx.has(keyOf(toothCode, s)))
  if (present.length === 0) return null
  const shown = present.slice(0, 3).join("+")
  return present.length > 3 ? `${shown}+` : shown
}

// ✅ Color global del diente: GENERAL manda si existe; sino “peor” entre superficies
function displayStatusForTooth(
  idx: Map<string, { id: number; status: OdontogramStatus; note: string | null }>,
  toothCode: string
): OdontogramStatus {
  const general = idx.get(keyOf(toothCode, "GENERAL"))
  if (general?.status) return general.status

  let best: OdontogramStatus = "HEALTHY"
  let bestW = STATUS_WEIGHT[best]

  for (const s of LETTER_SURFACES) {
    const it = idx.get(keyOf(toothCode, s))
    if (!it?.status) continue
    const w = STATUS_WEIGHT[it.status] ?? 0
    if (w > bestW) {
      best = it.status
      bestW = w
    }
  }
  return best
}

export default function ClinicalScreen() {
  const [patientId, setPatientId] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<HttpError | null>(null)
  const [data, setData] = useState<OdontogramResponse | null>(null)

  // editor odontograma
  const [open, setOpen] = useState(false)
  const [selTooth, setSelTooth] = useState("")
  const [surface, setSurface] = useState<ToothSurface>("GENERAL")
  const [status, setStatus] = useState<OdontogramStatus>("HEALTHY")
  const [note, setNote] = useState("")

  // buscador paciente
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<PatientResponse[]>([])
  const [selected, setSelected] = useState<PatientResponse | null>(null)

  // alta paciente
  const [openNewPatient, setOpenNewPatient] = useState(false)
  const initialPatient = useMemo(() => guessInitialPatientFromQuery(query), [query])

  // para evitar que el sync de surface pise status/nota cuando forzamos GENERAL o precargamos en openEditor
  const [skipSyncOnce, setSkipSyncOnce] = useState(false)

  function requiresGeneral(s: OdontogramStatus) {
    return s === "IMPLANT" || s === "EXTRACTED" || s === "MISSING"
  }

  function selectPatient(p: PatientResponse) {
    setSelected(p)
    setQuery("")
    setResults([])
    setError(null)
    setPatientId(p.id)
  }

  async function load() {
    if (!patientId) return
    try {
      setLoading(true)
      setError(null)
      const d = await fetchOdontogram(patientId)
      setData(d)
    } catch (e) {
      if (e instanceof Error) {
        const m = e.message
        const match = m.match(/^HTTP\s+(\d+):\s*(.*)$/s)
        if (match) {
          const status = Number(match[1])
          const raw = match[2]
          let msg = raw
          try {
            const parsed = JSON.parse(raw)
            msg = typeof parsed?.message === "string" ? parsed.message : raw
          } catch {}
          setError({ status, message: msg, raw })
        } else {
          setError({ status: 0, message: m })
        }
      } else {
        setError({ status: 0, message: String(e) })
      }
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  // cargar odontograma cuando se selecciona paciente
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  // debounce buscador
  useEffect(() => {
    if (selected) return

    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }

    const t = setTimeout(async () => {
      try {
        setSearching(true)
        const data = await searchPatients(q)
        setResults(data.filter((p) => p.active).slice(0, 20))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(t)
  }, [query, selected])

  // index odontograma
  const index = useMemo(() => {
    const m = new Map<string, { id: number; status: OdontogramStatus; note: string | null }>()
    for (const it of data?.items ?? []) {
      m.set(keyOf(it.toothCode, it.surface), { id: it.id, status: it.status, note: it.note })
    }
    return m
  }, [data])

  // badge del modal
  const modalBadge = useMemo(() => {
    if (!selTooth) return null
    return surfacesBadgeFor(index, selTooth)
  }, [index, selTooth])

  // sync del modal: cuando cambia (pieza/superficie) cargamos lo existente
  useEffect(() => {
    if (!open || !selTooth) return

    if (skipSyncOnce) {
      setSkipSyncOnce(false)
      return
    }

    const existing = index.get(keyOf(selTooth, surface))
    setStatus(existing?.status ?? "HEALTHY")
    setNote(existing?.note ?? "")
  }, [open, selTooth, surface, index, skipSyncOnce])

  // si el user elige un estado que exige GENERAL, forzamos surface sin perder status/nota
  useEffect(() => {
    if (!open) return
    if (requiresGeneral(status) && surface !== "GENERAL") {
      setSkipSyncOnce(true)
      setSurface("GENERAL")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, open])

  // abrir modal (opcionalmente en una superficie concreta, usado por Hallazgos)
  function openEditor(toothCode: string, surf?: ToothSurface) {
    setError(null)
    setSelTooth(toothCode)

    let chosen: ToothSurface

    if (surf) {
      chosen = surf
    } else {
      const hasGeneral = index.has(keyOf(toothCode, "GENERAL"))
      chosen = "GENERAL"
      if (!hasGeneral) {
        const found = LETTER_SURFACES.find((s) => index.has(keyOf(toothCode, s)))
        if (found) chosen = found
      }
    }

    setSurface(chosen)

    const existing = index.get(keyOf(toothCode, chosen))
    setStatus(existing?.status ?? "HEALTHY")
    setNote(existing?.note ?? "")

    setSkipSyncOnce(true)
    setOpen(true)
  }

  const surfaceLocked = requiresGeneral(status)

  // ✅ Guardado optimista: setData(res) y listo (sin load() que pisa)
  async function save() {
    if (!patientId) return

    if (requiresGeneral(status) && surface !== "GENERAL") {
      setError({ status: 400, message: "Para este estado la superficie debe ser General." })
      return
    }

    try {
      setError(null)
      const res = await upsertOdontogramItem(patientId, {
        toothCode: selTooth,
        surface,
        status,
        note: note.trim() ? note.trim() : null,
        createClinicalNote: false,
      })
      setData(res)
      setOpen(false)
    } catch (e) {
      setError({ status: 0, message: e instanceof Error ? e.message : String(e) })
    }
  }

  // --------- render grid FDI (adulto) ----------
  const upper = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"]
  const lower = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"]

  function toothPill(toothCode: string) {
    const badge = surfacesBadgeFor(index, toothCode)
    const s = displayStatusForTooth(index, toothCode)

    const cls =
      s === "HEALTHY" ? "bg-gray-100 text-gray-700"
      : s === "CARIES" ? "bg-red-100 text-red-700"
      : s === "FILLING" ? "bg-amber-100 text-amber-800"
      : s === "CROWN" ? "bg-indigo-100 text-indigo-700"
      : s === "ENDODONTIC" ? "bg-purple-100 text-purple-700"
      : s === "IMPLANT" ? "bg-emerald-100 text-emerald-700"
      : s === "MISSING" ? "bg-gray-200 text-gray-700"
      : "bg-gray-200 text-gray-700" // EXTRACTED

    return (
      <button
        key={toothCode}
        type="button"
        onClick={() => openEditor(toothCode)}
        className={`relative rounded-xl px-2 py-2 text-xs font-semibold border border-gray-200 hover:bg-gray-50 ${cls}`}
        title={`${toothCode} · ${statusLabel(s)}${badge ? ` · ${badge}` : ""}`}
      >
        {toothCode}

        {badge && (
          <span className="absolute -top-1 -right-1 rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {badge}
          </span>
        )}
      </button>
    )
  }

  // --------- Hallazgos ----------
  type Finding = {
    toothCode: string
    surface: ToothSurface
    status: OdontogramStatus
    note: string | null
    key: string
  }

  const findings = useMemo<Finding[]>(() => {
    const arr: Finding[] = []
    for (const it of data?.items ?? []) {
      arr.push({
        toothCode: it.toothCode,
        surface: it.surface,
        status: it.status,
        note: it.note ?? null,
        key: keyOf(it.toothCode, it.surface),
      })
    }

    arr.sort((a, b) => {
      const ta = Number(a.toothCode)
      const tb = Number(b.toothCode)
      if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb
      if (a.toothCode !== b.toothCode) return a.toothCode.localeCompare(b.toothCode)

      const so = (SURFACE_ORDER[a.surface] ?? 99) - (SURFACE_ORDER[b.surface] ?? 99)
      if (so !== 0) return so

      return (STATUS_WEIGHT[b.status] ?? 0) - (STATUS_WEIGHT[a.status] ?? 0)
    })

    return arr
  }, [data])

    const findingsByTooth = useMemo(() => {
        const map = new Map<string, Finding[]>()
        for (const f of findings) {
            const arr = map.get(f.toothCode) ?? []
            arr.push(f)
            map.set(f.toothCode, arr)
        }
        return map
    }, [findings])


  function statusChipClass(s: OdontogramStatus) {
  return s === "CARIES" ? "bg-red-100 text-red-700"
    : s === "FILLING" ? "bg-amber-100 text-amber-800"
    : s === "IMPLANT" ? "bg-emerald-100 text-emerald-700"
    : s === "EXTRACTED" ? "bg-gray-200 text-gray-700"
    : "bg-gray-100 text-gray-700"
  }

  const showNotFound = !!patientId && !loading && error?.status === 404

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 w-full">
          <h1 className="text-xl font-semibold text-gray-900">Clínica</h1>
          <p className="text-sm text-gray-500">Odontograma (MVP)</p>

          {/* Paciente seleccionado */}
          {selected ? (
            <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-semibold text-gray-600">Paciente</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{patientLabel(selected)}</div>

              <button
                type="button"
                onClick={() => {
                  setSelected(null)
                  setPatientId(null)
                  setData(null)
                  setError(null)
                  setQuery("")
                  setResults([])
                }}
                className="mt-3 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              <span className="text-xs font-semibold text-gray-600">Buscar paciente</span>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por apellido, nombre o DNI…"
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
              />

              {searching && <div className="text-xs text-gray-500">Buscando…</div>}

              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 p-3">
                  <div className="text-xs text-gray-600">Sin resultados.</div>
                  <button
                    type="button"
                    onClick={() => setOpenNewPatient(true)}
                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 active:scale-[0.99]"
                  >
                    Crear paciente
                  </button>
                </div>
              )}

              {results.length > 0 && (
                <div className="max-h-56 overflow-auto rounded-2xl border border-gray-200 bg-white">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPatient(p)}
                      className="w-full border-b border-gray-100 px-4 py-3 text-left text-sm hover:bg-gray-50 last:border-b-0"
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
          )}
        </div>

        <button
          type="button"
          onClick={load}
          disabled={!patientId}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {/* Error genérico */}
      {error && error.status !== 404 && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">Error</div>
          <div className="mt-1 wrap-break-words">{error.message}</div>
        </div>
      )}

      {/* Body */}
      {!patientId ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <EmptyState title="Seleccioná un paciente" description="Buscá por apellido o DNI para ver su odontograma." />
        </section>
      ) : showNotFound ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <EmptyState
            title="Paciente no encontrado"
            description="Seleccioná o creá un paciente para ver su odontograma."
          />
        </section>
      ) : (
        <>
          {/* ================== ODONTOGRAMA ================== */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-900">Odontograma</div>

            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-8 gap-2">{upper.map(toothPill)}</div>
              <div className="h-px bg-gray-100" />
              <div className="grid grid-cols-8 gap-2">{lower.map(toothPill)}</div>
            </div>

            {loading && <div className="mt-3 text-xs text-gray-500">Cargando…</div>}
          </section>

          {/* ================== HALLAZGOS ================== */}
          <section className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Hallazgos</div>
                <div className="text-xs text-gray-500">Cambios registrados en el odontograma</div>
              </div>
              <span className="text-xs text-gray-500">{findings.length} item(s)</span>
            </div>

            {findings.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">
                Todavía no hay registros. Tocá una pieza y guardá un estado.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {findings.map((f) => {
                  const badge = surfacesBadgeFor(index, f.toothCode)
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => openEditor(f.toothCode, f.surface)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {f.toothCode} · {surfaceLabel(f.surface)}
                            </span>

                            {badge && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                                {badge}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 text-xs text-gray-600">{statusLabel(f.status)}</div>

                          {f.note && (
                            <div className="mt-1 text-xs text-gray-500">
                              {f.note}
                            </div>
                          )}
                        </div>

                        <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-700">
                          {f.status}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
          <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-900">Resumen clínico</div>

            <ul className="mt-2 space-y-1 text-sm text-gray-700">
                <li>🦷 Piezas con caries: <b>3</b></li>
                <li>🧩 Restauraciones: <b>4</b></li>
                <li>🪥 Endodoncias: <b>1</b></li>
                <li>❌ Extraídas: <b>2</b></li>
            </ul>
          </section>
        </>
      )}

      {/* Sheet: editar pieza */}
      <BottomSheet open={open} title={`Pieza ${selTooth}`} onClose={() => setOpen(false)}>
        <div className="grid gap-4">
          {modalBadge && (
            <div className="text-xs text-gray-500">
              Superficies cargadas: <span className="font-semibold">{modalBadge}</span>
            </div>
          )}

          <label className="grid gap-2">
            <span className="text-xs font-semibold text-gray-600">Superficie</span>
            <select
              value={surface}
              onChange={(e) => setSurface(e.target.value as ToothSurface)}
              disabled={surfaceLocked}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm disabled:bg-gray-50 disabled:text-gray-500"
            >
              {SURFACES.map((s) => (
                <option key={s} value={s}>
                  {s === "GENERAL" ? "General" : s}
                </option>
              ))}
            </select>

            {surfaceLocked && (
              <div className="text-xs text-gray-500">
                Para <span className="font-semibold">{statusLabel(status)}</span> la superficie debe ser{" "}
                <span className="font-semibold">General</span>.
              </div>
            )}
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold text-gray-600">Estado</span>
            <select
              value={status}
              onChange={(e) => {
                const next = e.target.value as OdontogramStatus
                setStatus(next)

                if (requiresGeneral(next) && surface !== "GENERAL") {
                  setSkipSyncOnce(true)
                  setSurface("GENERAL")
                }
              }}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
            >
              {STATUSES.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold text-gray-600">Nota (opcional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
              placeholder="Ej: dolor a la percusión…"
            />
          </label>

          <button
            type="button"
            onClick={save}
            disabled={!patientId}
            className="rounded-2xl bg-(--clinic-blue) px-4 py-4 text-sm font-semibold text-white shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Guardar
          </button>
        </div>
      </BottomSheet>

      {/* Sheet: crear paciente */}
      <BottomSheet open={openNewPatient} title="Nuevo paciente" onClose={() => setOpenNewPatient(false)}>
        <NewPatientSheet
          initial={initialPatient}
          onCreated={(p) => {
            setOpenNewPatient(false)
            selectPatient(p)
          }}
        />
      </BottomSheet>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  )
}
