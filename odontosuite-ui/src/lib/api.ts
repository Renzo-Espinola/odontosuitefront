// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8082"

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
