<script setup lang="ts">
import { cicKitStore, useStoreWatch } from 'cic-kit'
import { computed } from 'vue'
import HeaderApp from '../../components/HeaderApp.vue'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { expenseStore } from '../../stores/expenseStore'
import { productStore } from '../../stores/productStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { typeExpenseStore } from '../../stores/typeExpenseStore'
import { hasOperatorAccess } from '../../utils/permissions'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const canOperate = computed(() => hasOperatorAccess())

useStoreWatch(
  canOperate.value
    ? [
        { store: appointmentStore, getOpts: {  } },
        { store: clientStore, getOpts: {  } },
        { store: treatmentStore, getOpts: {  }, checkLogin: false },
        { store: productStore, getOpts: {  }, checkLogin: false },
        { store: typeExpenseStore, getOpts: {  } },
        { store: expenseStore, getOpts: {  } },
        { store: couponStore, getOpts: {  } },
      ]
    : [],
)

const relationships = computed(() => {
  const appointmentWithClient = appointmentStore.itemsActiveArray.filter((item) => item.client_id || item.user_id).length
  const appointmentWithTreatment = appointmentStore.itemsActiveArray.filter((item) => (item.treatment_ids ?? []).length > 0).length
  const appointmentWithCoupon = appointmentStore.itemsActiveArray.filter((item) => item.coupon_id).length
  const appointmentPersonal = appointmentStore.itemsActiveArray.filter((item) => item.isPersonal).length
  const expenseWithType = expenseStore.itemsActiveArray.filter((item) => item.type_expense_id).length
  const expenseWithClient = expenseStore.itemsActiveArray.filter((item) => item.client_id).length
  const expenseWithCoupon = expenseStore.itemsActiveArray.filter((item) => item.coupon_id).length
  const treatmentWithType = treatmentStore.itemsActiveArray.filter((item) => item.type_expense_id).length
  const productWithType = productStore.itemsActiveArray.filter((item) => item.type_expense_id).length
  const clientWithPreferences = clientStore.itemsActiveArray.filter((item) => (item.preferredOperatorIds ?? []).length > 0).length

  return [
    {
      name: 'Cliente 1 -> N Appuntamenti',
      connected: appointmentWithClient,
      total: appointmentStore.itemsActiveArray.length,
      note: 'Appuntamento usa client_id/user_id',
    },
    {
      name: 'Appuntamento N <-> N Trattamenti',
      connected: appointmentWithTreatment,
      total: appointmentStore.itemsActiveArray.length,
      note: 'Relazione su treatment_ids[]',
    },
    {
      name: 'Appuntamento N -> 1 Coupon',
      connected: appointmentWithCoupon,
      total: appointmentStore.itemsActiveArray.length,
      note: 'coupon_id opzionale in appuntamento',
    },
    {
      name: 'Appuntamento N -> N Operatori',
      connected: appointmentStore.itemsActiveArray.filter((item) => (item.operator_ids ?? []).length > 0).length,
      total: appointmentStore.itemsActiveArray.length,
      note: 'operator_ids[] (primario = primo elemento)',
    },
    {
      name: 'Appuntamenti personali (solo owner)',
      connected: appointmentPersonal,
      total: appointmentStore.itemsActiveArray.length,
      note: 'isPersonal + operator_ids[0]',
    },
    {
      name: 'TipoSpesa 1 -> N Trattamenti',
      connected: treatmentWithType,
      total: treatmentStore.itemsActiveArray.length,
      note: 'treatment.type_expense_id',
    },
    {
      name: 'TipoSpesa 1 -> N Prodotti',
      connected: productWithType,
      total: productStore.itemsActiveArray.length,
      note: 'product.type_expense_id',
    },
    {
      name: 'TipoSpesa 1 -> N Spese',
      connected: expenseWithType,
      total: expenseStore.itemsActiveArray.length,
      note: 'expense.type_expense_id',
    },
    {
      name: 'Spesa N -> 1 Cliente',
      connected: expenseWithClient,
      total: expenseStore.itemsActiveArray.length,
      note: 'client_id opzionale su spesa',
    },
    {
      name: 'Spesa N -> 1 Coupon',
      connected: expenseWithCoupon,
      total: expenseStore.itemsActiveArray.length,
      note: 'coupon_id opzionale su spesa',
    },
    {
      name: 'Cliente -> Operatori preferiti',
      connected: clientWithPreferences,
      total: clientStore.itemsActiveArray.length,
      note: 'preferredOperatorIds[]',
    },
    {
      name: 'Coupon -> Cliente dedicato',
      connected: couponStore.itemsActiveArray.filter((item) => item.client_id).length,
      total: couponStore.itemsActiveArray.length,
      note: 'client_id opzionale nel coupon',
    },
    {
      name: 'Migrazione old_id su Trattamenti',
      connected: treatmentStore.itemsActiveArray.filter((item) => item.old_id).length,
      total: treatmentStore.itemsActiveArray.length,
      note: 'Campo old_id per mapping legacy',
    },
    {
      name: 'Migrazione old_id su TipiSpesa',
      connected: typeExpenseStore.itemsActiveArray.filter((item) => item.old_id).length,
      total: typeExpenseStore.itemsActiveArray.length,
      note: 'Campo old_id per mapping legacy',
    },
  ]
})
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Relazioni Dati" :to="{ name: 'home' }" />

    <div class="px-2 pb-4">
      <p v-if="!canOperate" class="text-muted small mt-3">Permesso `OPERATORE` richiesto.</p>
      <template v-else>
        <div class="card border-0 shadow-sm p-3">
          <h2 class="h6 mb-2">Lista relazioni possibili e copertura attuale</h2>
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Relazione</th>
                  <th>Copertura</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in relationships" :key="row.name">
                  <td>{{ row.name }}</td>
                  <td>{{ row.connected }} / {{ row.total }}</td>
                  <td class="text-muted small">{{ row.note }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
