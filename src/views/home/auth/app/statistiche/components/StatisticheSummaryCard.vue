<script setup lang="ts">
import { formatCurrency } from '../statisticheUtils'
import type { StatisticheSummary } from '../useStatisticheBase'

defineProps<{
  summary: StatisticheSummary
}>()
</script>

<template>
  <section class="card border-0 shadow-sm p-3 mb-2 stats-summary-card">
    <p class="small text-muted mb-2">Riepilogo su appuntamenti filtrati</p>

    <div class="stats-summary-grid stats-summary-grid--top mb-2">
      <article class="stats-summary-metric stats-summary-metric--violet">
        <p class="stats-summary-metric__label">Appuntamenti filtrati</p>
        <strong class="stats-summary-metric__value">{{ summary.filteredAppointments }}</strong>
      </article>

      <article class="stats-summary-metric stats-summary-metric--green">
        <p class="stats-summary-metric__label">Guadagno filtrato</p>
        <strong class="stats-summary-metric__value">{{ formatCurrency(summary.filteredRevenue) }}</strong>
      </article>
    </div>

    <div v-if="summary.openRangeMetrics" class="stats-summary-grid">
      <article class="stats-summary-metric stats-summary-metric--blue">
        <p class="stats-summary-metric__label">Oggi (appuntamenti / guadagno)</p>
        <strong class="stats-summary-metric__value">
          {{ summary.openRangeMetrics.today.appointments }} / {{ formatCurrency(summary.openRangeMetrics.today.revenue) }}
        </strong>
      </article>

      <article class="stats-summary-metric stats-summary-metric--amber">
        <p class="stats-summary-metric__label">Settimana corrente fino a oggi</p>
        <strong class="stats-summary-metric__value">
          {{ summary.openRangeMetrics.weekToDate.appointments }} / {{ formatCurrency(summary.openRangeMetrics.weekToDate.revenue) }}
        </strong>
      </article>

      <article class="stats-summary-metric stats-summary-metric--rose">
        <p class="stats-summary-metric__label">Mese corrente fino a oggi</p>
        <strong class="stats-summary-metric__value">
          {{ summary.openRangeMetrics.monthToDate.appointments }} / {{ formatCurrency(summary.openRangeMetrics.monthToDate.revenue) }}
        </strong>
      </article>

      <article class="stats-summary-metric stats-summary-metric--slate">
        <p class="stats-summary-metric__label">Guadagno mese scorso (intero mese)</p>
        <strong class="stats-summary-metric__value">
          {{ formatCurrency(summary.openRangeMetrics.previousMonthRevenue) }}
        </strong>
      </article>

      <article class="stats-summary-metric stats-summary-metric--teal">
        <p class="stats-summary-metric__label">Guadagno mese corrente (fino a fine mese)</p>
        <strong class="stats-summary-metric__value">
          {{ formatCurrency(summary.openRangeMetrics.currentMonthToEndRevenue) }}
        </strong>
      </article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.stats-summary-card {
  background:
    radial-gradient(circle at 100% 0%, rgba(25, 135, 84, 0.14) 0%, transparent 45%),
    radial-gradient(circle at 0% 100%, rgba(84, 44, 58, 0.14) 0%, transparent 45%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 245, 246, 0.96) 100%);
}

.stats-summary-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.45rem;
}

.stats-summary-grid--top {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stats-summary-metric {
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 0.72rem;
  padding: 0.55rem 0.62rem;
  background: rgba(255, 255, 255, 0.85);
}

.stats-summary-metric__label {
  margin: 0;
  font-size: 0.69rem;
  color: rgba(84, 44, 58, 0.84);
}

.stats-summary-metric__value {
  display: block;
  margin-top: 0.08rem;
  font-size: 0.84rem;
}

.stats-summary-metric--violet {
  border-color: rgba(84, 44, 58, 0.28);
}

.stats-summary-metric--green {
  border-color: rgba(15, 81, 50, 0.28);
}

.stats-summary-metric--blue {
  border-color: rgba(3, 105, 161, 0.28);
}

.stats-summary-metric--amber {
  border-color: rgba(146, 90, 9, 0.35);
}

.stats-summary-metric--rose {
  border-color: rgba(190, 24, 93, 0.25);
}

.stats-summary-metric--slate {
  border-color: rgba(30, 41, 59, 0.28);
}

.stats-summary-metric--teal {
  border-color: rgba(13, 148, 136, 0.3);
}

@media (max-width: 575.98px) {
  .stats-summary-grid--top {
    grid-template-columns: 1fr;
  }
}
</style>
