import { useState } from "react"
import { setToken } from "../lib/auth"

const IDENTITY_BASE = import.meta.env.VITE_IDENTITY_BASE ?? "http://localhost:8083"

export default function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("admin@odonto.com")
  const [password, setPassword] = useState("Admin123!Admin123!")
  const [err, setErr] = useState<string>("")
  const [loading, setLoading] = useState(false)

  async function login() {
    setLoading(true)
    setErr("")
    try {
      const res = await fetch(`${IDENTITY_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const text = await res.text()
      if (!res.ok) throw new Error(text)

      const data = JSON.parse(text)
      const token = data.accessToken ?? data.token
      if (!token) throw new Error("No vino accessToken")

      setToken(token)
      onLoggedIn()
    } catch (e: any) {
      setErr(String(e?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm border rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold">OdontoSuite</h1>
        <p className="text-sm text-gray-500 mb-4">Login de pruebas</p>

        <label className="text-sm">Email</label>
        <input className="w-full border rounded-xl p-3 mt-1 mb-3"
          value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="text-sm">Password</label>
        <input className="w-full border rounded-xl p-3 mt-1 mb-4"
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        {err && <pre className="text-xs text-red-600 whitespace-pre-wrap mb-3">{err}</pre>}

        <button
          onClick={login}
          disabled={loading}
          className="w-full rounded-xl p-3 bg-black text-white disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </div>
    </div>
  )
}
