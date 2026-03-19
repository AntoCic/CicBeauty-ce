<script setup lang="ts">
import { Btn, cicKitStore, toast } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { Auth } from '../../main'
import { appConfigStore } from '../../stores/appConfigStore'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { buildCouponUsageCountMap, couponUsageCount } from '../../utils/couponUtils'
import CouponGiftForm from './components/CouponGiftForm.vue'
import CouponGiftPreviewCard from './components/CouponGiftPreviewCard.vue'
import { downloadCouponGiftPdf } from './couponGiftPdf'
import { couponToGiftFormValues, normalizeCouponGiftForm, type CouponGiftFormValues } from './couponGiftShared'

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const isEditMode = ref(false)
const isSaving = ref(false)
const isDownloading = ref(false)
const isUpdatingUsage = ref(false)

const couponId = computed(() => String(route.params.id ?? '').trim())
const coupon = computed(() => (couponId.value ? couponStore.findItemsById(couponId.value) : undefined))
const formValues = computed<CouponGiftFormValues | null>(() => (coupon.value ? couponToGiftFormValues(coupon.value) : null))
const clientsById = computed(() => new Map(clientStore.itemsActiveArray.map((client) => [client.id, client])))
const treatmentsById = computed(() => new Map(treatmentStore.itemsActiveArray.map((treatment) => [treatment.id, treatment])))
const appConfig = computed(() => appConfigStore.getConfigData())
const usageByCouponId = computed(() => buildCouponUsageCountMap(appointmentStore.itemsActiveArray))
const usedCount = computed(() => (coupon.value ? couponUsageCount(coupon.value.id, usageByCouponId.value) : 0))
const maxUsage = computed(() => Math.max(1, Number(coupon.value?.max_usage ?? 1)))
const isMarkedUsed = computed(() => Boolean(coupon.value ? !coupon.value.active : false))

const clientLabel = computed(() => {
  const clientId = String(coupon.value?.client_id ?? '').trim()
  if (!clientId) return 'Cliente non assegnato'
  const client = clientsById.value.get(clientId)
  if (!client) return clientId
  return `${String(client.name ?? '').trim()} ${String(client.surname ?? '').trim()}`.trim() || clientId
})

const treatmentLabels = computed(() => {
  return (coupon.value?.trattamenti ?? [])
    .map((id) => String(treatmentsById.value.get(id)?.title ?? id).trim())
    .filter(Boolean)
})

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function defaultUpdateBy() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

function usageStatusLabel() {
  if (isMarkedUsed.value) return 'Utilizzato (manuale)'
  return usedCount.value >= 1 ? 'Utilizzato in appuntamento' : 'Disponibile'
}

function usageSummaryLabel() {
  return `${usedCount.value}/${maxUsage.value}`
}

function onUsageSwitchChange(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  void updateManualUsage(event.target.checked)
}

async function updateManualUsage(nextUsed: boolean) {
  if (!coupon.value || isUpdatingUsage.value) return
  isUpdatingUsage.value = true
  try {
    await coupon.value.update({
      active: !nextUsed,
      updateBy: defaultUpdateBy(),
    })
    toast.success(nextUsed ? 'Coupon segnato come utilizzato' : 'Coupon segnato come non utilizzato')
  } catch (error) {
    console.error(error)
    toast.error('Errore aggiornamento stato coupon')
  } finally {
    isUpdatingUsage.value = false
  }
}

async function onDownload() {
  if (!coupon.value) return
  isDownloading.value = true
  try {
    await downloadCouponGiftPdf(
      {
        coupon: coupon.value,
        clientLabel: clientLabel.value,
        treatmentLabels: treatmentLabels.value,
        appConfig: appConfig.value,
      },
      `coupon-regalo-${coupon.value.code}`.toLowerCase(),
    )
  } catch (error) {
    console.error(error)
    toast.error('Errore download coupon')
  } finally {
    isDownloading.value = false
  }
}

async function onSubmit(values: CouponGiftFormValues) {
  if (!coupon.value) return
  isSaving.value = true
  try {
    await coupon.value.update({
      ...normalizeCouponGiftForm(values),
      updateBy: defaultUpdateBy(),
    })
    isEditMode.value = false
    toast.success('Coupon aggiornato')
  } catch (error) {
    console.error(error)
    toast.error('Errore aggiornamento coupon')
  } finally {
    isSaving.value = false
  }
}

