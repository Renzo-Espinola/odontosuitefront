// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_ADMIN_API_UR ?? "http://localhost:8082"
const PATIENTS_API_URL = import.meta.env.VITE_PATIENTS_API_URL ?? "http://localhost:8081"

export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"

export type CashSummaryResponse = {
  from: string
  to: string
  totalIncome: number
  totalExpense: number
  netTotal: number
}

export async function fetchCashSummary(from: string, to: string): Promise<CashSummaryResponse> {
  const url = `${API_BASE_URL}/api/reports/cash/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const res = await fetch(url, { headers: { Accept: "application/json" } })

  const contentType = res.headers.get("content-type") ?? ""
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  if (!contentType.includes("application/json")) {
    const body = await res.text()
    throw new Error(`Respuesta no JSON: ${body.slice(0, 200)}`)
  }

  return res.json()
}

export type MoneyMovementResponse = {
  id: number
  movementNature: "INCOME" | "EXPENSE"
  amount: number
  currency: string
  patientId: number | null
  appointmentId: number | null
  description: string
  createdAt: string
}

export async function fetchMovements(from: string, to: string): Promise<MoneyMovementResponse[]> {
  const url = `${API_BASE_URL}/api/cash/movements?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const res = await fetch(url, { headers: { Accept: "application/json" } })

  const contentType = res.headers.get("content-type") ?? ""
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  if (!contentType.includes("application/json")) {
    const body = await res.text()
    throw new Error(`Respuesta no JSON: ${body.slice(0, 200)}`)
  }

  return res.json()
}

export async function fetchTodayCashSummary(): Promise<CashSummaryResponse> {
  const { from, to } = todayRange()
  return fetchCashSummary(from, to)
}

export async function fetchTodayMovements(): Promise<MoneyMovementResponse[]> {
  const { from, to } = todayRange()
  return fetchMovements(from, to)
}

function toLocalDateTimeString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function todayRange(): { from: string; to: string } {
  const now = new Date()

  const from = new Date(now)
  from.setHours(0, 0, 0, 0)

  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  return {
    from: toLocalDateTimeString(from),
    to: toLocalDateTimeString(to),
  }
}

/** ✅ Contrato REAL del backend:
 *  CreateMoneyMovementRequest(concept, paymentMethod, amount, patientId?, appointmentId?, description?)
 */
export type MovementConcept =
  | "CONSULTATION"
  | "CLEANING"
  | "FILLING"
  | "ROOT_CANAL"
  | "EXTRACTION"
  | "ORTHODONTICS"
  | "PROSTHESIS"
  | "WHITENING"
  | "CONTROL_VISIT"
  | "OTHER_INCOME"
  | "MATERIALS"
  | "LABORATORY"
  | "SUPPLIERS"
  | "RENT"
  | "SERVICES"
  | "SALARIES"
  | "TAXES"
  | "MAINTENANCE"
  | "OTHER_EXPENSE"

export type PaymentMethod = "CASH" | "CARD" | "TRANSFER"

export type CreateMoneyMovementRequest = {
  concept: MovementConcept
  paymentMethod: PaymentMethod
  /** BigDecimal-friendly: mandamos string para evitar problemas de float */
  amount: string
  patientId?: number | null
  appointmentId?: number | null
  description?: string | null
}

export async function createMovement(bodyReq: CreateMoneyMovementRequest) {
  const url = `${API_BASE_URL}/api/cash/movements`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(bodyReq),
  })

  const contentType = res.headers.get("content-type") ?? ""
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  if (!contentType.includes("application/json")) {
    const body = await res.text()
    throw new Error(`Respuesta no JSON: ${body.slice(0, 200)}`)
  }

  return res.json()
}

export type AppointmentResponse = {
  id: number
  patientId: number
  startTime: string
  endTime: string | null
  status: AppointmentStatus
  reason: string | null
  notes: string | null
  createdLate: boolean
  createdAt: string
  updatedAt: string
}


export type CreateAppointmentRequest = {
  patientId: number
  startTime: string // LocalDateTime
  endTime?: string | null
  reason?: string | null
  notes?: string | null
}

