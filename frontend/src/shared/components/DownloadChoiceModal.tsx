import { FileSpreadsheet, FileText, X } from "lucide-react"

export function DownloadChoiceModal({
  title,
  onClose,
  onDownloadPdf,
  onDownloadXlsx,
}: {
  title: string
  onClose: () => void
  onDownloadPdf: () => void | Promise<void>
  onDownloadXlsx: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-xl font-bold">{title}</h3>
        <div className="mt-6 space-y-3">
          <button
            onClick={onDownloadPdf}
            className="flex w-full items-center gap-3 rounded border px-4 py-3 font-semibold transition hover:border-red-400 hover:bg-red-50"
          >
            <FileText className="h-5 w-5 text-red-600" />
            Download PDF
          </button>
          <button
            onClick={onDownloadXlsx}
            className="flex w-full items-center gap-3 rounded border px-4 py-3 font-semibold transition hover:border-green-400 hover:bg-green-50"
          >
            <FileSpreadsheet className="h-5 w-5 text-green-700" />
            Download XLSX
          </button>
          <button
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded border px-4 py-3 font-semibold transition hover:bg-gray-50"
          >
            <X className="h-5 w-5 text-gray-600" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
