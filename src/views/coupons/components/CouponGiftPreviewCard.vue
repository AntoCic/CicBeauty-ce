<script setup lang="ts">
import { computed } from 'vue'
import type { AppConfigData } from '../../../models/AppConfig'
import type { Coupon } from '../../../models/Coupon'
import { asDate } from '../../../utils/date'
import { resolveCouponContactInfo } from '../../../utils/couponUtils'

const props = withDefaults(
  defineProps<{
    coupon: Pick<Coupon, 'code' | 'from' | 'note' | 'valid_from' | 'valid_to'>
    clientLabel?: string
    treatmentLabels?: string[]
    appConfig: AppConfigData
  }>(),
  {
    clientLabel: '',
    treatmentLabels: () => [],
  },
)

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

const contact = computed(() => resolveCouponContactInfo(props.appConfig))
const fromLabel = computed(() => normalizeString(props.coupon.from) || 'Una persona speciale')
const clientName = computed(() => normalizeString(props.clientLabel) || 'Cliente CNC Beauty')
const message = computed(() => normalizeString(props.coupon.note))
</script>

<template>
  <article class="gift-coupon-shell">
    <div class="gift-coupon-shell__frame">
      <div class="gift-coupon-card">
        <header class="gift-coupon-card__header">
          <img src="/img/logo/logo-bk.png" alt="Logo CNC Beauty" class="gift-coupon-card__logo">
          <p class="gift-coupon-card__kicker mb-0">Coupon Regalo Personale</p>
        </header>

        <section class="gift-coupon-card__content">
          <h2 class="gift-coupon-card__title mb-1">Un dono di benessere per te ✨</h2>
          <p class="gift-coupon-card__subtitle mb-3">
            Creato con affetto da <strong>{{ fromLabel }}</strong> per <strong>{{ clientName }}</strong> 💝
          </p>

          <div class="gift-coupon-card__grid">
            <p class="mb-1"><span class="gift-coupon-card__label">Codice:</span> {{ normalizeString(coupon.code) || '-' }}</p>
            <p class="mb-1">
              <span class="gift-coupon-card__label">Validita:</span>
              {{ formatDate(coupon.valid_from) }} - {{ formatDate(coupon.valid_to) }}
            </p>
            <p class="mb-1"><span class="gift-coupon-card__label">Uso massimo:</span> 1 volta</p>
          </div>

          <div class="gift-coupon-card__treatments mt-2">
            <p class="gift-coupon-card__label mb-1">Trattamenti inclusi</p>
            <ul class="gift-coupon-card__list mb-0">
              <li v-for="(treatment, index) in treatmentLabels" :key="`${treatment}-${index}`">{{ treatment }}</li>
              <li v-if="!treatmentLabels.length">Nessun trattamento selezionato</li>
            </ul>
          </div>

          <p v-if="message" class="gift-coupon-card__message mt-3 mb-0">
            “{{ message }}”
          </p>
        </section>

        <footer class="gift-coupon-card__footer">
          <p class="mb-1"><strong>{{ contact.ownerName }}</strong></p>
          <p class="mb-1">{{ contact.officeAddress }}</p>
          <p class="mb-0">📞 {{ contact.publicPhone }}</p>
        </footer>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
.gift-coupon-shell {
  width: 100%;
  border-radius: 1rem;
  background:
    linear-gradient(145deg, rgba(248, 240, 244, 0.98), rgba(255, 255, 255, 0.96)),
    url('/img/logo/bg-pattern.png');
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(84, 44, 58, 0.18);
  box-shadow: 0 14px 26px rgba(42, 26, 34, 0.14);
  padding: clamp(0.8rem, 2vw, 1.2rem);
}

.gift-coupon-shell__frame {
  border: 1px solid rgba(84, 44, 58, 0.25);
  border-radius: 0.82rem;
  padding: clamp(0.52rem, 1.8vw, 0.9rem);
  background: rgba(255, 255, 255, 0.76);
}

.gift-coupon-card {
  border-radius: 0.82rem;
  border: 1px solid rgba(84, 44, 58, 0.26);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(251, 244, 247, 0.95));
  padding: clamp(0.85rem, 2.2vw, 1.25rem);
  display: grid;
  gap: 0.75rem;
}

.gift-coupon-card__header {
  display: grid;
  place-items: center;
  gap: 0.3rem;
}

.gift-coupon-card__logo {
  width: clamp(108px, 25vw, 150px);
  max-width: 100%;
  object-fit: contain;
}

.gift-coupon-card__kicker {
  font-size: 0.74rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #6c4c59;
  font-weight: 700;
}

.gift-coupon-card__title {
  font-size: clamp(1.18rem, 2.8vw, 1.55rem);
  color: #4f2e3a;
}

.gift-coupon-card__subtitle {
  font-size: 0.9rem;
  line-height: 1.35;
  color: #563946;
}

.gift-coupon-card__grid {
  display: grid;
  gap: 0.22rem;
  font-size: 0.88rem;
  color: #3d2a34;
}

.gift-coupon-card__label {
  font-weight: 700;
  color: #4b2c38;
}

.gift-coupon-card__treatments {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 0.6rem;
  padding: 0.62rem;
  background: rgba(255, 255, 255, 0.88);
}

.gift-coupon-card__list {
  margin: 0;
  padding-left: 1.05rem;
  display: grid;
  gap: 0.2rem;
  font-size: 0.84rem;
  color: #422a33;
}

.gift-coupon-card__message {
  font-size: 0.87rem;
  color: #5f3f4c;
  font-style: italic;
}

.gift-coupon-card__footer {
  border-top: 1px solid rgba(84, 44, 58, 0.2);
  padding-top: 0.58rem;
  font-size: 0.79rem;
  color: #4d3641;
}

@media (max-width: 575.98px) {
  .gift-coupon-card {
    gap: 0.62rem;
  }
}
</style>

