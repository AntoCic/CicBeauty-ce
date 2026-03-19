import { unref, watchEffect, type MaybeRefOrGetter } from 'vue'

const DEFAULT_TITLE = 'CNC Beauty'
const DEFAULT_DESCRIPTION = 'CNC Beauty: trattamenti estetici professionali, prodotti selezionati e consulenza personalizzata.'
const DEFAULT_OG_IMAGE = '/img/logo/logo.png'

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

function ensureMetaTagByProperty(property: string): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null
  let metaTag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!metaTag) {
    metaTag = document.createElement('meta')
    metaTag.setAttribute('property', property)
    document.head.appendChild(metaTag)
  }
  return metaTag
}

function ensureMetaTagByName(name: string): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null
  let metaTag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!metaTag) {
    metaTag = document.createElement('meta')
    metaTag.setAttribute('name', name)
    document.head.appendChild(metaTag)
  }
  return metaTag
}

function ensureCanonicalTag(): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null
  let linkTag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!linkTag) {
    linkTag = document.createElement('link')
    linkTag.setAttribute('rel', 'canonical')
    document.head.appendChild(linkTag)
  }
  return linkTag
}

export type PublicSeoOptions = {
  canonicalPath?: MaybeRefOrGetter<string | undefined>
  ogType?: MaybeRefOrGetter<string | undefined>
  ogImage?: MaybeRefOrGetter<string | undefined>
}

export function usePublicSeo(
  title: MaybeRefOrGetter<string | undefined>,
  description?: MaybeRefOrGetter<string | undefined>,
  options?: PublicSeoOptions,
) {
  watchEffect(() => {
    if (typeof document === 'undefined') return

    const resolvedTitle = String(unref(title) ?? '').trim()
    const titleValue = resolvedTitle || DEFAULT_TITLE
    document.title = titleValue

    const resolvedDescription = String(unref(description) ?? '').trim()
    const descriptionValue = resolvedDescription || DEFAULT_DESCRIPTION
    const metaTag = ensureMetaDescriptionTag()
    if (metaTag) {
      metaTag.setAttribute('content', descriptionValue)
    }

    const ogTitleTag = ensureMetaTagByProperty('og:title')
    if (ogTitleTag) {
      ogTitleTag.setAttribute('content', titleValue)
    }

    const ogDescriptionTag = ensureMetaTagByProperty('og:description')
    if (ogDescriptionTag) {
      ogDescriptionTag.setAttribute('content', descriptionValue)
    }

    const ogTypeTag = ensureMetaTagByProperty('og:type')
    if (ogTypeTag) {
      ogTypeTag.setAttribute('content', String(unref(options?.ogType) ?? '').trim() || 'website')
    }

    const ogImageTag = ensureMetaTagByProperty('og:image')
    if (ogImageTag) {
      const ogImagePath = String(unref(options?.ogImage) ?? '').trim() || DEFAULT_OG_IMAGE
      const ogImageUrl = ogImagePath.startsWith('http')
        ? ogImagePath
        : `${window.location.origin}${ogImagePath}`
      ogImageTag.setAttribute('content', ogImageUrl)
    }

    const twitterCardTag = ensureMetaTagByName('twitter:card')
    if (twitterCardTag) {
      twitterCardTag.setAttribute('content', 'summary_large_image')
    }
    const twitterTitleTag = ensureMetaTagByName('twitter:title')
    if (twitterTitleTag) {
      twitterTitleTag.setAttribute('content', titleValue)
    }
    const twitterDescriptionTag = ensureMetaTagByName('twitter:description')
    if (twitterDescriptionTag) {
      twitterDescriptionTag.setAttribute('content', descriptionValue)
    }

    const canonicalPath = String(unref(options?.canonicalPath) ?? '').trim()
    if (canonicalPath && typeof window !== 'undefined') {
      const canonicalTag = ensureCanonicalTag()
      if (canonicalTag) {
        canonicalTag.setAttribute('href', `${window.location.origin}${canonicalPath}`)
      }
    }
  })
}
