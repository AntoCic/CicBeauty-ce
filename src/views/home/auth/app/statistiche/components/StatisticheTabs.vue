<script setup lang="ts">
type StatsTab = 'guadagni' | 'clienti' | 'appuntamenti'

defineProps<{
  active: StatsTab
}>()

const tabs: Array<{ id: StatsTab; label: string; icon: string; routeName: string }> = [
  { id: 'guadagni', label: 'Guadagni', icon: 'payments', routeName: 'StatsGuadagniView' },
  { id: 'clienti', label: 'Clienti', icon: 'groups', routeName: 'StatsClientiView' },
  { id: 'appuntamenti', label: 'Appuntamenti', icon: 'calendar_month', routeName: 'StatsAppuntamentiView' },
]
</script>

<template>
  <section class="card border-0 shadow-sm p-2 mb-2 stats-tabs-card">
    <nav class="stats-tabs-nav" aria-label="Sezioni statistiche">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.id"
        :to="{ name: tab.routeName }"
        class="stats-tab-link text-decoration-none"
        :class="{ 'stats-tab-link--active': tab.id === active }"
      >
        <span class="material-symbols-outlined stats-tab-link__icon" aria-hidden="true">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </RouterLink>
    </nav>
  </section>
</template>

<style scoped lang="scss">
.stats-tabs-card {
  background:
    radial-gradient(circle at 0% 0%, rgba(84, 44, 58, 0.12) 0%, transparent 45%),
    linear-gradient(150deg, rgba(255, 255, 255, 0.97), rgba(248, 244, 245, 0.97));
}

.stats-tabs-nav {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
}

.stats-tab-link {
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 0.7rem;
  padding: 0.5rem 0.45rem;
  color: #4b2935;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  font-size: 0.78rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.85);
}

.stats-tab-link__icon {
  font-size: 1rem;
  line-height: 1;
}

.stats-tab-link--active {
  border-color: rgba(15, 81, 50, 0.45);
  background: rgba(25, 135, 84, 0.18);
  color: #0f5132;
}
</style>
