import { useMemo, useState } from "react"
import { createMovement } from "../lib/api"
import type { CreateMovementRequest } from "../lib/api"

const INCOME_CONCEPTS = [
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
] as const

const EXPENSE_CONCEPTS = [
  "MATERIALS",
  "LABORATORY",
  "SUPPLIERS",
  "RENT",
  "SERVICES",
  "SALARIES",
  "TAXES",
  "MAINTENANCE",
  "OTHER_EXPENSE",
] as const

const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER"] as const

function formatLabel(s: string) {
  return s
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/(^|\s)\S/g, (m) => m.toUpperCase())
}

export function NewMovementSheet({
  onCreated,
}: {
  onCreated: () => void
}) {
  const [nature, setNature] = useState<CreateMovementRequest["nature"]>("INCOME")
  const conceptOptions = useMemo(
    () => (nature === "INCOME" ? INCOME_CONCEPTS : EXPENSE_CONCEPTS),
    [nature]
  )

  const [concept, setConcept] = useState<string>(conceptOptions[0])
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH")
  const [amount, setAmount] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // si cambia nature, resetea concept al primero válido
  useMemo(() => {
    setConcept(conceptOptions[0])
  }, [conceptOptions])

  async function submit() {
    try {
      setSaving(true)
      setError(null)

      const amt = Number(amount.replace(",", "."))
      if (!Number.isFinite(amt) || amt <= 0) {
        throw new Error("Monto inválido")
      }

      await createMovement({
        nature,
        concept,
        paymentMethod,
        amount: amt,
        currency: "ARS",
        description: description?.trim() ? description.trim() : undefined,
        patientId: null,
        appointmentId: null,
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
          onChange={(e) => setConcept(e.target.value)}
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
          onChange={(e) => setPaymentMethod(e.target.value)}
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
        <span className="text-xs font-semibold text-gray-600">Monto (ARS)</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Ej: 3500"
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        />
      </label>

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
        disabled={saving}
        className="rounded-2xl bg-(--clinic-blue) px-4 py-4 text-sm font-semibold text-white shadow-sm active:scale-[0.99] disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Guardar movimiento"}
      </button>
    </div>
  )
}
