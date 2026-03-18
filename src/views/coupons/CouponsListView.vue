<script setup lang="ts">
import { Btn, cicKitStore, toast, useStoreWatch } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { appConfigStore } from '../../stores/appConfigStore'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { buildCouponUsageCountMap } from '../../utils/couponUtils'
import CouponListPanel from './components/CouponListPanel.vue'
import { downloadCouponGiftPdf } from './couponGiftPdf'

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const isDownloadingId = ref('')

useStoreWatch([
  { store: couponStore, getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } } },
  { store: clientStore, getOpts: {} },
  { store: treatmentStore, getOpts: {} },
  { store: appointmentStore, getOpts: {} },
  { store: appConfigStore, checkLogin: false },
])

const clientsById = computed(() => new Map(clientStore.itemsActiveArray.map((client) => [client.id, client])))
const treatmentsById = computed(() => new Map(treatmentStore.itemsActiveArray.map((treatment) => [treatment.id, treatment])))
const usageByCouponId = computed(() => buildCouponUsageCountMap(appointmentStore.itemsActiveArray))
const appConfig = computed(() => appConfigStore.getConfigData())

function clientLabel(clientId: string | undefined) {
  const normalized = String(clientId ?? '').trim()
  if (!normalized) return 'Cliente non assegnato'
  const client = clientsById.value.get(normalized)
  if (!client) return normalized
  return `${String(client.name ?? '').trim()} ${String(client.surname ?? '').trim()}`.trim() || normalized
}

function treatmentLabels(couponId: string) {
  const coupon = couponStore.findItemsById(couponId)
  if (!coupon) return []
  return (coupon.trattamenti ?? [])
    .map((id) => String(treatmentsById.value.get(id)?.title ?? id).trim())
    .filter(Boolean)
}

async function openDetail(couponId: string) {
  await router.push({ name: 'CouponDetailView', params: { id: couponId } })
}

async function downloadCoupon(couponId: string) {
  if (isDownloadingId.value) return
  const coupon = couponStore.findItemsById(couponId)
  if (!coupon) return
  isDownloadingId.value = couponId
  try {
    await downloadCouponGiftPdf(
      {
        coupon,
        clientLabel: clientLabel(coupon.client_id),
        treatmentLabels: treatmentLabels(coupon.id),
        appConfig: appConfig.value,
      },
      `coupon-regalo-${coupon.code}`.toLowerCase(),
    )
  } catch (error) {
    console.error(error)
    toast.error('Errore download coupon')
  } finally {
    isDownloadingId.value = ''
  }
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Elenco coupon" :to="{ name: 'CouponsView' }" />

    <div class="coupon-list-wrap px-2 pb-4">
      <div class="d-flex justify-content-end mb-2">
        <RouterLink :to="{ name: 'CouponGiftCreateView' }" class="text-decoration-none">
          <Btn type="button" color="dark" icon="add">Nuovo coupon regalo</Btn>
        </RouterLink>
      </div>

      <CouponListPanel
        :coupons="couponStore.itemsActiveArray"
        :clients-by-id="clientsById"
        :treatments-by-id="treatmentsById"
        :usage-by-coupon-id="usageByCouponId"
        @open="openDetail"
        @download="downloadCoupon"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.coupon-list-wrap {
  max-width: 980px;
  margin-inline: auto;
}
</style>
