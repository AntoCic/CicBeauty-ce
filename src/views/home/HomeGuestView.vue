<script setup lang="ts">
import { computed } from 'vue'
import { useScroll, useWindowSize } from '@vueuse/core'
import { usePublicSeo } from '../../composables/usePublicSeo'
import { useStructuredData } from '../../composables/useStructuredData'
import { usePrefersReducedMotion } from '../../home/composables/usePrefersReducedMotion'
import HeroSection from '../../home/sections/HeroSection.vue'
import ManifestoSection from '../../home/sections/ManifestoSection.vue'
import CredibilitySection from '../../home/sections/CredibilitySection.vue'
import HorizontalShowcaseSection from '../../home/sections/HorizontalShowcaseSection.vue'
import ServicesSection from '../../home/sections/ServicesSection.vue'
import FinalCtaSection from '../../home/sections/FinalCtaSection.vue'
import HomeHeaderApp from '../../components/headers/HomeHeaderApp.vue'
import LegalLinks from '../../components/LegalLinks.vue'
import { appConfigStore } from '../../stores/appConfigStore'
import { buildHomeContent } from '../../home/homeContent'
import '../../styles/home.scss'

const homeContent = computed(() => buildHomeContent(appConfigStore.getConfigData()))
const config = computed(() => appConfigStore.getConfigData())
const brandName = computed(() => String(config.value.brandName ?? 'CNC Beauty').trim() || 'CNC Beauty')
const officeAddress = computed(() => String(config.value.officeAddress ?? '').trim())
const publicPhone = computed(() => String(config.value.publicPhone ?? '').trim())
const privacyEmail = computed(() => String(config.value.privacyEmail ?? '').trim())
const servicesSummary = computed(() => homeContent.value.services.items.map((item) => item.title))
const localFaqItems = computed(() => [
  {
    question: `Dove si trova ${brandName.value}?`,
    answer: officeAddress.value || 'La sede è comunicata direttamente dal centro.',
  },
  {
    question: 'Come contattare il centro estetico?',
    answer: publicPhone.value
      ? `Telefono e WhatsApp: ${publicPhone.value}.`
      : 'Contatto disponibile nella sezione dedicata ai contatti.',
  },
  {
    question: 'Dove vedere listino prezzi e catalogo servizi?',
    answer: 'Nella pagina Prezzi, nel catalogo Trattamenti e nel catalogo Prodotti del sito.',
  },
])

usePublicSeo(
  computed(() => homeContent.value.seo.title),
  computed(() => homeContent.value.seo.description),
  {
    canonicalPath: '/',
  },
)

const homeStructuredData = computed(() => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'BeautySalon',
      '@id': `${window.location.origin}/#beautysalon`,
      name: brandName.value,
      url: `${window.location.origin}/`,
      telephone: publicPhone.value || undefined,
      email: privacyEmail.value || undefined,
      address: officeAddress.value
        ? {
          '@type': 'PostalAddress',
          streetAddress: officeAddress.value,
          addressCountry: 'IT',
        }
        : undefined,
    },
    {
      '@type': 'WebSite',
      '@id': `${window.location.origin}/#website`,
      name: brandName.value,
      url: `${window.location.origin}/`,
      inLanguage: 'it-IT',
    },
    {
      '@type': 'ItemList',
      name: 'Servizi principali del centro estetico',
      itemListElement: servicesSummary.value.map((name, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
      })),
    },
    {
      '@type': 'FAQPage',
      mainEntity: localFaqItems.value.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ],
}))

useStructuredData('home-business-schema', homeStructuredData)

const year = new Date().getFullYear()

const { y: scrollY } = useScroll(window, { behavior: 'auto' })
const { height: viewportHeight, width: viewportWidth } = useWindowSize()
const { isReducedMotion } = usePrefersReducedMotion()

const logoCycleProgress = computed(() => {
  const cyclePx = Math.max(3000, viewportHeight.value * 3.8)
  const rawProgress = scrollY.value / cyclePx
  return rawProgress - Math.floor(rawProgress)
})

const logoOnRight = computed(() => logoCycleProgress.value < 0.5)
const logoBgClass = computed(() => (logoOnRight.value ? 'is-right' : 'is-left'))

