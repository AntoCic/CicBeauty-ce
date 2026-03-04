<script setup lang="ts">
import SectionHeader from './SectionHeader.vue'
</script>

<template>
  <section class="immersive-band">
    <SectionHeader
      align="center"
      eyebrow="Atmosfera"
      title="Scorri e immagina la tua prossima visita"
      description="Una fascia narrativa con texture, luce e dettagli per dare profondita alla vetrina."
    />

    <div class="immersive-band__track">
      <article v-motion-slide-left class="immersive-band__card immersive-band__card--left">
        <p>Trattamenti viso e corpo</p>
      </article>
      <article v-motion-fade-up :delay="120" class="immersive-band__card immersive-band__card--center">
        <p>Cura professionale + benessere reale</p>
      </article>
      <article v-motion-slide-left :delay="180" class="immersive-band__card immersive-band__card--right">
        <p>Routine personalizzata anche a casa</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.immersive-band {
  position: relative;
  overflow: hidden;
  padding: clamp(1.2rem, 2.5vw, 2rem);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 2px;
  background:
    radial-gradient(circle at 20% 0%, rgba(232, 179, 190, 0.2), transparent 34%),
    radial-gradient(circle at 100% 100%, rgba(226, 205, 177, 0.26), transparent 40%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.75), rgba(246, 239, 243, 0.62));
  box-shadow: 0 14px 30px rgba(35, 20, 25, 0.11);
}

.immersive-band__track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(300px, 38vw);
  gap: 0.62rem;
  overflow-x: auto;
  padding-bottom: 0.22rem;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}

.immersive-band__card {
  min-height: clamp(160px, 24vw, 240px);
  border: 1px solid rgba(84, 44, 58, 0.16);
  border-radius: 2px;
  display: grid;
  align-content: end;
  padding: 0.82rem;
  background: rgba(255, 255, 255, 0.78);
  scroll-snap-align: start;
}

.immersive-band__card p {
  margin: 0;
  color: #442631;
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: clamp(1rem, 2vw, 1.4rem);
  line-height: 1.15;
}

.immersive-band__card--left {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.9)),
    url('/img/logo/bg-pattern.png') center/cover no-repeat;
}

.immersive-band__card--center {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.88)),
    url('/img/avatar/d.png') center/cover no-repeat;
}

.immersive-band__card--right {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.9)),
    url('/img/avatar/c.png') center/cover no-repeat;
}

@media (max-width: 991.98px) {
  .immersive-band__track {
    grid-auto-columns: minmax(78vw, 1fr);
  }
}
</style>
