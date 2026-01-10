import { useEffect, useMemo, useState } from "react"
import { createMovement } from "../lib/api"
import type { MovementConcept, PaymentMethod } from "../lib/api"

const INCOME_CONCEPTS: MovementConcept[] = [
  "CONSULTATION",
  "CLEANING",
  "FILLING",
  "ROOT_CANAL",
  "EXTRACTION",
  "ORTHODONTICS",
  "PROSTHESIS",
  "WHITENING",
  "CONTROL_VISIT",
  "OTHER_INCOME",
]

const EXPENSE_CONCEPTS: MovementConcept[] = [
  "MATERIALS",
  "LABORATORY",
  "SUPPLIERS",
  "RENT",
  "SERVICES",
  "SALARIES",
  "TAXES",
  "MAINTENANCE",
  "OTHER_EXPENSE",
]

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD", "TRANSFER"]

function formatLabel(s: string) {
  return s
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/(^|\s)\S/g, (m) => m.toUpperCase())
}

/** ✅ Regla UI:
 *  - Ingreso clínico => pide patientId
 *  - OTHER_INCOME => NO pide patientId
 *  - Egreso => NO pide patientId
 */
function requiresPatient(nature: "INCOME" | "EXPENSE", concept: MovementConcept) {
  if (nature !== "INCOME") return false
  return concept !== "OTHER_INCOME"
}

export function NewMovementSheet({ onCreated }: { onCreated: () => void }) {
  const [nature, setNature] = useState<"INCOME" | "EXPENSE">("INCOME")

  const conceptOptions = useMemo(
    () => (nature === "INCOME" ? INCOME_CONCEPTS : EXPENSE_CONCEPTS),
    [nature]
  )

  const [concept, setConcept] = useState<MovementConcept>(conceptOptions[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH")
  const [amount, setAmount] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [patientId, setPatientId] = useState<string>("")
  const [appointmentId, setAppointmentId] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ cuando cambia nature, resetea concept (useEffect, no useMemo)
  useEffect(() => {
    setConcept(conceptOptions[0])
    // también podés resetear patientId/appointmentId si querés
    setPatientId("")
    setAppointmentId("")
  }, [conceptOptions])

const needsPatient = requiresPatient(nature, concept)

useEffect(() => {
  if (!needsPatient) {
    setPatientId("")
    setAppointmentId("")
  }
}, [needsPatient])
  
const parsedAmount = Number(amount.replace(",", ".").trim())
const canSave =
  !saving &&
  Number.isFinite(parsedAmount) &&
  parsedAmount > 0 &&
  (!needsPatient || patientId.trim() !== "")

  async function submit() {
    try {
      setSaving(true)
      setError(null)
      
      const amt = amount.replace(",", ".").trim()
      const amtNum = Number(amt)
      if (!Number.isFinite(amtNum) || amtNum <= 0) throw new Error("Monto inválido")

      if (needsPatient) {
        const pid = Number(patientId)
        if (!Number.isFinite(pid) || pid <= 0) throw new Error("Paciente inválido")
      }

      await createMovement({
        concept,
        paymentMethod,
        amount: amt,
        description: description?.trim() ? description.trim() : null,
        patientId: needsPatient ? Number(patientId) : null,
        appointmentId: appointmentId ? Number(appointmentId) : null,
      })

      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4">
      {/* Toggle INCOME/EXPENSE */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setNature("INCOME")}
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            nature === "INCOME"
              ? "bg-(--clinic-green) text-white"
              : "border border-gray-200 text-gray-700"
          }`}
        >
          Ingreso
        </button>

        <button
          type="button"
          onClick={() => setNature("EXPENSE")}
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            nature === "EXPENSE"
              ? "bg-(--clinic-violet) text-white"
              : "border border-gray-200 text-gray-700"
          }`}
        >
          Egreso
        </button>
      </div>

      {/* Concepto */}
      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Concepto</span>
        <select
          value={concept}
          onChange={(e) => setConcept(e.target.value as MovementConcept)}
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        >
          {conceptOptions.map((c) => (
            <option key={c} value={c}>
              {formatLabel(c)}
            </option>
          ))}
        </select>
      </label>

      {/* Medio de pago */}
      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Medio de pago</span>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {formatLabel(m)}
            </option>
          ))}
        </select>
      </label>

      {/* Monto */}
      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Monto</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Ej: 3500 o 3500.50"
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        />
      </label>

      {/* Paciente/Turno sólo si corresponde */}
      {needsPatient && (
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-2">
            <span className="text-xs font-semibold text-gray-600">Paciente (ID)</span>
            <input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="Ej: 123"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold text-gray-600">Turno (opcional)</span>
            <input
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="Ej: 456"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
            />
          </label>
        </div>
      )}

      {/* Descripción */}
      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Descripción (opcional)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Limpieza paciente..."
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        />
      </label>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSave}
        className="rounded-2xl bg-(--clinic-blue) px-4 py-4 text-sm font-semibold text-white shadow-sm active:scale-[0.99] disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Guardar movimiento"}
      </button>
    </div>
  )
}
