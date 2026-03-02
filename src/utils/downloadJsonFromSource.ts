export interface JsonExportEnvelope<TData> {
  version: 1
  source: string
  exportedAt: string
  data: TData
}

type DownloadJsonOptions = {
  filePrefix?: string
}

function dateSegment(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

function fileSafeToken(value: string) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export'
}

export function downloadJsonFromSource<TData>(
  source: string,
  getData: () => TData,
  options: DownloadJsonOptions = {},
): JsonExportEnvelope<TData> {
  const now = new Date()
  const payload: JsonExportEnvelope<TData> = {
    version: 1,
    source: String(source ?? '').trim() || 'source',
    exportedAt: now.toISOString(),
    data: getData(),
  }

  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const anchor = document.createElement('a')
    const prefix = fileSafeToken(options.filePrefix ?? 'catalog-export')
    const sourceToken = fileSafeToken(payload.source)
    anchor.href = url
    anchor.download = `${prefix}-${sourceToken}-${dateSegment(now)}.json`
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  } finally {
    URL.revokeObjectURL(url)
  }

  return payload
}
