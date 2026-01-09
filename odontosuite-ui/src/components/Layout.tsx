export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-(--clinic-blue)">OdontoSuite</h1>
          <span className="text-xs text-gray-500">Admin</span>
        </div>
      </header>

      {/* ✅ Contenedor de la app */}
      <div className="mx-auto max-w-md px-4">
        {children}
      </div>
    </div>
  )
}
