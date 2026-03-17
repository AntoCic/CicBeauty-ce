<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    dateLabel: string
    timeLabel: string
    durationMinutes: number
    clientLabel: string
    clientPath?: string
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
    clientPath: '',
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
        <p class="appointment-details-card__headline mb-0">{{ dateLabel }}</p>
        <p class="appointment-details-card__subline mb-0">{{ timeLabel }} | {{ durationMinutes }} min</p>
      </div>

      <div v-if="$slots.actions" class="d-flex gap-2 flex-wrap justify-content-end">
        <slot name="actions" />
      </div>
    </div>

    <div class="row g-2 mt-2">
      <div class="col-12 col-md-6">
        <div class="appointment-details-card__item">
          <small class="text-muted d-block">Cliente</small>
          <router-link v-if="clientPath" :to="clientPath" class="appointment-details-card__client-link">
            {{ clientLabel }}
            <span class="material-symbols-outlined appointment-details-card__client-icon" aria-hidden="true">arrow_outward</span>
          </router-link>
          <span v-else>{{ clientLabel }}</span>
        </div>
      </div>
      <div class="col-12 col-md-6">
        <div class="appointment-details-card__item">
          <small class="text-muted d-block">Operatore principale</small>
          <span>{{ operatorLabel }}</span>
        </div>
      </div>
      <div class="col-12 col-md-6">
        <div class="appointment-details-card__item">
          <small class="text-muted d-block">Trattamenti</small>
          <span>{{ treatmentsLabel }}</span>
        </div>
      </div>
      <div class="col-12 col-md-6">
        <div class="appointment-details-card__item">
          <small class="text-muted d-block">Coupon</small>
          <span>{{ couponLabel }}</span>
        </div>
      </div>
      <div class="col-12 col-md-6">
        <div class="appointment-details-card__item">
          <small class="text-muted d-block">Prezzo</small>
          <span>{{ financialLabel }}</span>
        </div>
      </div>
      <div class="col-12 col-md-6">
        <div class="appointment-details-card__item">
          <small class="text-muted d-block">Tipo</small>
          <span>
            <span v-if="isPersonal" class="badge text-bg-secondary">{{ isPublic ? 'Personale pubblico' : 'Personale privato' }}</span>
            <span v-else class="badge text-bg-light border">Standard</span>
            <span class="ms-2">Promemoria: {{ reminded ? 'inviato' : 'non inviato' }}</span>
          </span>
        </div>
      </div>
      <div class="col-12">
        <div class="appointment-details-card__item">
          <small class="text-muted d-block">Note</small>
          <span>{{ notesText || '-' }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
.appointment-details-card {
  padding: 1rem;
  border-radius: 0.9rem;
  background:
    radial-gradient(circle at 12% 12%, rgba(232, 179, 190, 0.18) 0%, transparent 58%),
    linear-gradient(164deg, rgba(255, 255, 255, 0.96) 0%, rgba(251, 247, 248, 0.92) 100%);
}

.appointment-details-card__title {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #5b3744;
}

.appointment-details-card__headline {
  font-size: 1rem;
  font-weight: 700;
  color: #35242c;
  line-height: 1.25;
}

.appointment-details-card__subline {
  margin-top: 0.14rem;
  font-size: 0.8rem;
  color: #6a5960;
}

.appointment-details-card__item {
  border: 1px solid rgba(84, 44, 58, 0.12);
  border-radius: 0.56rem;
  background: rgba(255, 255, 255, 0.82);
  padding: 0.45rem 0.56rem;
  min-height: 100%;
}

.appointment-details-card__client-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #23445f;
  font-weight: 600;
  text-decoration: none;
}

.appointment-details-card__client-link:hover {
  text-decoration: underline;
}

.appointment-details-card__client-link:focus-visible {
  outline: 2px solid rgba(35, 68, 95, 0.35);
  outline-offset: 2px;
  border-radius: 0.2rem;
}

.appointment-details-card__client-icon {
  font-size: 0.9rem;
  line-height: 1;
}
</style>
