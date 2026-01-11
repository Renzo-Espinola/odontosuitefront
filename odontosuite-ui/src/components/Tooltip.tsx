export function DayTooltip({
  summary,
  align = "left",
}: {
  summary: { count: number; completed: number; pending: number; cancelled: number; late: number }
  align?: "left" | "right"
}) {
  return (
    <div className="relative w-44 rounded-xl bg-gray-900 p-2 text-xs text-white shadow-lg">
      <div className="font-semibold">{summary.count} turno(s)</div>

      <ul className="mt-1 space-y-0.5">
        {summary.pending > 0 && <li>• {summary.pending} pendientes</li>}
        {summary.completed > 0 && <li>• {summary.completed} completados</li>}
        {summary.cancelled > 0 && <li>• {summary.cancelled} cancelados</li>}
        {summary.late > 0 && <li>• {summary.late} cargado tarde</li>}
      </ul>

      {/* Flecha: la movemos según alineación */}
      <div
        className={[
          "absolute top-full border-8 border-transparent border-t-gray-900",
          align === "right" ? "right-3" : "left-3",
        ].join(" ")}
      />
    </div>
  )
}
