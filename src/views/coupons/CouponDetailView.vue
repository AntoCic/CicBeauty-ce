<script setup lang="ts">
import { Btn, cicKitStore, toast, useStoreWatch } from 'cic-kit'
import { computed, ref, watch } from 'vue'
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
const formValues = ref<CouponGiftFormValues | null>(null)

useStoreWatch([
  { store: couponStore, getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } } },
  { store: clientStore, getOpts: {} },
  { store: treatmentStore, getOpts: {} },
  { store: appointmentStore, getOpts: {} },
  { store: appConfigStore, checkLogin: false },
])

const couponId = computed(() => String(route.params.id ?? '').trim())
const coupon = computed(() => (couponId.value ? couponStore.findItemsById(couponId.value) : undefined))
const clientsById = computed(() => new Map(clientStore.itemsActiveArray.map((client) => [client.id, client])))
const treatmentsById = computed(() => new Map(treatmentStore.itemsActiveArray.map((treatment) => [treatment.id, treatment])))
const appConfig = computed(() => appConfigStore.getConfigData())
const usageByCouponId = computed(() => buildCouponUsageCountMap(appointmentStore.itemsActiveArray))
const usedCount = computed(() => (coupon.value ? couponUsageCount(coupon.value.id, usageByCouponId.value) : 0))

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

watch(
  coupon,
  (value) => {
    if (!value) {
      formValues.value = null
      return
    }
    formValues.value = couponToGiftFormValues(value)
  },
  { immediate: true },
)

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function defaultUpdateBy() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

function usageStatusLabel() {
  const used = usedCount.value
  return used >= 1 ? 'Utilizzato' : 'Disponibile'
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
      <section v-if="coupon" class="card border-0 shadow-sm p-3 p-md-4">
        <div class="d-flex align-items-start justify-content-between gap-2 flex-wrap mb-3">
          <div>
            <p class="fw-semibold mb-1">{{ coupon.code }} - regalo da {{ coupon.from }}</p>
            <p class="small text-muted mb-0">
              Stato: {{ usageStatusLabel() }} ({{ usedCount }}/1) | Destinatario: {{ clientLabel }}
            </p>
          </div>
          <div class="d-flex gap-2 flex-wrap">
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
</style>

