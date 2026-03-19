import { onBeforeUnmount, watchEffect, type MaybeRefOrGetter } from 'vue'

function resolveStructuredData(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed
  }
  if (value == null) return ''
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

export function useStructuredData(
  id: string,
  payload: MaybeRefOrGetter<unknown>,
) {
  let scriptTag: HTMLScriptElement | null = null

  watchEffect(() => {
    if (typeof document === 'undefined') return

    const normalizedId = String(id ?? '').trim()
    if (!normalizedId) return

    if (!scriptTag) {
      scriptTag = document.querySelector(`script[data-schema-id="${normalizedId}"]`) as HTMLScriptElement | null
      if (!scriptTag) {
        scriptTag = document.createElement('script')
        scriptTag.type = 'application/ld+json'
        scriptTag.setAttribute('data-schema-id', normalizedId)
        document.head.appendChild(scriptTag)
      }
    }

    const json = resolveStructuredData(typeof payload === 'function' ? payload() : payload)
    if (scriptTag) {
      scriptTag.textContent = json
    }
  })

  onBeforeUnmount(() => {
    if (!scriptTag) return
    scriptTag.remove()
    scriptTag = null
  })
}
