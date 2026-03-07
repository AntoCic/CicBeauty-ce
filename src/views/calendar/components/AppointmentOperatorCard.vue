<script setup lang="ts">
import { computed } from 'vue'

type OperatorCardData = {
  id: string
  name?: string
  surname?: string
  email?: string
}

const props = defineProps<{
  operatorId?: string
  operator?: OperatorCardData
}>()

const operatorName = computed(() => {
  if (!props.operator) return ''
  return `${props.operator.name ?? ''} ${props.operator.surname ?? ''}`.trim()
})

const operatorDisplayLabel = computed(() => {
  if (props.operator) {
    return operatorName.value || props.operator.email || props.operator.id
  }
  const fallbackId = String(props.operatorId ?? '').trim()
  return fallbackId || ''
})
</script>

<template>
  <article class="card border-0 shadow-sm appointment-operator-card h-100">
    <p class="appointment-operator-card__title mb-2">Operatore principale</p>

    <div v-if="operatorDisplayLabel" class="operator-primary-badge" title="Operatore principale">
      <span class="operator-primary-badge__dot" aria-hidden="true" />
      <span class="text-truncate">{{ operatorDisplayLabel }}</span>
    </div>
    <p v-else class="text-muted small mb-0">Operatore non assegnato.</p>
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

.operator-primary-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  max-width: 100%;
  border: 1px solid rgba(35, 68, 95, 0.22);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.86);
  padding: 0.32rem 0.56rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: #2f4258;
}

.operator-primary-badge__dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: #2e7d32;
  box-shadow: 0 0 0 1px rgba(46, 125, 50, 0.2);
  flex: 0 0 auto;
}
</style>
