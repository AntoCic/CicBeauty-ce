<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  trustHints?: string[]
}>(), {
  trustHints: () => [
    'Professioniste certificate',
    'Consulenza personalizzata',
    'Protocolli igienici rigorosi',
  ],
})

const heroGallery = computed(() => [
  { id: 'hero-1', src: '/img/avatar/a.png', alt: 'Beauty room CNC 1' },
  { id: 'hero-2', src: '/img/avatar/b.png', alt: 'Beauty room CNC 2' },
  { id: 'hero-3', src: '/img/avatar/c.png', alt: 'Beauty room CNC 3' },
])
</script>

<template>
  <section id="hero" class="hero-section">
    <div class="hero-section__bg-shape hero-section__bg-shape--one"></div>
    <div class="hero-section__bg-shape hero-section__bg-shape--two"></div>

    <div class="hero-section__grid">
      <div class="hero-section__content">
        <p v-motion-fade-up class="hero-section__kicker">Boutique Beauty Experience</p>
        <h1 v-motion-fade-up :delay="80" class="hero-section__title">
          Rituali viso e corpo che uniscono precisione professionale e benessere profondo.
        </h1>
        <p v-motion-fade-up :delay="140" class="hero-section__subtitle">
          CNC Beauty ti accompagna in un percorso su misura: prima scegli la categoria, poi approfondisci ogni trattamento e prodotto con chiarezza.
        </p>

        <div v-motion-fade-up :delay="210" class="hero-section__cta">
          <RouterLink
            v-motion-hover-lift
            :to="{ name: 'TreatmentCategoriesView' }"
            class="hero-section__btn hero-section__btn--primary text-decoration-none"
          >
            Scopri trattamenti
          </RouterLink>
          <RouterLink
            v-motion-hover-lift
            :to="{ name: 'ProductCategoriesView' }"
            class="hero-section__btn hero-section__btn--secondary text-decoration-none"
          >
            Scopri prodotti
          </RouterLink>
        </div>

        <ul v-motion-fade-up :delay="260" class="hero-section__trust">
          <li v-for="hint in trustHints" :key="hint" class="hero-section__trust-item">
            <span class="material-symbols-outlined" aria-hidden="true">verified</span>
            {{ hint }}
          </li>
        </ul>
      </div>

      <aside v-motion-slide-left :delay="220" class="hero-section__media">
        <article class="hero-section__media-card hero-section__media-card--main">
          <img src="/img/logo/logo.png" alt="CNC Beauty logo" />
          <p>Percorso categoria -> dettaglio in 1-2 click</p>
        </article>

        <div class="hero-section__media-grid">
          <article
            v-for="(item, index) in heroGallery"
            :key="item.id"
            v-motion-scale-in
            :delay="260 + index * 60"
            class="hero-section__media-card"
          >
            <img :src="item.src" :alt="item.alt" loading="lazy" />
          </article>
        </div>
      </aside>
    </div>

    <a v-motion-fade-up :delay="330" href="#quick-access" class="hero-section__scroll-cue text-decoration-none">
      Scorri
      <span class="material-symbols-outlined" aria-hidden="true">south</span>
    </a>
  </section>
</template>

<style scoped>
.hero-section {
  position: relative;
  overflow: hidden;
  min-height: clamp(420px, 64vh, 680px);
  padding: clamp(1.7rem, 3.2vw, 3.3rem) clamp(1rem, 2.5vw, 2.3rem);
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 2px;
  background:
    radial-gradient(circle at 14% 18%, rgba(255, 255, 255, 0.8), transparent 52%),
    linear-gradient(125deg, rgba(252, 246, 248, 0.88), rgba(240, 228, 210, 0.7));
  box-shadow: 0 18px 34px rgba(43, 25, 31, 0.14);
}

.hero-section__grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: clamp(1rem, 2vw, 1.4rem);
  align-items: end;
}

