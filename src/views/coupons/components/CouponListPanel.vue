<script setup lang="ts">
import { Btn } from 'cic-kit'
import { computed, ref } from 'vue'
import { asDate } from '../../../utils/date'
import { couponDisplayTitle, couponUsageCount } from '../../../utils/couponUtils'

type CouponLike = {
  id: string
  code: string
  from: string
  note?: string
  client_id?: string
  valid_from?: unknown
  valid_to?: unknown
  updatedAt?: unknown
  trattamenti?: string[]
}

type ClientLike = {
  name?: string
  surname?: string
}

type TreatmentLike = {
  title?: string
}

const props = withDefaults(
  defineProps<{
    coupons: CouponLike[]
    clientsById: Map<string, ClientLike>
    treatmentsById: Map<string, TreatmentLike>
    usageByCouponId: Map<string, number>
    emptyText?: string
  }>(),
  {
    emptyText: 'Nessun coupon creato.',
  },
)

const emit = defineEmits<{
  (event: 'open', couponId: string): void
  (event: 'download', couponId: string): void
}>()

const search = ref('')

const filteredCoupons = computed(() => {
  const source = [...props.coupons].sort((a, b) => {
    const dateA = asDate(a.updatedAt)?.getTime() ?? 0
    const dateB = asDate(b.updatedAt)?.getTime() ?? 0
    return dateB - dateA
  })
  const term = String(search.value ?? '').toLocaleLowerCase().trim()
  if (!term) return source

  return source.filter((coupon) => {
    const recipient = clientLabel(coupon.client_id)
    const treatments = treatmentLabels(coupon).join(' ')
    const haystack = `${couponDisplayTitle(coupon)} ${recipient} ${treatments} ${coupon.note ?? ''}`.toLocaleLowerCase()
    return haystack.includes(term)
  })
})

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function formatDate(value: unknown) {
  const date = asDate(value)
  if (!date) return '-'
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function clientLabel(clientId: unknown) {
  const normalized = normalizeString(clientId)
  if (!normalized) return 'Cliente non assegnato'
  const client = props.clientsById.get(normalized)
  if (!client) return normalized
  return `${normalizeString(client.name)} ${normalizeString(client.surname)}`.trim() || normalized
}

function treatmentLabels(coupon: CouponLike) {
  const labels = (coupon.trattamenti ?? [])
    .map((id) => normalizeString(props.treatmentsById.get(id)?.title ?? id))
    .filter(Boolean)
  return labels
}

function usageLabel(coupon: CouponLike) {
  const used = couponUsageCount(coupon.id, props.usageByCouponId)
  return `${used}/1`
}

function notePreview(coupon: CouponLike) {
  const note = normalizeString(coupon.note)
  if (!note) return ''
  return note.length > 120 ? `${note.slice(0, 117)}...` : note
}
</script>

<template>
  <section class="card border-0 shadow-sm p-3">
    <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
      <p class="fw-semibold mb-0">Coupon creati</p>
      <input
        v-model="search"
        type="search"
        class="form-control form-control-sm coupon-search"
        placeholder="Cerca coupon, cliente o trattamento..."
      >
    </div>

    <div class="vstack gap-2">
      <article v-for="coupon in filteredCoupons" :key="coupon.id" class="coupon-row">
        <div class="coupon-row__main">
          <p class="coupon-row__title mb-1">{{ couponDisplayTitle(coupon) }}</p>
          <p class="small text-muted mb-1">
            Per: {{ clientLabel(coupon.client_id) }} | Uso: {{ usageLabel(coupon) }}
          </p>
          <p class="small text-muted mb-1">
            Validita: {{ formatDate(coupon.valid_from) }} - {{ formatDate(coupon.valid_to) }}
          </p>
          <p class="small text-muted mb-0">
            Trattamenti: {{ treatmentLabels(coupon).join(', ') || 'Nessuno' }}
          </p>
          <p v-if="notePreview(coupon)" class="small mb-0 mt-1">
            {{ notePreview(coupon) }}
          </p>
        </div>

        <div class="d-flex gap-2 flex-wrap">
          <Btn type="button" color="dark" variant="outline" icon="visibility" @click="emit('open', coupon.id)">
            Dettaglio
          </Btn>
          <Btn type="button" color="secondary" variant="outline" icon="download" @click="emit('download', coupon.id)">
            Scarica
          </Btn>
        </div>
      </article>

      <p v-if="!filteredCoupons.length" class="text-muted small mb-0">{{ emptyText }}</p>
    </div>
  </section>
</template>

<style scoped lang="scss">
.coupon-search {
  max-width: 360px;
}

.coupon-row {
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 0.62rem;
  padding: 0.7rem;
  background: rgba(255, 255, 255, 0.84);
  display: flex;
  justify-content: space-between;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.coupon-row__main {
  min-width: 0;
  flex: 1 1 280px;
}

.coupon-row__title {
  font-weight: 700;
  color: #422b34;
}
</style>