async function onDelete() {
  if (!coupon.value) return
  const ok = window.confirm(`Eliminare il coupon ${coupon.value.code}?`)
  if (!ok) return
  try {
    await coupon.value.delete(couponStore)
    toast.success('Coupon eliminato')
    await router.push({ name: 'CouponsListView' })
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione coupon')
  }
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Dettaglio coupon" :to="{ name: 'CouponsListView' }" />

    <div class="coupon-detail-wrap px-2 pb-4">
      <section v-if="coupon" class="coupon-detail-card shadow-sm p-3 p-md-4">
        <div class="coupon-detail-card__hero mb-3">
          <div class="coupon-detail-card__hero-main">
            <p class="coupon-detail-card__kicker mb-1">Coupon regalo</p>
            <h2 class="coupon-detail-card__title mb-1">{{ coupon.code }}</h2>
            <p class="small mb-0">Da: <strong>{{ coupon.from }}</strong></p>
          </div>

          <div class="coupon-detail-card__hero-meta">
            <span class="coupon-pill" :class="{ 'coupon-pill--used': isMarkedUsed }">
              {{ usageStatusLabel() }}
            </span>
            <span class="coupon-pill">Uso appuntamenti: {{ usageSummaryLabel() }}</span>
            <span class="coupon-pill">Destinatario: {{ clientLabel }}</span>
          </div>
        </div>

        <div class="coupon-usage-toggle-box mb-3">
          <div class="coupon-usage-toggle-box__text">
            <p class="coupon-usage-toggle-box__title mb-1">Stato manuale utilizzo</p>
            <p class="small text-muted mb-0">Gestisci lo stato qui senza aprire la modifica coupon.</p>
          </div>

          <label class="coupon-usage-toggle" for="coupon-manual-used">
            <input
              id="coupon-manual-used"
              type="checkbox"
              class="coupon-usage-toggle__input"
              :checked="isMarkedUsed"
              :disabled="isUpdatingUsage || isSaving"
              @change="onUsageSwitchChange"
            >
            <span class="coupon-usage-toggle__track">
              <span class="coupon-usage-toggle__thumb">
                <span class="material-symbols-outlined" aria-hidden="true">
                  {{ isMarkedUsed ? 'check' : 'close' }}
                </span>
              </span>
            </span>
            <span class="coupon-usage-toggle__label">{{ isMarkedUsed ? 'Utilizzato' : 'Non utilizzato' }}</span>
          </label>
        </div>

        <div class="d-flex gap-2 flex-wrap mb-3">
          <Btn type="button" color="secondary" variant="outline" icon="download" :loading="isDownloading" @click="onDownload">
            Scarica coupon
          </Btn>
          <Btn
            type="button"
            :color="isEditMode ? 'secondary' : 'dark'"
            :variant="isEditMode ? 'outline' : 'solid'"
            icon="edit"
            @click="isEditMode = !isEditMode"
          >
            {{ isEditMode ? 'Chiudi modifica' : 'Modifica' }}
          </Btn>
          <Btn type="button" color="danger" variant="outline" icon="delete" @click="onDelete">
            Elimina
          </Btn>
        </div>

        <div v-if="isEditMode && formValues" class="mb-3">
          <CouponGiftForm
            :initial-values="formValues"
            :clients="clientStore.itemsActiveArray"
            :treatments="treatmentStore.itemsActiveArray"
            :loading="isSaving"
            submit-label="Salva modifiche coupon"
            card-title="Modifica coupon regalo"
            :show-cancel="true"
            @submit="onSubmit"
            @cancel="isEditMode = false"
          />
        </div>

        <CouponGiftPreviewCard
          :coupon="coupon"
          :client-label="clientLabel"
          :treatment-labels="treatmentLabels"
          :app-config="appConfig"
        />
      </section>

      <p v-else class="text-muted small">Coupon non trovato.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.coupon-detail-wrap {
  max-width: 980px;
  margin-inline: auto;
}

.coupon-detail-card {
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 0.95rem;
  background:
    radial-gradient(circle at 94% 8%, rgba(232, 179, 190, 0.34) 0%, transparent 48%),
    linear-gradient(165deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 245, 246, 0.92) 100%);
}

.coupon-detail-card__hero {
  display: grid;
  gap: 0.6rem;
}

.coupon-detail-card__kicker {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #6d4b59;
}

.coupon-detail-card__title {
  margin: 0;
  font-size: 1.3rem;
  line-height: 1.2;
  color: #3f2430;
}

.coupon-detail-card__hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
}

.coupon-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(84, 44, 58, 0.18);
  padding: 0.2rem 0.56rem;
  font-size: 0.74rem;
  color: #563641;
  background: rgba(255, 255, 255, 0.9);
}

.coupon-pill--used {
  border-color: rgba(220, 53, 69, 0.38);
  color: #842029;
  background: rgba(248, 215, 218, 0.8);
}

.coupon-usage-toggle-box {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 0.7rem;
  background: rgba(255, 255, 255, 0.86);
  padding: 0.62rem 0.66rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.coupon-usage-toggle-box__title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #412730;
}

.coupon-usage-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.coupon-usage-toggle__input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.coupon-usage-toggle__track {
  width: 62px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid rgba(84, 44, 58, 0.35);
  background: rgba(132, 143, 150, 0.36);
  padding: 2px;
  display: inline-flex;
  align-items: center;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.coupon-usage-toggle__thumb {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: #fff;
  color: #636363;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(35, 20, 26, 0.23);
  transform: translateX(0);
  transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease;
}

.coupon-usage-toggle__thumb .material-symbols-outlined {
  font-size: 0.92rem;
  line-height: 1;
}

.coupon-usage-toggle__input:checked + .coupon-usage-toggle__track {
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.28), rgba(176, 31, 56, 0.5));
  border-color: rgba(176, 31, 56, 0.62);
}

.coupon-usage-toggle__input:checked + .coupon-usage-toggle__track .coupon-usage-toggle__thumb {
  transform: translateX(30px);
  background: #b01f38;
  color: #fff;
}

.coupon-usage-toggle__input:focus-visible + .coupon-usage-toggle__track {
  outline: 2px solid rgba(176, 31, 56, 0.4);
  outline-offset: 2px;
}

.coupon-usage-toggle__input:disabled + .coupon-usage-toggle__track {
  opacity: 0.6;
  cursor: not-allowed;
}

.coupon-usage-toggle__label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #4d303b;
}
</style>

