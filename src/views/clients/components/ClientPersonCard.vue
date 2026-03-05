<script setup lang="ts">
import { computed } from 'vue'
import { asDate } from '../../../utils/date'

const props = withDefaults(
  defineProps<{
    name: string
    surname: string
    gender?: string
    phoneNumber?: string
    email?: string
    birthdate?: string
    note?: string
    compact?: boolean
    showDetails?: boolean
  }>(),
  {
    compact: false,
    showDetails: false,
  },
)

const fullName = computed(() => `${props.name} ${props.surname}`.trim())

const phoneText = computed(() => String(props.phoneNumber ?? '').trim())
const emailText = computed(() => String(props.email ?? '').trim())

const normalizedGender = computed(() => {
  const value = String(props.gender ?? '').toLowerCase().trim()
  if (value === 'f' || value === 'm' || value === 'o') return value
  return ''
})

const genderEmoji = computed(() => {
  if (normalizedGender.value === 'f') return '\u2640\uFE0F'
  if (normalizedGender.value === 'm') return '\u2642\uFE0F'
  if (normalizedGender.value === 'o') return '\u{1F9D1}'
  return ''
})

const birthdateLabel = computed(() => {
  const date = asDate(props.birthdate)
  if (!date) return ''
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
  })
})

const noteText = computed(() =>
  String(props.note ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim(),
)

const compactNote = computed(() => {
  if (!noteText.value) return ''
  return noteText.value.length > 64 ? `${noteText.value.slice(0, 61)}...` : noteText.value
})
</script>

<template>
  <article class="card shadow-sm client-person-card" :class="{ 'client-person-card--compact': compact }">
    <div
      class="client-person-card__header"
      :class="{
        'client-person-card__header--compact-extra': compact && !showDetails && $slots.default,
        'client-person-card__header--details': showDetails,
      }"
    >
      <div class="client-person-card__identity min-w-0">
        <p class="client-person-card__name mb-0">
          <span class="client-person-card__name-text text-truncate">{{ fullName || 'Cliente senza nome' }}</span>
          <span v-if="showDetails && genderEmoji" class="client-person-card__gender">{{ genderEmoji }}</span>
        </p>
        <p v-if="showDetails && birthdateLabel" class="client-person-card__sub mb-0">{{ birthdateLabel }}</p>
        <p v-if="compact && !showDetails && phoneText" class="client-person-card__meta mb-0 text-truncate">{{ phoneText }}</p>
        <p v-if="compact && !showDetails && compactNote" class="client-person-card__meta mb-0 text-truncate">{{ compactNote }}</p>
      </div>

      <div v-if="compact && !showDetails && $slots.default" class="client-person-card__compact-extra">
        <slot />
      </div>

      <div v-if="$slots.actions" class="client-person-card__actions d-flex gap-2 flex-wrap justify-content-end">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="showDetails" class="client-person-card__details">
      <p v-if="phoneText || emailText" class="client-person-card__contact mb-0">
        <span v-if="phoneText" class="client-person-card__inline-item">{{ phoneText }}</span>
        <span v-if="phoneText && emailText" class="client-person-card__dot" aria-hidden="true">&#x2022;</span>
        <span v-if="emailText" class="client-person-card__inline-item text-break">{{ emailText }}</span>
      </p>
      <p v-if="noteText" class="client-person-card__note-detail mb-0">{{ noteText }}</p>
    </div>

    <div v-if="$slots.default && !(compact && !showDetails)" class="mt-2">
      <slot />
    </div>
  </article>
</template>

<style scoped lang="scss">
.client-person-card {
  padding: 0.72rem 0.78rem;
  border: 1px solid rgba(84, 44, 58, 0.12);
  border-radius: 0.75rem;
  background: linear-gradient(180deg, #ffffff 0%, #fffafc 100%);
}

.client-person-card--compact {
  padding: 0.62rem 0.7rem;
}

.client-person-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.72rem;
}

.client-person-card__header--compact-extra {
  align-items: flex-end;
}

.client-person-card__header--details {
  align-items: center;
}

.client-person-card__identity {
  display: grid;
  gap: 0.08rem;
}

.client-person-card__name {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #3d232c;
}

.client-person-card__name-text {
  min-width: 0;
}

.client-person-card__gender {
  font-size: 0.88rem;
  line-height: 1;
  flex-shrink: 0;
}

.client-person-card__sub {
  font-size: 0.72rem;
  line-height: 1.2;
  color: #725663;
}

.client-person-card__meta {
  font-size: 0.71rem;
  line-height: 1.2;
  color: #6a4a57;
}

.client-person-card__compact-extra {
  min-width: 10.8rem;
  max-width: 14rem;
  flex-shrink: 0;
  text-align: right;
}

.client-person-card__actions {
  align-items: center;
  flex-shrink: 0;
}

.client-person-card__details {
  margin-top: 0.36rem;
  display: grid;
  gap: 0.3rem;
}

.client-person-card__contact {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.26rem;
  font-size: 0.74rem;
  line-height: 1.2;
  color: #4a2f3a;
}

.client-person-card__inline-item {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.client-person-card__dot {
  color: rgba(74, 47, 58, 0.54);
}

.client-person-card__note-detail {
  font-size: 0.73rem;
  line-height: 1.28;
  color: #5f414f;
}

.min-w-0 {
  min-width: 0;
}
</style>
