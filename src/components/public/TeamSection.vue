<script setup lang="ts">
import SectionHeader from './SectionHeader.vue'
import type { TeamMember } from './types'

withDefaults(defineProps<{
  members?: TeamMember[]
}>(), {
  members: () => [
    {
      id: 'team-1',
      name: 'Carla',
      role: 'Skin Specialist',
      bio: 'Consulenza e protocolli viso su misura.',
      imageUrl: '/img/avatar/a.png',
    },
    {
      id: 'team-2',
      name: 'Marta',
      role: 'Body Specialist',
      bio: 'Trattamenti corpo e percorsi rimodellanti.',
      imageUrl: '/img/avatar/b.png',
    },
    {
      id: 'team-3',
      name: 'Giada',
      role: 'Beauty Advisor',
      bio: 'Routine domiciliare e guida prodotti.',
      imageUrl: '/img/avatar/c.png',
    },
  ],
})
</script>

<template>
  <section class="team-section">
    <SectionHeader
      eyebrow="Team"
      title="Professioniste che ti seguono davvero"
      description="Competenze complementari per offrire un percorso coerente, dal trattamento in cabina alla routine a casa."
    />

    <div class="team-section__grid">
      <article
        v-for="(member, index) in members"
        :key="member.id"
        v-motion-hover-lift
        :delay="index * 70"
        class="team-section__card"
      >
        <img v-if="member.imageUrl" :src="member.imageUrl" :alt="member.name" class="team-section__avatar" loading="lazy" />
        <div v-else class="team-section__avatar team-section__avatar--placeholder">
          {{ member.name.slice(0, 1) }}
        </div>

        <h3 class="team-section__name">{{ member.name }}</h3>
        <p class="team-section__role">{{ member.role }}</p>
        <p class="team-section__bio">{{ member.bio }}</p>
      </article>
    </div>

    <div class="team-section__footer">
      <RouterLink v-motion-tap-scale :to="{ name: 'TreatmentCategoriesView' }" class="team-section__cta text-decoration-none">
        Esplora trattamenti
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.team-section {
  padding: clamp(1rem, 2.2vw, 1.7rem);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 2px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.76), rgba(247, 241, 242, 0.6));
  box-shadow: 0 12px 26px rgba(36, 20, 26, 0.1);
}

.team-section__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.66rem;
}

.team-section__card {
  padding: 0.86rem;
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.78);
  text-align: center;
}

.team-section__avatar {
  width: 82px;
  height: 82px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(84, 44, 58, 0.14);
}

.team-section__avatar--placeholder {
  display: inline-grid;
  place-items: center;
  color: #4b2935;
  font-size: 1.3rem;
  font-weight: 700;
  background: linear-gradient(120deg, rgba(232, 179, 190, 0.46), rgba(226, 205, 177, 0.52));
}

.team-section__name {
  margin: 0.65rem 0 0;
  color: #41242f;
  font-size: 1rem;
  font-weight: 700;
}

.team-section__role {
  margin: 0.15rem 0 0;
  color: rgba(63, 36, 47, 0.74);
  font-size: 0.76rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
}

.team-section__bio {
  margin: 0.5rem 0 0;
  color: rgba(58, 36, 44, 0.84);
  font-size: 0.82rem;
  line-height: 1.55;
}

.team-section__footer {
  margin-top: 0.86rem;
}

.team-section__cta {
  min-height: 40px;
  padding: 0 0.9rem;
  border-radius: 2px;
  border: 1px solid rgba(84, 44, 58, 0.24);
  background: rgba(255, 255, 255, 0.78);
  color: #462634;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}
</style>
