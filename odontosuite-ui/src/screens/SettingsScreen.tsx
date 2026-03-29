// src/screens/SettingsScreen.tsx
import { getToken } from "../lib/auth"

export default function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  const hasToken = !!getToken()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Ajustes</h2>

      <div className="rounded-2xl border p-4 space-y-2">
        <div className="text-sm text-gray-600">Sesión</div>
        <div className="text-sm">
          Estado:{" "}
          <span className={hasToken ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
            {hasToken ? "Logueado" : "Sin token"}
          </span>
        </div>

        <button
          onClick={onLogout}
          className="w-full rounded-xl p-3 bg-black text-white disabled:opacity-50"
          disabled={!hasToken}
        >
          Logout
        </button>

        <p className="text-xs text-gray-500">
          Esto borra el token local y vuelve a la pantalla de login.
        </p>
      </div>
    </div>
  )
}
