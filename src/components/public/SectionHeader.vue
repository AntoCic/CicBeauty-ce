<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    title?: string
    description?: string
    align?: 'left' | 'center'
  }>(),
  {
    eyebrow: '',
    description: '',
    align: 'left',
  },
)
</script>

<template>
  <header class="section-header" :class="`section-header--${align}`">
    <p v-if="eyebrow" v-motion-fade-up class="section-header__eyebrow">{{ eyebrow }}</p>
    <h2 v-if="title" v-motion-fade-up :delay="80" class="section-header__title">{{ title }}</h2>
    <p v-if="description" v-motion-fade-up :delay="title ? 140 : 80" class="section-header__description">{{ description }}</p>
  </header>
</template>

<style scoped>
.section-header {
  display: grid;
  gap: 0.42rem;
  margin-bottom: clamp(0.6rem, 1.2vw, 0.9rem);
}

.section-header--center {
  text-align: center;
  justify-items: center;
}

.section-header__eyebrow {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(78, 43, 56, 0.68);
  font-weight: 700;
}

.section-header__title {
  margin: 0;
  color: #3f2230;
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: clamp(1.58rem, 3.7vw, 2.6rem);
  line-height: 1.1;
  letter-spacing: 0.01em;
}

.section-header__description {
  margin: 0;
  max-width: 72ch;
  color: rgba(43, 33, 38, 0.84);
  font-size: clamp(0.9rem, 1.4vw, 1rem);
  line-height: 1.7;
}

@media (max-width: 575.98px) {
  .section-header__description {
    max-width: 100%;
  }
}
</style>