export async function fetchAppointments(from: string, to: string): Promise<AppointmentResponse[]> {
  const url = `${API_BASE_URL}/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const res = await fetch(url, { headers: { Accept: "application/json" } })

  const contentType = res.headers.get("content-type") ?? ""
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  if (!contentType.includes("application/json")) {
    const body = await res.text()
    throw new Error(`Respuesta no JSON: ${body.slice(0, 200)}`)
  }

  return res.json()
}


export async function fetchTodayAppointments(): Promise<AppointmentResponse[]> {
  const { from, to } = todayRange()
  return fetchAppointments(from, to)
}

export async function createAppointment(bodyReq: CreateAppointmentRequest): Promise<AppointmentResponse> {
  const url = `${API_BASE_URL}/api/appointments`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(bodyReq),
  })

  const contentType = res.headers.get("content-type") ?? ""
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  if (!contentType.includes("application/json")) {
    const body = await res.text()
    throw new Error(`Respuesta no JSON: ${body.slice(0, 200)}`)
  }

  return res.json()
}

export async function updateAppointmentStatus(id: number, status: AppointmentStatus): Promise<AppointmentResponse> {
  const url = `${API_BASE_URL}/api/appointments/${id}/status`
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ status }),
  })

  const contentType = res.headers.get("content-type") ?? ""
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  if (!contentType.includes("application/json")) {
    const body = await res.text()
    throw new Error(`Respuesta no JSON: ${body.slice(0, 200)}`)
  }

  return res.json()
}


// --- Patients service (PORT 8081) ---

export type PatientResponse = {
  id: number
  firstName: string
  lastName: string
  documentNumber: string
  birthDate: string | null
  phone: string | null
  email: string | null
  address: string | null
  obraSocial: string | null
  obraSocialNumber: string | null
  active: boolean
}

export async function searchPatientsByLastName(lastName: string): Promise<PatientResponse[]> {
  const url = `${PATIENTS_API_URL}/api/patients?lastName=${encodeURIComponent(lastName)}`
  const res = await fetch(url, { headers: { Accept: "application/json" } })

  const contentType = res.headers.get("content-type") ?? ""
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  if (!contentType.includes("application/json")) {
    const body = await res.text()
    throw new Error(`Respuesta no JSON: ${body.slice(0, 200)}`)
  }

  return res.json()
}

export async function searchPatients(q: string): Promise<PatientResponse[]> {
  const url = `${PATIENTS_API_URL}/api/patients/search?q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { Accept: "application/json" } })

  const contentType = res.headers.get("content-type") ?? ""
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  if (!contentType.includes("application/json")) {
    const body = await res.text()
    throw new Error(`Respuesta no JSON: ${body.slice(0, 200)}`)
  }

  return res.json()
}

export type CreatePatientRequest = {
  firstName: string
  lastName: string
  documentNumber: string
  birthDate?: string | null // YYYY-MM-DD
  phone?: string | null
  email?: string | null
  address?: string | null
  obraSocial?: string | null
  obraSocialNumber?: string | null
}

export async function createPatient(bodyReq: CreatePatientRequest): Promise<PatientResponse> {
  const url = `${PATIENTS_API_URL}/api/patients`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(bodyReq),
  })

  const contentType = res.headers.get("content-type") ?? ""
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  if (!contentType.includes("application/json")) {
    const body = await res.text()
    throw new Error(`Respuesta no JSON: ${body.slice(0, 200)}`)
  }
  return res.json()
}

export async function fetchPatients(lastName?: string): Promise<PatientResponse[]> {
  const qs = lastName?.trim() ? `?lastName=${encodeURIComponent(lastName.trim())}` : ""
  const url = `${PATIENTS_API_URL}/api/patients${qs}`
  const res = await fetch(url, { headers: { Accept: "application/json" } })

  const contentType = res.headers.get("content-type") ?? ""
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  if (!contentType.includes("application/json")) {
    const body = await res.text()
    throw new Error(`Respuesta no JSON: ${body.slice(0, 200)}`)
  }
  return res.json()
}

// --- Patients service (PORT 8081) --- (mismo PATIENTS_API_URL)

export type ToothSurface = "GENERAL" | "O" | "M" | "D" | "B" | "L"

export type OdontogramStatus =
  | "HEALTHY"
  | "CARIES"
  | "FILLING"
  | "CROWN"
  | "ENDODONTIC"
  | "IMPLANT"
  | "MISSING"
  | "EXTRACTED"

export type OdontogramItemResponse = {
  id: number
  toothCode: string
  surface: ToothSurface
  status: OdontogramStatus
  note: string | null
}

export type OdontogramResponse = {
  odontogramId: number
  patientId: number
  items: OdontogramItemResponse[]
}

export type OdontogramItemUpsertRequest = {
  toothCode: string
  surface?: ToothSurface | null // UI puede mandar null
  status: OdontogramStatus
  note?: string | null
  createClinicalNote?: boolean
  clinicalDiagnosis?: string | null
  clinicalTreatment?: string | null
  clinicalObservations?: string | null
}

async function assertJson(res: Response) {
  const contentType = res.headers.get("content-type") ?? ""
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  if (!contentType.includes("application/json")) {
    const body = await res.text()
    throw new Error(`Respuesta no JSON: ${body.slice(0, 200)}`)
  }
}

export async function fetchOdontogram(patientId: number): Promise<OdontogramResponse> {
  const url = `${PATIENTS_API_URL}/api/patients/${patientId}/odontogram`
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  await assertJson(res)
  return res.json()
}

export async function upsertOdontogramItem(
  patientId: number,
  bodyReq: OdontogramItemUpsertRequest
): Promise<OdontogramResponse> {
  const url = `${PATIENTS_API_URL}/api/patients/${patientId}/odontogram/items`
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(bodyReq),
  })
  await assertJson(res)
  return res.json()
}

export async function deleteOdontogramItem(patientId: number, itemId: number): Promise<void> {
  const url = `${PATIENTS_API_URL}/api/patients/${patientId}/odontogram/items/${itemId}`
  const res = await fetch(url, { method: "DELETE" })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
}

