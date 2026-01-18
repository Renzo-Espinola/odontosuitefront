// ClinicalScreen.tsx
import { useEffect, useMemo, useRef, useState } from "react"
import {
  fetchOdontogram,
  upsertOdontogramItem,
  searchPatients,
  fetchClinicalEvents,
  createClinicalEvent,  
  fetchTreatmentPlansByPatient,
  createTreatmentPlanItem,
  type TreatmentPlanItemResponse,
  type TreatmentProcedure,
  type TreatmentStatus,
  type ClinicalEventResponse,
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

// -------------------- Modelo UI (hallazgo) --------------------
type Finding = {
  toothCode: string
  surface: ToothSurface
  status: OdontogramStatus
  note: string | null
  key: string
}

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

// Badge tipo "M+D" (máx 3 letras; si hay más: "M+D+B+")
function surfacesBadgeFor(idx: Map<string, any>, toothCode: string) {
  const present = LETTER_SURFACES.filter((s) => idx.has(keyOf(toothCode, s)))
  if (present.length === 0) return null
  const shown = present.slice(0, 3).join("+")
  return present.length > 3 ? `${shown}+` : shown
}

// Color global del diente: GENERAL manda; si no existe, “peor” entre superficies
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

function summarizeTeeth(
  idx: Map<string, { id: number; status: OdontogramStatus; note: string | null }>,
  toothCodes: string[]
) {
  let caries = 0
  let fillings = 0
  let endodontics = 0
  let extracted = 0
  let missing = 0
  let implants = 0
  let crowns = 0

  for (const t of toothCodes) {
    const s = displayStatusForTooth(idx, t)
    if (s === "CARIES") caries++
    else if (s === "FILLING") fillings++
    else if (s === "ENDODONTIC") endodontics++
    else if (s === "EXTRACTED") extracted++
    else if (s === "MISSING") missing++
    else if (s === "IMPLANT") implants++
    else if (s === "CROWN") crowns++
  }

  return { caries, fillings, endodontics, extracted, missing, implants, crowns }
}

function sortFindingsForTooth(arr: Finding[]) {
  return [...arr].sort((a, b) => {
    const sa = SURFACE_ORDER[a.surface] ?? 99
    const sb = SURFACE_ORDER[b.surface] ?? 99
    if (sa !== sb) return sa - sb
    return (STATUS_WEIGHT[b.status] ?? 0) - (STATUS_WEIGHT[a.status] ?? 0)
  })
}

function eventTitle(e: ClinicalEventResponse) {
  if (e.type === "NOTE") return "Nota clínica"
  return "Cambio odontograma"
}

function eventSubtitle(e: ClinicalEventResponse) {
  if (e.type === "NOTE") return e.note ?? ""
  const tooth = e.toothCode ? `Pieza ${e.toothCode}` : ""
  const surf = e.surface ? ` · ${surfaceLabel(e.surface)}` : ""
  const from = e.fromStatus ? statusLabel(e.fromStatus) : ""
  const to = e.toStatus ? statusLabel(e.toStatus) : ""
  const change = from && to ? `: ${from} → ${to}` : ""
  return `${tooth}${surf}${change}`.trim()
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function CollapsibleSection({
  storageKey,
  title,
  subtitle,
  count,
  defaultOpen = false,
  children,
}: {
  storageKey: string
  title: string
  subtitle?: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const fullKey = `odontosuite:clinical:${storageKey}`

  const [open, setOpen] = useState(() => {
    try {
      const raw = localStorage.getItem(fullKey)
      if (raw === "1") return true
      if (raw === "0") return false
      return defaultOpen
    } catch {
      return defaultOpen
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(fullKey, open ? "1" : "0")
    } catch {
      // ignore (private mode / storage disabled)
    }
  }, [fullKey, open])

  return (
    <section className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="text-left">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          {count !== undefined && <span>{count}</span>}
          <span>{open ? "▼" : "▶"}</span>
        </div>
      </button>

      {open && <div className="border-t border-gray-100 p-4">{children}</div>}
    </section>
  )
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

  // evitar que sync pise status/nota cuando forzamos GENERAL o precargamos al abrir
  const [skipSyncOnce, setSkipSyncOnce] = useState(false)

  // micro-ux
  const [highlightTooth, setHighlightTooth] = useState<string | null>(null)
  const [savedTooth, setSavedTooth] = useState<string | null>(null)

  const odontogramRef = useRef<HTMLDivElement | null>(null)
  const toothRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [flashOdontogram, setFlashOdontogram] = useState(false)

  // historia clínica (timeline)
  const [events, setEvents] = useState<ClinicalEventResponse[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [tpItems, setTpItems] = useState<TreatmentPlanItemResponse[]>([])
  const [tpLoading, setTpLoading] = useState(false)

  const [openTp, setOpenTp] = useState(false)
  const [tpProcedure, setTpProcedure] = useState<TreatmentProcedure>("CLEANING")
  const [tpStatus, setTpStatus] = useState<TreatmentStatus>("PLANNED")
  const [tpTooth, setTpTooth] = useState<string>("")
  const [tpSurface, setTpSurface] = useState<ToothSurface>("GENERAL")
  const [tpEstimated, setTpEstimated] = useState<string>("")
  const [tpNotes, setTpNotes] = useState<string>("")


  function setToothRef(code: string) {
    return (el: HTMLButtonElement | null) => {
      toothRefs.current[code] = el
    }
  }

  function scrollToTooth(code: string) {
    const el = toothRefs.current[code]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    odontogramRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

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

  function pulseHighlight(code: string, ms = 900) {
    setHighlightTooth(code)
    window.setTimeout(() => {
      setHighlightTooth((cur) => (cur === code ? null : cur))
    }, ms)
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

  // cargar odontograma al seleccionar paciente
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  // cargar historia clínica al seleccionar paciente
  useEffect(() => {
    if (!patientId) {
      setEvents([])
      return
    }
    ;(async () => {
      try {
        setEventsLoading(true)
        const ev = await fetchClinicalEvents(patientId, 50)
        setEvents(ev)
      } catch {
        setEvents([])
      } finally {
        setEventsLoading(false)
      }
    })()
  }, [patientId])

  useEffect(() => {
    if (!patientId) {
      setTpItems([])
      return
    }
    ;(async () => {
      try {
        setTpLoading(true)
        const items = await fetchTreatmentPlansByPatient(patientId)
        setTpItems(items)
      } finally {
        setTpLoading(false)
      }
    })()
  }, [patientId])

  // debounce buscador paciente
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

  // badge modal
  const modalBadge = useMemo(() => {
    if (!selTooth) return null
    return surfacesBadgeFor(index, selTooth)
  }, [index, selTooth])

  // sync modal: cuando cambia (pieza/superficie) cargar lo existente
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

  // si estado exige GENERAL, forzamos surface sin perder status/nota
  useEffect(() => {
    if (!open) return
    if (requiresGeneral(status) && surface !== "GENERAL") {
      setSkipSyncOnce(true)
      setSurface("GENERAL")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, open])

  // abrir modal (opcionalmente en superficie concreta)
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

  async function save() {
    if (!patientId) return

    if (requiresGeneral(status) && surface !== "GENERAL") {
      setError({ status: 400, message: "Para este estado la superficie debe ser General." })
      return
    }

    const prev = index.get(keyOf(selTooth, surface))?.status ?? "HEALTHY"
    const noteTrimmed = note.trim() ? note.trim() : null

    try {
      setError(null)

      // 1) actualizo odontograma
      const res = await upsertOdontogramItem(patientId, {
        toothCode: selTooth,
        surface,
        status,
        note: noteTrimmed,
        createClinicalNote: false,
      })

      setData(res)
      setOpen(false)

      // 2) creo evento
      const created = await createClinicalEvent({
        patientId,
        type: "ODONTOGRAM_CHANGE",
        toothCode: selTooth,
        surface,
        fromStatus: prev,
        toStatus: status,
        note: noteTrimmed,
      })

      // 3) actualizo timeline sin refetch
      setEvents((cur) => [created, ...cur])

      // micro-ux
      pulseHighlight(selTooth)
      setSavedTooth(selTooth)
      window.setTimeout(() => setSavedTooth(null), 650)
    } catch (e) {
      setError({ status: 0, message: e instanceof Error ? e.message : String(e) })
    }
  }

  // --------- grid FDI ----------
  const upper = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"]
  const lower = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"]
  const allTeeth = useMemo(() => [...upper, ...lower], [])
  const summary = useMemo(() => summarizeTeeth(index, allTeeth), [index, allTeeth])

  function toothPill(toothCode: string) {
    const badge = surfacesBadgeFor(index, toothCode)
    const s = displayStatusForTooth(index, toothCode)

    const cls =
      s === "HEALTHY"
        ? "bg-gray-100 text-gray-700"
        : s === "CARIES"
          ? "bg-red-100 text-red-700"
          : s === "FILLING"
            ? "bg-amber-100 text-amber-800"
            : s === "CROWN"
              ? "bg-indigo-100 text-indigo-700"
              : s === "ENDODONTIC"
                ? "bg-purple-100 text-purple-700"
                : s === "IMPLANT"
                  ? "bg-emerald-100 text-emerald-700"
                  : s === "MISSING"
                    ? "bg-gray-200 text-gray-700"
                    : "bg-gray-200 text-gray-700"

    const isHighlighted = highlightTooth === toothCode
    const isSaved = savedTooth === toothCode

    return (
      <button
        ref={setToothRef(toothCode)}
        key={toothCode}
        type="button"
        onClick={() => openEditor(toothCode)}
        className={[
          "relative rounded-xl px-2 py-2 text-xs font-semibold border border-gray-200 hover:bg-gray-50",
          "transition-transform",
          cls,
          isHighlighted ? "ring-2 ring-(--clinic-blue) ring-offset-2" : "",
          isSaved ? "scale-[1.05]" : "",
        ].join(" ")}
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

    for (const [tooth, arr] of map) {
      arr.sort((a, b) => (SURFACE_ORDER[a.surface] ?? 99) - (SURFACE_ORDER[b.surface] ?? 99))
      map.set(tooth, arr)
    }

    const keys = Array.from(map.keys()).sort((a, b) => Number(a) - Number(b))
    return { map, keys }
  }, [findings])

  function statusChipClass(s: OdontogramStatus) {
    return s === "CARIES"
      ? "bg-red-100 text-red-700"
      : s === "FILLING"
        ? "bg-amber-100 text-amber-800"
        : s === "ENDODONTIC"
          ? "bg-purple-100 text-purple-700"
          : s === "IMPLANT"
            ? "bg-emerald-100 text-emerald-700"
            : s === "CROWN"
              ? "bg-indigo-100 text-indigo-700"
              : s === "MISSING"
                ? "bg-gray-200 text-gray-700"
                : s === "EXTRACTED"
                  ? "bg-gray-200 text-gray-700"
                  : "bg-gray-100 text-gray-700"
  }

  function handleFindingClick(f: Finding) {
    pulseHighlight(f.toothCode)
    setFlashOdontogram(true)
    window.setTimeout(() => setFlashOdontogram(false), 200)

    odontogramRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    scrollToTooth(f.toothCode)

    window.setTimeout(() => {
      openEditor(f.toothCode, f.surface)
    }, 220)
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
                      <div className="text-xs text-gray-500">DNI {p.documentNumber} · #{p.id}</div>
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
          <EmptyState title="Paciente no encontrado" description="Seleccioná o creá un paciente para ver su odontograma." />
        </section>
      ) : (
        <>
          {/* ODONTOGRAMA */}
          <section
            ref={odontogramRef}
            className={[
              "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm",
              "transition-[box-shadow,transform] duration-200",
              flashOdontogram ? "ring-2 ring-(--clinic-blue) ring-offset-2 bg-blue-50/40 shadow-md" : "",
            ].join(" ")}
          >
            <div className="text-sm font-semibold text-gray-900">Odontograma</div>

            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-8 gap-2">{upper.map(toothPill)}</div>
              <div className="h-px bg-gray-100" />
              <div className="grid grid-cols-8 gap-2">{lower.map(toothPill)}</div>
            </div>

            {loading && <div className="mt-3 text-xs text-gray-500">Cargando…</div>}
          </section>

          {/* HALLAZGOS (colapsable) */}
          <CollapsibleSection
            storageKey="hallazgos"
            title="Hallazgos"
            subtitle="Cambios registrados en el odontograma"
            count={findings.length}
            defaultOpen
          >
            {findings.length === 0 ? (
              <div className="text-sm text-gray-500">
                Todavía no hay registros. Tocá una pieza y guardá un estado.
              </div>
            ) : (
              <div className="-mx-4">
                <div className="divide-y divide-gray-100">
                  {findingsByTooth.keys.map((toothCode) => {
                    const items = findingsByTooth.map.get(toothCode) ?? []
                    const sorted = sortFindingsForTooth(items)

                    return (
                      <div key={toothCode} className="px-4 py-3">
                        <div className="mb-2 text-sm font-semibold text-gray-900">Pieza {toothCode}</div>

                        <div className="space-y-1">
                          {sorted.map((f) => (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => handleFindingClick(f)}
                              onMouseEnter={() => setHighlightTooth(f.toothCode)}
                              onMouseLeave={() => setHighlightTooth(null)}
                              onFocus={() => setHighlightTooth(f.toothCode)}
                              onBlur={() => setHighlightTooth(null)}
                              onPointerDown={() => setHighlightTooth(f.toothCode)} // mobile friendly
                              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-gray-50"
                            >
                              <div className="min-w-0">
                                <div className="text-xs text-gray-700">{surfaceLabel(f.surface)}</div>
                                {f.note && <div className="mt-0.5 truncate text-xs text-gray-500">{f.note}</div>}
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusChipClass(
                                  f.status
                                )}`}
                              >
                                {statusLabel(f.status)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            storageKey="Plan de tratamiento"
            title="Plan de tratamiento"
            subtitle="Procedimientos planificados para el paciente"
            count={tpItems.length}
            defaultOpen
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {tpLoading ? "Cargando…" : " "}
              </div>

              <button
                type="button"
                onClick={() => setOpenTp(true)}
                className="rounded-xl bg-(--clinic-blue) px-3 py-2 text-xs font-semibold text-white"
              >
                Agregar
              </button>
            </div>

            {tpItems.length === 0 && !tpLoading ? (
              <div className="mt-3 text-sm text-gray-500">Todavía no hay items en el plan.</div>
            ) : (
              <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100">
                {tpItems.map((it) => (
                  <div key={it.id} className="px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900">
                          {it.procedure}
                          {it.toothCode ? ` · Pieza ${it.toothCode}` : ""}
                          {it.surface ? ` · ${surfaceLabel(it.surface)}` : ""}
                        </div>
                        {it.notes && <div className="mt-0.5 text-xs text-gray-600 truncate">{it.notes}</div>}
                        <div className="mt-1 text-xs text-gray-500">
                          Estimado: ${Number(it.estimatedCost).toLocaleString("es-AR")}
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                        {it.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* RESUMEN (colapsable) */}
          <CollapsibleSection storageKey="resumen" title="Resumen clínico" defaultOpen={false}>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                  Piezas con caries
                </span>
                <b>{summary.caries}</b>
              </li>

              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Restauraciones
                </span>
                <b>{summary.fillings}</b>
              </li>

              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-500" />
                  Endodoncias
                </span>
                <b>{summary.endodontics}</b>
              </li>

              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-600" />
                  Extraídas
                </span>
                <b>{summary.extracted}</b>
              </li>

              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" />
                  Ausentes
                </span>
                <b>{summary.missing}</b>
              </li>

              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Implantes
                </span>
                <b>{summary.implants}</b>
              </li>

              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  Coronas
                </span>
                <b>{summary.crowns}</b>
              </li>
            </ul>
          </CollapsibleSection>

          {/* HISTORIA CLÍNICA (colapsable) */}
          <CollapsibleSection
            storageKey="historia"
            title="Historia clínica"
            subtitle="Notas y cambios del odontograma"
            count={eventsLoading ? undefined : events.length}
            defaultOpen={false}
          >
            {eventsLoading ? (
              <div className="text-sm text-gray-500">Cargando eventos…</div>
            ) : events.length === 0 ? (
              <div className="text-sm text-gray-500">Todavía no hay eventos clínicos.</div>
            ) : (
              <div className="-mx-4">
                <div className="divide-y divide-gray-100">
                  {events.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        if (e.type === "ODONTOGRAM_CHANGE" && e.toothCode && e.surface) {
                          handleFindingClick({
                            toothCode: e.toothCode,
                            surface: e.surface,
                            status: e.toStatus ?? "HEALTHY",
                            note: e.note ?? null,
                            key: `${e.id}`,
                          })
                        }
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900">{eventTitle(e)}</div>
                          <div className="mt-0.5 text-xs text-gray-600">{eventSubtitle(e)}</div>
                          {e.note && e.type === "ODONTOGRAM_CHANGE" && (
                            <div className="mt-1 truncate text-xs text-gray-500">{e.note}</div>
                          )}
                        </div>
                        <div className="shrink-0 text-xs text-gray-500">{fmtDate(e.createdAt)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleSection>
        </>
      )}

      {/* Sheet: editar pieza */}
      <BottomSheet open={open} title={`Pieza ${selTooth}`} onClose={() => { setOpen(false); setSkipSyncOnce(false) }}>
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
      <BottomSheet open={openTp} title="Nuevo item" onClose={() => setOpenTp(false)}>
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-semibold text-gray-600">Procedimiento</span>
            <select
              value={tpProcedure}
              onChange={(e) => setTpProcedure(e.target.value as TreatmentProcedure)}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
            >
              <option value="CLEANING">Limpieza</option>
              <option value="FILLING">Restauración</option>
              <option value="ROOT_CANAL">Endodoncia</option>
              <option value="EXTRACTION">Extracción</option>
              <option value="WHITENING">Blanqueamiento</option>
              <option value="ORTHODONTICS">Ortodoncia</option>
              <option value="PROSTHESIS">Prótesis</option>
              <option value="CONSULTATION">Consulta</option>
              <option value="CONTROL_VISIT">Control</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-gray-600">Pieza (opcional)</span>
              <input
                value={tpTooth}
                onChange={(e) => setTpTooth(e.target.value)}
                placeholder="Ej: 26"
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold text-gray-600">Superficie</span>
              <select
                value={tpSurface}
                onChange={(e) => setTpSurface(e.target.value as ToothSurface)}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
                disabled={!tpTooth.trim()}
              >
                {SURFACES.map((s) => (
                  <option key={s} value={s}>
                    {surfaceLabel(s)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-semibold text-gray-600">Costo estimado</span>
            <input
              value={tpEstimated}
              onChange={(e) => setTpEstimated(e.target.value)}
              placeholder="Ej: 25000"
              inputMode="decimal"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold text-gray-600">Notas</span>
            <textarea
              value={tpNotes}
              onChange={(e) => setTpNotes(e.target.value)}
              rows={3}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={async () => {
              if (!patientId) return
              if (!tpEstimated.trim()) {
                setError({ status: 400, message: "estimatedCost es requerido" })
                return
              }

              // regla backend: si surface viene, toothCode requerido -> lo cumplimos
              const tooth = tpTooth.trim() ? tpTooth.trim() : null
              const surf = tooth ? tpSurface : null

              try {
                setError(null)
                const created = await createTreatmentPlanItem({
                  patientId,
                  procedure: tpProcedure,
                  status: tpStatus,
                  toothCode: tooth,
                  surface: surf,
                  estimatedCost: tpEstimated.trim(),
                  notes: tpNotes.trim() ? tpNotes.trim() : null,
                })
                setTpItems((cur) => [created, ...cur])
                setOpenTp(false)

                // reset rápido
                setTpProcedure("CLEANING")
                setTpStatus("PLANNED")
                setTpTooth("")
                setTpSurface("GENERAL")
                setTpEstimated("")
                setTpNotes("")
              } catch (e) {
                setError({ status: 0, message: e instanceof Error ? e.message : String(e) })
              }
            }}
            className="rounded-2xl bg-(--clinic-blue) px-4 py-4 text-sm font-semibold text-white shadow-sm active:scale-[0.99]"
          >
            Guardar
          </button>
        </div>
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