.hero-section__bg-shape {
  position: absolute;
  pointer-events: none;
  border-radius: 999px;
  filter: blur(4px);
}

.hero-section__bg-shape--one {
  right: -120px;
  top: -130px;
  width: 340px;
  height: 340px;
  background: radial-gradient(circle, rgba(232, 179, 190, 0.44), rgba(232, 179, 190, 0.06));
}

.hero-section__bg-shape--two {
  right: 8%;
  bottom: -130px;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, rgba(226, 205, 177, 0.36), rgba(226, 205, 177, 0.06));
}

.hero-section__kicker {
  margin: 0 0 0.5rem;
  color: rgba(66, 35, 46, 0.76);
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 700;
}

.hero-section__title {
  margin: 0;
  color: #3f2130;
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: clamp(2.05rem, 4.8vw, 4.2rem);
  line-height: 1.12;
  text-wrap: balance;
}

.hero-section__subtitle {
  margin: clamp(0.7rem, 1.5vw, 1rem) 0 0;
  max-width: 66ch;
  color: rgba(51, 35, 41, 0.86);
  font-size: clamp(0.92rem, 1.45vw, 1.06rem);
  line-height: 1.75;
}

.hero-section__cta {
  margin-top: clamp(1rem, 2vw, 1.4rem);
  display: flex;
  flex-wrap: wrap;
  gap: 0.62rem;
}

.hero-section__btn {
  min-height: 44px;
  padding: 0 1rem;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
}

.hero-section__btn--primary {
  border: 1px solid rgba(84, 44, 58, 0.12);
  background: linear-gradient(120deg, #4f2b39, #6b3c4e);
  color: #fff8fb;
}

.hero-section__btn--secondary {
  border: 1px solid rgba(84, 44, 58, 0.26);
  background: rgba(255, 255, 255, 0.7);
  color: #422531;
}

.hero-section__trust {
  margin: 1.1rem 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.hero-section__trust-item {
  min-height: 30px;
  padding: 0 0.58rem;
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.68);
  color: #4b2a38;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  display: inline-flex;
  align-items: center;
  gap: 0.24rem;
}

.hero-section__trust-item .material-symbols-outlined {
  font-size: 1rem;
}

.hero-section__media {
  display: grid;
  gap: 0.56rem;
}

.hero-section__media-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.hero-section__media-card {
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  overflow: hidden;
  min-height: 88px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 9px 18px rgba(35, 20, 25, 0.12);
}

.hero-section__media-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-section__media-card--main {
  min-height: 170px;
  padding: 0.86rem;
  display: grid;
  gap: 0.4rem;
  place-items: center;
  text-align: center;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.76), rgba(250, 239, 232, 0.72));
}

.hero-section__media-card--main img {
  width: min(170px, 100%);
  height: auto;
  object-fit: contain;
}

.hero-section__media-card--main p {
  margin: 0;
  color: rgba(62, 37, 47, 0.82);
  font-size: 0.72rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-weight: 700;
}

.hero-section__scroll-cue {
  position: absolute;
  right: clamp(0.8rem, 2vw, 1.4rem);
  bottom: clamp(0.8rem, 2vw, 1.2rem);
  min-height: 34px;
  padding: 0 0.55rem;
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 2px;
  color: #4a2735;
  background: rgba(255, 255, 255, 0.72);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
}

.hero-section__scroll-cue .material-symbols-outlined {
  font-size: 1rem;
}

@media (max-width: 991.98px) {
  .hero-section {
    min-height: auto;
  }

  .hero-section__grid {
    grid-template-columns: 1fr;
  }

  .hero-section__media {
    order: 2;
  }
}

@media (max-width: 767.98px) {
  .hero-section {
    padding: 1.2rem 0.88rem 2.8rem;
  }

  .hero-section__cta {
    display: grid;
    grid-template-columns: 1fr;
  }

  .hero-section__btn {
    width: 100%;
  }

  .hero-section__media-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

