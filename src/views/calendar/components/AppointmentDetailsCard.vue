<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    dateLabel: string
    timeLabel: string
    durationMinutes: number
    clientLabel: string
    operatorLabel: string
    treatmentsLabel: string
    couponLabel: string
    total?: number
    isPersonal?: boolean
    isPublic?: boolean
    notes?: string
    reminded?: boolean
  }>(),
  {
    total: 0,
    isPersonal: false,
    isPublic: false,
    notes: '',
    reminded: false,
  },
)

const notesText = computed(() =>
  String(props.notes ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim(),
)

const moneyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
})

const financialLabel = computed(() => {
  const total = Number(props.total ?? 0)
  if (!Number.isFinite(total) || total <= 0) return moneyFormatter.format(0)
  return moneyFormatter.format(total)
})
</script>

<template>
  <article class="card border-0 shadow-sm appointment-details-card">
    <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
      <div>
        <p class="appointment-details-card__title mb-1">Appuntamento</p>
        <p class="fw-semibold mb-0">{{ dateLabel }}</p>
        <p class="text-muted small mb-0">{{ timeLabel }} | {{ durationMinutes }} min</p>
      </div>

      <div v-if="$slots.actions" class="d-flex gap-2 flex-wrap justify-content-end">
        <slot name="actions" />
      </div>
    </div>

    <div class="row g-2 mt-1">
      <div class="col-12 col-md-6">
        <small class="text-muted d-block">Cliente</small>
        <span>{{ clientLabel }}</span>
      </div>
      <div class="col-12 col-md-6">
        <small class="text-muted d-block">Operatore principale</small>
        <span>{{ operatorLabel }}</span>
      </div>
      <div class="col-12 col-md-6">
        <small class="text-muted d-block">Trattamenti</small>
        <span>{{ treatmentsLabel }}</span>
      </div>
      <div class="col-12 col-md-6">
        <small class="text-muted d-block">Coupon</small>
        <span>{{ couponLabel }}</span>
      </div>
      <div class="col-12 col-md-6">
        <small class="text-muted d-block">Costi</small>
        <span>{{ financialLabel }}</span>
      </div>
      <div class="col-12 col-md-6">
        <small class="text-muted d-block">Tipo</small>
        <span>
          <span v-if="isPersonal" class="badge text-bg-secondary">{{ isPublic ? 'Personale pubblico' : 'Personale privato' }}</span>
          <span v-else class="badge text-bg-light border">Standard</span>
          <span class="ms-2">Promemoria: {{ reminded ? 'inviato' : 'non inviato' }}</span>
        </span>
      </div>
      <div class="col-12">
        <small class="text-muted d-block">Note</small>
        <span>{{ notesText || '-' }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
.appointment-details-card {
  padding: 0.85rem;
}

.appointment-details-card__title {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #5b3744;
}
</style>
