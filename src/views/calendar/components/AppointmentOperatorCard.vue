<script setup lang="ts">
import { computed } from 'vue'

type OperatorCardData = {
  id: string
  name?: string
  surname?: string
  email?: string
  phoneNumber?: unknown
  description?: string
}

const props = defineProps<{
  operatorId?: string
  operator?: OperatorCardData
}>()

const operatorName = computed(() => {
  if (!props.operator) return ''
  return `${props.operator.name ?? ''} ${props.operator.surname ?? ''}`.trim()
})

const operatorPhoneLabel = computed(() => {
  if (!props.operator) return '-'
  const phone = props.operator.phoneNumber
  if (typeof phone === 'string') return phone || '-'
  if (Array.isArray(phone) && phone.length >= 2) {
    return `${String(phone[0] ?? '').trim()} ${String(phone[1] ?? '').trim()}`.trim() || '-'
  }
  return '-'
})
</script>

<template>
  <article class="card border-0 shadow-sm appointment-operator-card h-100">
    <p class="appointment-operator-card__title mb-1">Operatore principale</p>

    <template v-if="operator">
      <p class="fw-semibold mb-0">{{ operatorName || operator.email || operator.id }}</p>
      <p class="text-muted small mb-0">ID: {{ operator.id }}</p>

      <div class="row g-2 mt-1">
        <div class="col-12 col-sm-6">
          <small class="text-muted d-block">Email</small>
          <span class="text-break">{{ operator.email || '-' }}</span>
        </div>
        <div class="col-12 col-sm-6">
          <small class="text-muted d-block">Telefono</small>
          <span>{{ operatorPhoneLabel }}</span>
        </div>
        <div class="col-12">
          <small class="text-muted d-block">Descrizione</small>
          <span>{{ operator.description || '-' }}</span>
        </div>
      </div>
    </template>

    <template v-else>
      <p class="text-muted small mb-0">Operatore non trovato in `publicUsers`.</p>
      <p v-if="operatorId" class="small mb-0">ID richiesto: <span class="text-break">{{ operatorId }}</span></p>
    </template>
  </article>
</template>

<style scoped lang="scss">
.appointment-operator-card {
  padding: 0.85rem;
}

.appointment-operator-card__title {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #2f4258;
}
</style>
