<script setup lang="ts">
import SectionHeader from './SectionHeader.vue'

interface UspItem {
  icon: string
  title: string
  description: string
}

withDefaults(defineProps<{
  items?: UspItem[]
}>(), {
  items: () => [
    {
      icon: 'spa',
      title: 'Protocolli personalizzati',
      description: 'Ogni percorso nasce da una consulenza dedicata al tuo obiettivo estetico.',
    },
    {
      icon: 'health_and_safety',
      title: 'Standard igienici elevati',
      description: 'Ambienti, strumenti e procedure seguono routine professionali costanti.',
    },
    {
      icon: 'science',
      title: 'Prodotti selezionati',
      description: 'Scegliamo formulazioni affidabili per supportare i risultati nel tempo.',
    },
    {
      icon: 'workspace_premium',
      title: 'Esperienza premium accessibile',
      description: 'Accoglienza curata, tempi ottimizzati e attenzione reale alla tua esperienza.',
    },
  ],
})
</script>

<template>
  <section class="why-choose-us">
    <SectionHeader
      eyebrow="Perche Sceglierci"
      title="Fiducia costruita su metodo e costanza"
      description="Un approccio professionale, chiaro e umano: quello che serve per sentirti seguita in ogni fase."
    />

    <div class="why-choose-us__grid">
      <article
        v-for="(item, index) in items"
        :key="item.title"
        v-motion-scale-in
        :delay="index * 70"
        class="why-choose-us__card"
      >
        <div class="why-choose-us__icon-wrap">
          <span class="material-symbols-outlined why-choose-us__icon" aria-hidden="true">{{ item.icon }}</span>
        </div>
        <h3 class="why-choose-us__title">{{ item.title }}</h3>
        <p class="why-choose-us__description">{{ item.description }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.why-choose-us {
  padding: clamp(1rem, 2.2vw, 1.7rem);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  background: linear-gradient(130deg, rgba(255, 255, 255, 0.74), rgba(246, 239, 243, 0.58));
  box-shadow: 0 12px 26px rgba(36, 20, 26, 0.1);
}

.why-choose-us__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.72rem;
}

.why-choose-us__card {
  padding: 0.86rem;
  border: 1px solid rgba(84, 44, 58, 0.15);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.7);
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.why-choose-us__card:hover {
  transform: translate3d(0, -3px, 0);
  box-shadow: 0 10px 18px rgba(32, 19, 24, 0.12);
}

.why-choose-us__icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 2px;
  display: grid;
  place-items: center;
  background: linear-gradient(120deg, rgba(232, 179, 190, 0.54), rgba(226, 205, 177, 0.58));
  color: #462634;
}

.why-choose-us__icon {
  font-size: 1.2rem;
}

.why-choose-us__title {
  margin: 0.64rem 0 0;
  color: #422530;
  font-size: 0.96rem;
  font-weight: 700;
}

.why-choose-us__description {
  margin: 0.34rem 0 0;
  color: rgba(58, 36, 44, 0.82);
  font-size: 0.82rem;
  line-height: 1.55;
}
</style>
