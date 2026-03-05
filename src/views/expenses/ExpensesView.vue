<script setup lang="ts">
import {
  Btn,
  FieldFile,
  cicKitStore,
  getFileExtension,
  toast,
  toFileArray,
  uploadFilesToUrls,
  type FieldFileValue,
  useStoreWatch,
} from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed, ref } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { Auth } from '../../main'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { expenseStore } from '../../stores/expenseStore'
import { typeExpenseStore } from '../../stores/typeExpenseStore'
import { asDate } from '../../utils/date'

type ExpenseForm = {
  name: string
  type_expense_id: string
  expense_kind: 'purchase' | 'operational' | 'marketing' | 'other'
  price: number | string
  paidAt: string
  status: string
  coupon_id: string
  client_id: string
  notes: string
}

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const fileValue = ref<FieldFileValue>([])

useStoreWatch([
  { store: expenseStore, getOpts: { orderBy: { fieldPath: 'paidAt', directionStr: 'desc' },  } },
  { store: typeExpenseStore, getOpts: {  } },
  { store: couponStore, getOpts: {  } },
  { store: clientStore, getOpts: {  } },
])

const schema = toTypedSchema(
  yup.object({
    name: yup.string().required('Campo obbligatorio'),
    type_expense_id: yup.string().required('Campo obbligatorio'),
    expense_kind: yup
      .mixed<'purchase' | 'operational' | 'marketing' | 'other'>()
      .oneOf(['purchase', 'operational', 'marketing', 'other'])
      .required(),
    price: yup.number().typeError('Numero non valido').required('Campo obbligatorio'),
    paidAt: yup.string().required('Campo obbligatorio'),
    status: yup.string().required('Campo obbligatorio'),
    coupon_id: yup.string().default(''),
    client_id: yup.string().default(''),
    notes: yup.string().default(''),
  }),
)

const initialValues = computed<ExpenseForm>(() => ({
  name: '',
  type_expense_id: '',
  expense_kind: 'purchase',
  price: 0,
  paidAt: new Date().toISOString().slice(0, 10),
  status: 'paid',
  coupon_id: '',
  client_id: '',
  notes: '',
}))

const typeExpenseMap = computed(() => {
  const map = new Map<string, string>()
  for (const typeExpense of typeExpenseStore.itemsActiveArray) {
    map.set(typeExpense.id, `${typeExpense.emoji ? `${typeExpense.emoji} ` : ''}${typeExpense.name}`)
  }
  return map
})

const sortedExpenses = computed(() => {
  return [...expenseStore.itemsActiveArray].sort((a, b) => {
    const dateA = asDate(a.paidAt)?.getTime() ?? 0
    const dateB = asDate(b.paidAt)?.getTime() ?? 0
    return dateB - dateA
  })
})

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function currentUserLabel() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

function resetFileSelection() {
  fileValue.value = []
}

function buildFileName(sourceName: string, index: number) {
  const normalized = normalizeString(sourceName)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
  return `${Date.now()}_${index}_${normalized || 'expense-file'}`
}

async function uploadAttachments(expenseId: string) {
  const files = toFileArray(fileValue.value)
  if (!files.length) return [] as string[]
  if (!expenseStore.storageFolder) {
    throw new Error('Storage folder spese non configurata')
  }

  return uploadFilesToUrls(files, async (file, index) => {
    const extension = getFileExtension(file)
    const base = buildFileName(file.name, index)
    const path = extension
      ? `${expenseId}/attachments/${base}.${extension}`
      : `${expenseId}/attachments/${base}`
    const uploaded = await expenseStore.storageFolder!.update(path, file)
    return uploaded.url
  })
}

async function onSubmit(values: Record<string, unknown>) {
  try {
    const created = await expenseStore.add({
      name: normalizeString(values.name),
      type_expense_id: normalizeString(values.type_expense_id),
      expense_kind: (normalizeString(values.expense_kind) as ExpenseForm['expense_kind']) || 'other',
      price: normalizeNumber(values.price, 0),
      quantity: 1,
      unit_cost: normalizeNumber(values.price, 0),
      notes: normalizeString(values.notes),
      recurrence: 'none',
      status: normalizeString(values.status) || 'paid',
      coupon_id: normalizeString(values.coupon_id),
      client_id: normalizeString(values.client_id),
      paidAt: asDate(values.paidAt) ?? new Date(),
      dueAt: undefined,
      attachments: [],
      receiptUrls: false,
      updateBy: currentUserLabel(),
    })

    const attachments = await uploadAttachments(created.id)
    if (attachments.length) {
      await created.update({
        attachments,
        receiptUrls: attachments,
        updateBy: currentUserLabel(),
      })
    }

    resetFileSelection()
    toast.success('Spesa salvata')
  } catch (error) {
    console.error(error)
    toast.error('Errore salvataggio spesa')
  }
}

async function onDeleteExpense(expenseId: string) {
  const item = expenseStore.findItemsById(expenseId)
  if (!item) return
  const ok = window.confirm(`Eliminare la spesa "${item.name}"?`)
  if (!ok) return

  try {
    await item.delete(expenseStore)
    toast.success('Spesa eliminata')
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione spesa')
  }
}

