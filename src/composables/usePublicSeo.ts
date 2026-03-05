import { unref, watchEffect, type MaybeRefOrGetter } from 'vue'

const DEFAULT_TITLE = 'CNC Beauty'
const DEFAULT_DESCRIPTION = 'CNC Beauty: trattamenti estetici professionali, prodotti selezionati e consulenza personalizzata.'

function ensureMetaDescriptionTag(): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null
  let metaTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
  if (!metaTag) {
    metaTag = document.createElement('meta')
    metaTag.setAttribute('name', 'description')
    document.head.appendChild(metaTag)
  }
  return metaTag
}

export function usePublicSeo(
  title: MaybeRefOrGetter<string | undefined>,
  description?: MaybeRefOrGetter<string | undefined>,
) {
  watchEffect(() => {
    if (typeof document === 'undefined') return

    const resolvedTitle = String(unref(title) ?? '').trim()
    document.title = resolvedTitle || DEFAULT_TITLE

    const resolvedDescription = String(unref(description) ?? '').trim()
    const metaTag = ensureMetaDescriptionTag()
    if (metaTag) {
      metaTag.setAttribute('content', resolvedDescription || DEFAULT_DESCRIPTION)
    }
  })
}
