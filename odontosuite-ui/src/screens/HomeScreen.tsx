export default function HomeScreen() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">
        Inicio
      </h2>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <p className="text-sm text-gray-500">Caja del día</p>
        <p className="mt-1 text-4xl font-bold text-(--clinic-blue)">$ 0</p>
        <p className="mt-2 text-xs text-gray-400">
          Última actualización: manual
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <p className="mb-3 text-sm font-medium text-gray-700">
          Resumen de hoy
        </p>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Ingresos</span>
          <span className="font-semibold text-green-600">$ 0</span>
        </div>

        <div className="mt-1 flex justify-between text-sm">
          <span className="text-gray-500">Egresos</span>
          <span className="font-semibold text-red-500">$ 0</span>
        </div>
      </section>
    </div>
  )
}
