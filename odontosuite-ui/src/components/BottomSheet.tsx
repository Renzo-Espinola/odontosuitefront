// src/components/BottomSheet.tsx
import { useEffect } from "react"

export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-60">
      {/* overlay */}
      <div
        role="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      {/* sheet wrapper */}
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md pointer-events-none sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
        <div className="pointer-events-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-[0_-20px_60px_rgba(0,0,0,0.18)] max-h-[85vh] flex flex-col">
          <div className="px-4 pt-3 shrink-0">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-200" />
          </div>

          <div className="flex items-center justify-between px-4 pt-3 shrink-0">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>

          <div className="px-4 pb-5 pt-4 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  )
}