const logoBgStyle = computed(() => {
  if (isReducedMotion.value) {
    return {
      opacity: '0.06',
      transform: 'translate3d(0, 0, 0) scale(1)',
    }
  }

  const phase = logoOnRight.value
    ? logoCycleProgress.value / 0.5
    : (logoCycleProgress.value - 0.5) / 0.5
  const inOut = Math.sin(phase * Math.PI)
  const sideSign = logoOnRight.value ? 1 : -1
  const driftX = sideSign * (1 - inOut) * 30
  const floatY = Math.sin(logoCycleProgress.value * Math.PI * 4) * 9
  const scale = 0.97 + inOut * 0.05
  const maxOpacity = viewportWidth.value <= 880 ? 0.052 : 0.034
  const opacity = maxOpacity * Math.pow(inOut, 1.1)

  return {
    opacity: opacity.toFixed(3),
    transform: `translate3d(${driftX.toFixed(2)}vw, ${floatY.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`,
  }
})
</script>

<template>
  <div class="home-page home-editorial">
    <a class="home-skip-link" href="#home-main">{{ homeContent.header.skipLinkLabel }}</a>

    <div class="home-editorial__grain" aria-hidden="true"></div>

    <HomeHeaderApp :content="homeContent.header" />

    <img src="/img/logo/logo.png" alt="logo" class="logo-bg-home" :class="logoBgClass" :style="logoBgStyle">

    <div id="home-main" class="home-editorial__main" tabindex="-1">
      <HeroSection :content="homeContent.hero" />
      <ManifestoSection :content="homeContent.manifesto" />
      <CredibilitySection :content="homeContent.credibility" />
      <HorizontalShowcaseSection :content="homeContent.showcase" />
      <ServicesSection :content="homeContent.services" />
      <FinalCtaSection :content="homeContent.finalCta" />
    </div>

    <footer class="home-editorial__footer">
      <div class="home-footer__brand">
        <p class="home-footer__brand-name">{{ homeContent.footer.brandName }}</p>
        <p class="home-footer__tagline">{{ homeContent.footer.tagline }}</p>
      </div>

      <div class="home-footer__meta">
        <p class="home-footer__legal-line">{{ homeContent.footer.legalLine }}</p>
        <LegalLinks />
        <p class="home-footer__copy">&copy; {{ year }} {{ homeContent.footer.brandName }}. Tutti i diritti riservati.
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.home-editorial__footer {
  position: relative;
  z-index: 1;
  width: var(--home-shell);
  margin: 0 auto;
  padding: clamp(1rem, 2.1vw, 1.4rem) 0.1rem clamp(1.3rem, 3vw, 2.4rem);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: end;
  gap: clamp(0.8rem, 2vw, 1.6rem);
  border-top: 1px solid rgba(36, 29, 27, 0.14);
}

.home-footer__brand {
  max-width: 40ch;
}

.home-footer__brand-name {
  margin: 0;
  color: #3b252d;
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(1.35rem, 2.6vw, 2rem);
  line-height: 0.95;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.home-footer__tagline {
  margin: 0.5rem 0 0;
  color: var(--home-text-soft);
  font-size: 0.88rem;
  line-height: 1.62;
  max-width: 34ch;
}

.home-footer__meta {
  justify-self: end;
  max-width: 44ch;
  text-align: right;
  display: grid;
  gap: 0.55rem;
}

.home-footer__legal-line {
  margin: 0;
  color: rgba(72, 52, 46, 0.88);
  font-size: 0.79rem;
  line-height: 1.55;
}

.home-footer__copy {
  margin: 0;
  color: rgba(72, 52, 46, 0.78);
  font-size: 0.73rem;
  line-height: 1.42;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.home-footer__meta :deep(.legal-links) {
  justify-content: flex-end;
}

.logo-bg-home {
  position: fixed;
  top: clamp(10vh, 13vh, 16vh);
  width: min(70vw, 980px);
  opacity: 0.05;
  pointer-events: none;
  z-index: 0;
  mix-blend-mode: multiply;
  filter: grayscale(1) brightness(0.33) contrast(1.08) saturate(0.8);
  transform-origin: center;
  will-change: transform, opacity;
}

.logo-bg-home.is-right {
  right: -20%;
  left: auto;
}

.logo-bg-home.is-left {
  left: -20%;
  right: auto;
}

@media (max-width: 880px) {
  .logo-bg-home {
    top: clamp(13vh, 18vh, 24vh);
    width: min(92vw, 760px);
  }

  .logo-bg-home.is-right {
    right: -34%;
  }

  .logo-bg-home.is-left {
    left: -34%;
  }

  .home-editorial__footer {
    grid-template-columns: 1fr;
    gap: 0.9rem;
  }

  .home-footer__meta {
    justify-self: stretch;
    max-width: none;
    text-align: left;
  }

  .home-footer__meta :deep(.legal-links) {
    justify-content: flex-start;
  }
}
</style>