function formatMoney(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Spese" :to="{ name: 'home' }" />

    <div class="px-2 pb-4">
      <Form
        class="card border-0 shadow-sm p-3 mb-3"
        :validation-schema="schema"
        :initial-values="initialValues"
        @submit="onSubmit"
        v-slot="{ isSubmitting }"
      >
        <div class="row g-3">
          <div class="col-12 col-md-4">
            <label class="form-label">Nome spesa</label>
            <Field name="name" class="form-control" />
            <ErrorMessage name="name" class="text-danger small" />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label">Tipo spesa</label>
            <Field name="type_expense_id" as="select" class="form-select">
              <option value="">Seleziona tipo</option>
              <option v-for="typeExpense in typeExpenseStore.itemsActiveArray" :key="typeExpense.id" :value="typeExpense.id">
                {{ typeExpenseMap.get(typeExpense.id) }}
              </option>
            </Field>
            <ErrorMessage name="type_expense_id" class="text-danger small" />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label">Categoria costo</label>
            <Field name="expense_kind" as="select" class="form-select">
              <option value="purchase">Acquisto</option>
              <option value="operational">Operativa</option>
              <option value="marketing">Marketing</option>
              <option value="other">Altro</option>
            </Field>
            <ErrorMessage name="expense_kind" class="text-danger small" />
          </div>

          <div class="col-12 col-md-3">
            <label class="form-label">Importo</label>
            <Field name="price" type="number" step="0.01" class="form-control" />
            <ErrorMessage name="price" class="text-danger small" />
          </div>
          <div class="col-12 col-md-3">
            <label class="form-label">Data pagamento</label>
            <Field name="paidAt" type="date" class="form-control" />
            <ErrorMessage name="paidAt" class="text-danger small" />
          </div>
          <div class="col-12 col-md-3">
            <label class="form-label">Stato</label>
            <Field name="status" as="select" class="form-select">
              <option value="paid">Pagata</option>
              <option value="pending">Da pagare</option>
            </Field>
            <ErrorMessage name="status" class="text-danger small" />
          </div>
          <div class="col-12 col-md-3">
            <label class="form-label">Coupon collegato</label>
            <Field name="coupon_id" as="select" class="form-select">
              <option value="">Nessuno</option>
              <option v-for="coupon in couponStore.itemsActiveArray" :key="coupon.id" :value="coupon.id">
                {{ coupon.code }} - {{ coupon.title }}
              </option>
            </Field>
            <ErrorMessage name="coupon_id" class="text-danger small" />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Cliente collegato (opzionale)</label>
            <Field name="client_id" as="select" class="form-select">
              <option value="">Nessuno</option>
              <option v-for="client in clientStore.itemsActiveArray" :key="client.id" :value="client.id">
                {{ client.name }} {{ client.surname }}
              </option>
            </Field>
            <ErrorMessage name="client_id" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Allegati</label>
            <FieldFile
              name="attachments"
              v-model="fileValue"
              multiple
              :show-errors="false"
              @clear="resetFileSelection"
            >
              <template #dropzone="{ open, clear, files }">
                <div class="dropzone">
                  <div class="d-flex gap-2 flex-wrap">
                    <Btn type="button" icon="upload_file" color="dark" @click="open">Aggiungi file</Btn>
                    <Btn type="button" icon="delete" color="secondary" variant="outline" :disabled="!files.length" @click="clear">Svuota</Btn>
                  </div>
                  <small class="text-muted d-block mt-1">File selezionati: {{ files.length }}</small>
                </div>
              </template>
            </FieldFile>
          </div>

          <div class="col-12">
            <label class="form-label">Note</label>
            <Field name="notes" as="textarea" rows="2" class="form-control" />
            <ErrorMessage name="notes" class="text-danger small" />
          </div>
        </div>

        <Btn class="mt-3" type="submit" color="dark" icon="save" :loading="isSubmitting">
          Salva spesa
        </Btn>
      </Form>

      <div class="vstack gap-2">
        <article v-for="expense in sortedExpenses" :key="expense.id" class="card border-0 shadow-sm p-3">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div class="min-w-0">
              <p class="fw-semibold mb-0">{{ expense.name }}</p>
              <p class="small text-muted mb-0">
                {{ typeExpenseMap.get(expense.type_expense_id) || 'Tipo sconosciuto' }} | {{ expense.expense_kind || 'other' }}
              </p>
              <p class="small text-muted mb-0">
                {{ asDate(expense.paidAt)?.toLocaleDateString('it-IT') }} | {{ expense.status }}
              </p>
              <p v-if="expense.attachments?.length" class="small mb-0">
                Allegati: {{ expense.attachments.length }}
              </p>
            </div>
            <div class="text-end">
              <p class="fw-semibold mb-2">{{ formatMoney(expense.price) }}</p>
              <Btn type="button" color="danger" variant="outline" icon="delete" @click="onDeleteExpense(expense.id)">
                Elimina
              </Btn>
            </div>
          </div>
        </article>

        <p v-if="!sortedExpenses.length" class="text-muted small mt-2 mb-0">Nessuna spesa registrata.</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dropzone {
  border: 1px dashed rgba(84, 44, 58, 0.25);
  border-radius: 8px;
  padding: 0.65rem;
  background: rgba(255, 255, 255, 0.6);
}

.min-w-0 {
  min-width: 0;
}
</style>

