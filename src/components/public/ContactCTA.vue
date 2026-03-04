<script setup lang="ts">
import { computed } from 'vue'
import SectionHeader from './SectionHeader.vue'

const props = withDefaults(defineProps<{
  brandName?: string
  address: string
  email: string
  dayStart: string
  breakStart: string
  breakEnd: string
  dayEnd: string
  workingDays?: number[]
}>(), {
  brandName: 'CNC Beauty',
  workingDays: () => [1, 2, 3, 4, 5, 6],
})

const dayLabelMap: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Gio',
  5: 'Ven',
  6: 'Sab',
  7: 'Dom',
}

const mapsUrl = computed(() => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.address)}`)
const workingDaysLabel = computed(() =>
  props.workingDays
    .map((day) => dayLabelMap[day] ?? '')
    .filter(Boolean)
    .join(' | '),
)
const slotLabel = computed(() => `${props.dayStart} - ${props.dayEnd}`)
</script>

<template>
  <section class="contact-cta">
    <SectionHeader
      eyebrow="Contatti"
      title="Prenota la tua consulenza"
      description="Scrivici per definire il percorso migliore. Ti guidiamo dalla categoria alla scelta finale."
    />

    <div class="contact-cta__grid">
      <div v-motion-fade-up class="contact-cta__card">
        <h3 class="contact-cta__card-title">{{ brandName }}</h3>
        <p class="contact-cta__text">{{ address }}</p>
        <a v-motion-tap-scale :href="mapsUrl" target="_blank" rel="noopener noreferrer" class="contact-cta__link">
          Apri mappa
        </a>
      </div>

      <div v-motion-fade-up :delay="90" class="contact-cta__card">
        <h3 class="contact-cta__card-title">Orari</h3>
        <p class="contact-cta__text">{{ workingDaysLabel }}</p>
        <p class="contact-cta__text">{{ slotLabel }}</p>
      </div>

      <div v-motion-fade-up :delay="160" class="contact-cta__card">
        <h3 class="contact-cta__card-title">Contatto rapido</h3>
        <a v-motion-tap-scale :href="`mailto:${email}`" class="contact-cta__link">{{ email }}</a>
      </div>
    </div>

    <div v-motion-fade-up :delay="220" class="contact-cta__actions">
      <RouterLink v-motion-hover-lift :to="{ name: 'AiBeautyChatView' }" class="contact-cta__btn contact-cta__btn--primary text-decoration-none">
        Prenota
      </RouterLink>
      <RouterLink v-motion-hover-lift :to="{ name: 'TreatmentCategoriesView' }" class="contact-cta__btn contact-cta__btn--secondary text-decoration-none">
        Scopri trattamenti
      </RouterLink>
      <RouterLink v-motion-hover-lift :to="{ name: 'ProductCategoriesView' }" class="contact-cta__btn contact-cta__btn--secondary text-decoration-none">
        Scopri prodotti
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.contact-cta {
  padding: clamp(1rem, 2.4vw, 1.8rem);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.74), rgba(245, 238, 229, 0.58));
  box-shadow: 0 14px 30px rgba(35, 20, 25, 0.12);
}

.contact-cta__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.72rem;
}

.contact-cta__card {
  padding: 0.88rem;
  border: 1px solid rgba(84, 44, 58, 0.16);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.8);
  display: grid;
  gap: 0.32rem;
}

.contact-cta__card-title {
  margin: 0;
  color: #422531;
  font-size: 0.92rem;
  font-weight: 700;
}

.contact-cta__text {
  margin: 0;
  color: rgba(58, 36, 44, 0.84);
  font-size: 0.82rem;
  line-height: 1.56;
}

.contact-cta__link {
  color: #422531;
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
  text-decoration: none;
  width: fit-content;
  border-bottom: 1px solid rgba(66, 37, 49, 0.25);
}

.contact-cta__actions {
  margin-top: 0.9rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.contact-cta__btn {
  min-height: 42px;
  padding: 0 0.9rem;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
}

.contact-cta__btn--primary {
  border: 1px solid rgba(84, 44, 58, 0.1);
  color: #fff8fb;
  background: linear-gradient(120deg, #4f2b39, #6a3c4f);
}

.contact-cta__btn--secondary {
  border: 1px solid rgba(84, 44, 58, 0.2);
  color: #442631;
  background: rgba(255, 255, 255, 0.75);
}

@media (max-width: 575.98px) {
  .contact-cta__actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .contact-cta__btn {
    width: 100%;
  }
}
</style>
