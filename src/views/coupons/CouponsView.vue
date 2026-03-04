<script setup lang="ts">
import { Btn, cicKitStore, toast, useStoreWatch } from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { Auth } from '../../main'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { hasOperatorAccess } from '../../utils/permissions'

type CouponForm = {
  code: string
  title: string
  description: string
  discount_type: 'fixed' | 'percent'
  discount_value: number | string
  usage_limit: number | string
  client_id: string
  valid_from: string
  valid_to: string
}

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const canOperate = computed(() => hasOperatorAccess())

useStoreWatch(
  canOperate.value
    ? [
        { store: couponStore, getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' },  } },
        { store: clientStore, getOpts: {  } },
      ]
    : [],
)

const schema = toTypedSchema(
  yup.object({
    code: yup.string().required('Campo obbligatorio'),
    title: yup.string().required('Campo obbligatorio'),
    description: yup.string().default(''),
    discount_type: yup.mixed<'fixed' | 'percent'>().oneOf(['fixed', 'percent']).required(),
    discount_value: yup.number().typeError('Numero non valido').required('Campo obbligatorio'),
    usage_limit: yup.number().typeError('Numero non valido').default(0),
    client_id: yup.string().default(''),
    valid_from: yup.string().default(''),
    valid_to: yup.string().default(''),
  }),
)

const initialValues = computed<CouponForm>(() => ({
  code: '',
  title: '',
  description: '',
  discount_type: 'fixed',
  discount_value: 0,
  usage_limit: 0,
  client_id: '',
  valid_from: '',
  valid_to: '',
}))

const sortedCoupons = computed(() =>
  [...couponStore.itemsActiveArray].sort((a, b) => a.code.localeCompare(b.code, 'it')),
)

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function updateBy() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

async function onSubmit(values: Record<string, unknown>) {
  if (!canOperate.value) {
    toast.error('Permesso OPERATORE richiesto')
    return
  }

  try {
    await couponStore.add({
      code: normalizeString(values.code).toUpperCase(),
      title: normalizeString(values.title),
      description: normalizeString(values.description),
      discount_type: normalizeString(values.discount_type) === 'percent' ? 'percent' : 'fixed',
      discount_value: normalizeNumber(values.discount_value, 0),
      active: true,
      valid_from: normalizeString(values.valid_from) ? new Date(`${normalizeString(values.valid_from)}T00:00:00`) : undefined,
      valid_to: normalizeString(values.valid_to) ? new Date(`${normalizeString(values.valid_to)}T23:59:59`) : undefined,
      usage_limit: normalizeNumber(values.usage_limit, 0) || undefined,
      usage_count: 0,
      client_id: normalizeString(values.client_id) || undefined,
      treatment_ids: [],
      product_ids: [],
      updateBy: updateBy(),
    })
    toast.success('Coupon creato')
  } catch (error) {
    console.error(error)
    toast.error('Errore creazione coupon')
  }
}

async function toggleCouponActive(id: string, active: boolean) {
  const coupon = couponStore.findItemsById(id)
  if (!coupon) return
  try {
    await coupon.update({ active, updateBy: updateBy() })
  } catch (error) {
    console.error(error)
    toast.error('Errore aggiornamento coupon')
  }
}

async function deleteCoupon(id: string) {
  const coupon = couponStore.findItemsById(id)
  if (!coupon) return
  const ok = window.confirm(`Eliminare coupon ${coupon.code}?`)
  if (!ok) return
  try {
    await coupon.delete(couponStore)
    toast.success('Coupon eliminato')
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione coupon')
  }
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Coupon" :to="{ name: 'home' }" />

    <div class="px-2 pb-4">
      <p v-if="!canOperate" class="text-muted small mt-3">Permesso `OPERATORE` richiesto.</p>

      <template v-else>
        <Form
          class="card border-0 shadow-sm p-3 mb-3"
          :validation-schema="schema"
          :initial-values="initialValues"
          @submit="onSubmit"
          v-slot="{ isSubmitting }"
        >
          <div class="row g-3">
            <div class="col-12 col-md-3">
              <label class="form-label">Codice</label>
              <Field name="code" class="form-control" placeholder="WELCOME10" />
              <ErrorMessage name="code" class="text-danger small" />
            </div>
            <div class="col-12 col-md-5">
              <label class="form-label">Titolo</label>
              <Field name="title" class="form-control" />
              <ErrorMessage name="title" class="text-danger small" />
            </div>
            <div class="col-12 col-md-2">
              <label class="form-label">Tipo sconto</label>
              <Field name="discount_type" as="select" class="form-select">
                <option value="fixed">Importo</option>
                <option value="percent">Percentuale</option>
              </Field>
              <ErrorMessage name="discount_type" class="text-danger small" />
            </div>
            <div class="col-12 col-md-2">
              <label class="form-label">Valore</label>
              <Field name="discount_value" type="number" step="0.01" class="form-control" />
              <ErrorMessage name="discount_value" class="text-danger small" />
            </div>

            <div class="col-12 col-md-4">
              <label class="form-label">Cliente dedicato (opzionale)</label>
              <Field name="client_id" as="select" class="form-select">
                <option value="">Nessuno</option>
                <option v-for="client in clientStore.itemsActiveArray" :key="client.id" :value="client.id">
                  {{ client.name }} {{ client.surname }}
                </option>
              </Field>
              <ErrorMessage name="client_id" class="text-danger small" />
            </div>
            <div class="col-12 col-md-2">
              <label class="form-label">Uso massimo</label>
              <Field name="usage_limit" type="number" min="0" class="form-control" />
              <ErrorMessage name="usage_limit" class="text-danger small" />
            </div>
            <div class="col-12 col-md-3">
              <label class="form-label">Valido dal</label>
              <Field name="valid_from" type="date" class="form-control" />
              <ErrorMessage name="valid_from" class="text-danger small" />
            </div>
            <div class="col-12 col-md-3">
              <label class="form-label">Valido fino al</label>
              <Field name="valid_to" type="date" class="form-control" />
              <ErrorMessage name="valid_to" class="text-danger small" />
            </div>

            <div class="col-12">
              <label class="form-label">Descrizione</label>
              <Field name="description" as="textarea" rows="2" class="form-control" />
              <ErrorMessage name="description" class="text-danger small" />
            </div>
          </div>

          <Btn class="mt-3" type="submit" color="dark" icon="add" :loading="isSubmitting">
            Crea coupon
          </Btn>
        </Form>

        <div class="vstack gap-2">
          <article v-for="coupon in sortedCoupons" :key="coupon.id" class="card border-0 shadow-sm p-3">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <p class="fw-semibold mb-0">{{ coupon.code }} - {{ coupon.title }}</p>
                <p class="small text-muted mb-0">
                  {{ coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `${coupon.discount_value} EUR` }}
                  | usi: {{ coupon.usage_count ?? 0 }} / {{ coupon.usage_limit ?? '∞' }}
                </p>
                <p class="small text-muted mb-0">{{ coupon.description || 'Nessuna descrizione' }}</p>
              </div>
              <div class="d-flex gap-2">
                <Btn
                  type="button"
                  :color="coupon.active ? 'secondary' : 'dark'"
                  variant="outline"
                  @click="toggleCouponActive(coupon.id, !coupon.active)"
                >
                  {{ coupon.active ? 'Disattiva' : 'Attiva' }}
                </Btn>
                <Btn type="button" color="danger" variant="outline" icon="delete" @click="deleteCoupon(coupon.id)">
                  Elimina
                </Btn>
              </div>
            </div>
          </article>
          <p v-if="!sortedCoupons.length" class="text-muted small mt-2 mb-0">Nessun coupon configurato.</p>
        </div>
      </template>
    </div>
  </div>
</template>

