<script setup lang="ts">
import { usePublicSeo } from '../composables/usePublicSeo'
import HeroSection from '../home/sections/HeroSection.vue'
import ManifestoSection from '../home/sections/ManifestoSection.vue'
import CredibilitySection from '../home/sections/CredibilitySection.vue'
import HorizontalShowcaseSection from '../home/sections/HorizontalShowcaseSection.vue'
import ServicesSection from '../home/sections/ServicesSection.vue'
import FinalCtaSection from '../home/sections/FinalCtaSection.vue'
import HomeHeaderApp from '../components/headers/HomeHeaderApp.vue'
import '../styles/home.scss'

usePublicSeo(
  'CNC Beauty | Home editoriale tra trattamenti e prodotti',
  'Homepage in stile editoriale con percorso immersivo verso trattamenti e prodotti CNC Beauty.',
)

const year = new Date().getFullYear()
</script>

<template>
  <div class="home-page home-editorial">
    <a class="home-skip-link" href="#home-main">Salta al contenuto</a>

    <div class="home-editorial__grain" aria-hidden="true"></div>

    <HomeHeaderApp />

    <div id="home-main" class="home-editorial__main" tabindex="-1">
      <HeroSection />
      <ManifestoSection />
      <CredibilitySection />
      <HorizontalShowcaseSection />
      <ServicesSection />
      <FinalCtaSection />
    </div>

    <footer class="home-editorial__footer">
      <p>(c) {{ year }} CNC Beauty</p>
      <p>Editorial studio experience per percorsi beauty.</p>
    </footer>
  </div>
</template>
