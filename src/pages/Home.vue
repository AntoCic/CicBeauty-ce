<script setup lang="ts">
import { computed } from 'vue'
import { usePublicSeo } from '../composables/usePublicSeo'
import HeroSection from '../home/sections/HeroSection.vue'
import ManifestoSection from '../home/sections/ManifestoSection.vue'
import CredibilitySection from '../home/sections/CredibilitySection.vue'
import HorizontalShowcaseSection from '../home/sections/HorizontalShowcaseSection.vue'
import ServicesSection from '../home/sections/ServicesSection.vue'
import FinalCtaSection from '../home/sections/FinalCtaSection.vue'
import HomeHeaderApp from '../components/headers/HomeHeaderApp.vue'
import LegalLinks from '../components/LegalLinks.vue'
import { appConfigStore } from '../stores/appConfigStore'
import { buildHomeContent } from '../home/homeContent'
import '../styles/home.scss'

const homeContent = computed(() => buildHomeContent(appConfigStore.getConfigData()))

usePublicSeo(
  computed(() => homeContent.value.seo.title),
  computed(() => homeContent.value.seo.description),
)

const year = new Date().getFullYear()
</script>

<template>
  <div class="home-page home-editorial">
    <a class="home-skip-link" href="#home-main">{{ homeContent.header.skipLinkLabel }}</a>

    <div class="home-editorial__grain" aria-hidden="true"></div>

    <HomeHeaderApp :content="homeContent.header" />

    <div id="home-main" class="home-editorial__main" tabindex="-1">
      <HeroSection :content="homeContent.hero" />
      <ManifestoSection :content="homeContent.manifesto" />
      <CredibilitySection :content="homeContent.credibility" />
      <HorizontalShowcaseSection :content="homeContent.showcase" />
      <ServicesSection :content="homeContent.services" />
      <FinalCtaSection :content="homeContent.finalCta" />
    </div>

    <footer class="home-editorial__footer">
      <p>(c) {{ year }} {{ homeContent.footer.brandName }}</p>
      <p>{{ homeContent.footer.tagline }}</p>
      <p>{{ homeContent.footer.legalLine }}</p>
      <LegalLinks />
    </footer>
  </div>
</template>
