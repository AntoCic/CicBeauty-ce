<script setup lang="ts">
import { cicKitStore, toast } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { Auth } from '../../main'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { treatmentStore } from '../../stores/treatmentStore'
import CouponGiftForm from './components/CouponGiftForm.vue'
import { defaultCouponGiftFormValues, normalizeCouponGiftForm, type CouponGiftFormValues } from './couponGiftShared'

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const isSaving = ref(false)

const initialValues = computed<CouponGiftFormValues>(() => defaultCouponGiftFormValues(new Date()))

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function defaultUpdateBy() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

async function onSubmit(values: CouponGiftFormValues) {
  isSaving.value = true
  try {
    const payload = normalizeCouponGiftForm(values)
    const created = await couponStore.add({
      ...payload,
      updateBy: defaultUpdateBy(),
    })
    toast.success('Coupon regalo creato')
    await router.push({ name: 'CouponDetailView', params: { id: created.id } })
  } catch (error) {
    console.error(error)
    toast.error('Errore creazione coupon regalo')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Nuovo coupon regalo" :to="{ name: 'CouponsView' }" />

    <div class="coupon-create-wrap px-2 pb-4">
      <CouponGiftForm
        :initial-values="initialValues"
        :clients="clientStore.itemsActiveArray"
        :treatments="treatmentStore.itemsActiveArray"
        :loading="isSaving"
        submit-label="Crea coupon regalo"
        card-title="Crea coupon regalo"
        @submit="onSubmit"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.coupon-create-wrap {
  max-width: 980px;
  margin-inline: auto;
}
</style>

