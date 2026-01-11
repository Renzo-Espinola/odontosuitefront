// src/components/NewPatientSheet.tsx
import { useState } from "react"
import { createPatient, type CreatePatientRequest, type PatientResponse } from "../lib/api"

function onlyDigits(s: string) {
  return s.replace(/\D/g, "")
}

export function NewPatientSheet({
  onCreated,
  initial,
}: {
  onCreated: (p: PatientResponse) => void
  initial?: Partial<CreatePatientRequest>
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "")
  const [lastName, setLastName] = useState(initial?.lastName ?? "")
  const [documentNumber, setDocumentNumber] = useState(initial?.documentNumber ?? "")
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "")
  const [phone, setPhone] = useState(initial?.phone ?? "")
  const [email, setEmail] = useState(initial?.email ?? "")
  const [address, setAddress] = useState(initial?.address ?? "")
  const [obraSocial, setObraSocial] = useState(initial?.obraSocial ?? "")
  const [obraSocialNumber, setObraSocialNumber] = useState(initial?.obraSocialNumber ?? "")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave =
    !saving &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    documentNumber.trim().length > 0

  async function submit() {
    try {
      setSaving(true)
      setError(null)

      const payload: CreatePatientRequest = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        documentNumber: documentNumber.trim(),
        birthDate: birthDate.trim() ? birthDate.trim() : null,
        phone: phone.trim() ? phone.trim() : null,
        email: email.trim() ? email.trim() : null,
        address: address.trim() ? address.trim() : null,
        obraSocial: obraSocial.trim() ? obraSocial.trim() : null,
        obraSocialNumber: obraSocialNumber.trim() ? obraSocialNumber.trim() : null,
      }

      const created = await createPatient(payload)
      onCreated(created)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
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

      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Nombre</span>
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
          placeholder="Ej: Juan"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Apellido</span>
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
          placeholder="Ej: Pérez"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">DNI</span>
        <input
          value={documentNumber}
          onChange={(e) => setDocumentNumber(onlyDigits(e.target.value))}
          inputMode="numeric"
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
          placeholder="Ej: 12345678"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Fecha nacimiento (opcional)</span>
        <input
          type="date"
          value={birthDate ?? ""}
          onChange={(e) => setBirthDate(e.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Teléfono (opcional)</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Email (opcional)</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Dirección (opcional)</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">Obra social (opcional)</span>
        <input
          value={obraSocial}
          onChange={(e) => setObraSocial(e.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-semibold text-gray-600">N° afiliado (opcional)</span>
        <input
          value={obraSocialNumber}
          onChange={(e) => setObraSocialNumber(e.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm"
        />
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={!canSave}
        className="rounded-2xl bg-(--clinic-blue) px-4 py-4 text-sm font-semibold text-white shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? "Guardando…" : "Crear paciente"}
      </button>
    </div>
  )
}
