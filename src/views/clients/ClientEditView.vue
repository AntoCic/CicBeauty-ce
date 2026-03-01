<script setup lang="ts">
import { Btn, cicKitStore, toast, useStoreWatch } from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Client } from '../../models/Client'
import { Auth } from '../../main'
import { clientStore } from '../../stores/clientStore'
import HeaderApp from '../../components/HeaderApp.vue'
import { hasBetaFeaturesAccess, hasOperatorAccess } from '../../utils/permissions'

type ClientForm = {
  name: string
  surname: string
  phone_number: string
  phone_numbers_csv: string
  email: string
  emails_csv: string
  note: string
  old_id: string
}

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const current = ref<Client | undefined>(undefined)
const isLoading = ref(false)
const isDeleting = ref(false)

const canOperate = computed(() => hasOperatorAccess())
const hasBetaFeatures = computed(() => hasBetaFeaturesAccess())
const routeId = computed(() => String(route.params.id ?? '').trim())
const isCreateMode = computed(() => !routeId.value || routeId.value === 'new')

useStoreWatch(
  canOperate.value
    ? [{ store: clientStore, getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' }, forceLocalSet: true } }]
    : [],
)

const schema = toTypedSchema(
  yup.object({
    name: yup.string().required('Campo obbligatorio'),
    surname: yup.string().required('Campo obbligatorio'),
    phone_number: yup.string().default(''),
    phone_numbers_csv: yup.string().default(''),
    email: yup.string().email('Email non valida').default(''),
    emails_csv: yup.string().default(''),
    note: yup.string().default(''),
    old_id: yup.string().default(''),
  }),
)

const formKey = computed(() => (isCreateMode.value ? 'client-new' : current.value?.id ?? 'client-edit'))
const initialValues = computed<ClientForm>(() => ({
  name: current.value?.name ?? '',
  surname: current.value?.surname ?? '',
  phone_number: current.value?.phone_number ?? '',
  phone_numbers_csv: (current.value?.phone_numbers ?? []).join(', '),
  email: current.value?.email ?? '',
  emails_csv: (current.value?.emails ?? []).join(', '),
  note: current.value?.note ?? '',
  old_id: current.value?.old_id ?? '',
}))

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeCsv(value: unknown) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function defaultUpdateBy() {
  return String(Auth.user?.email ?? Auth.uid ?? 'admin').trim()
}

async function loadItem() {
  if (!canOperate.value) return
  if (isCreateMode.value) {
    current.value = undefined
    return
  }

  isLoading.value = true
  try {
    current.value = await clientStore.ensureOne(routeId.value)
    if (!current.value) {
      toast.warning('Cliente non trovato')
    }
  } catch (error) {
    console.error(error)
    toast.error('Errore caricamento cliente')
  } finally {
    isLoading.value = false
  }
}

async function onSubmit(values: Record<string, unknown>) {
  if (!canOperate.value) {
    toast.error('Permesso OPERATORE richiesto')
    return
  }

  const payload = {
    name: normalizeString(values.name),
    surname: normalizeString(values.surname),
    phone_number: normalizeString(values.phone_number),
    phone_numbers: normalizeCsv(values.phone_numbers_csv),
    email: normalizeString(values.email),
    emails: normalizeCsv(values.emails_csv),
    note: normalizeString(values.note),
    old_id: hasBetaFeatures.value ? normalizeString(values.old_id) : '',
    updateBy: defaultUpdateBy(),
  }

  try {
    if (isCreateMode.value) {
      await clientStore.add(payload)
      toast.success('Cliente creato')
      await router.replace({ name: 'ClientsView' })
      return
    }

    if (!current.value) return
    await current.value.update(payload)
    toast.success('Cliente aggiornato')
    await router.replace({ name: 'ClientsView' })
  } catch (error) {
    console.error(error)
    toast.error('Errore salvataggio cliente')
  }
}

async function onDeleteClient() {
  if (!current.value || isCreateMode.value || isDeleting.value) return
  const ok = window.confirm(`Eliminare cliente "${current.value.name} ${current.value.surname}"?`)
  if (!ok) return

  isDeleting.value = true
  try {
    await current.value.delete(clientStore)
    toast.success('Cliente eliminato')
    await router.replace({ name: 'ClientsView' })
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione cliente')
  } finally {
    isDeleting.value = false
  }
}

onMounted(loadItem)
watch(() => route.params.id, loadItem)
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp :title="isCreateMode ? 'Nuovo cliente' : 'Modifica cliente'" :to="{ name: 'ClientsView' }" />

    <div class="edit-wrapper mx-auto py-3">
      <p v-if="!canOperate" class="text-muted small mt-3">Permesso `OPERATORE` richiesto.</p>
      <p v-else-if="isLoading" class="text-muted small mt-3">Caricamento...</p>

      <Form
        v-else-if="isCreateMode || current"
        :key="formKey"
        :validation-schema="schema"
        :initial-values="initialValues"
        @submit="onSubmit"
        v-slot="{ isSubmitting }"
        class="card border-0 shadow-sm p-3 p-md-4"
      >
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <label class="form-label">Nome</label>
            <Field name="name" class="form-control" />
            <ErrorMessage name="name" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Cognome</label>
            <Field name="surname" class="form-control" />
            <ErrorMessage name="surname" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Telefono principale</label>
            <Field name="phone_number" class="form-control" placeholder="+39..." />
            <ErrorMessage name="phone_number" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Email principale</label>
            <Field name="email" class="form-control" placeholder="mail@dominio.it" />
            <ErrorMessage name="email" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Telefoni aggiuntivi (CSV)</label>
            <Field name="phone_numbers_csv" class="form-control" placeholder="333111222, 333444555" />
            <ErrorMessage name="phone_numbers_csv" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label">Email aggiuntive (CSV)</label>
            <Field name="emails_csv" class="form-control" placeholder="a@mail.it, b@mail.it" />
            <ErrorMessage name="emails_csv" class="text-danger small" />
          </div>
          <div class="col-12">
            <label class="form-label">Note</label>
            <Field name="note" as="textarea" rows="3" class="form-control" />
            <ErrorMessage name="note" class="text-danger small" />
          </div>
          <div v-if="hasBetaFeatures" class="col-12 col-md-4">
            <label class="form-label">old_id (migrazione)</label>
            <Field name="old_id" class="form-control" />
            <ErrorMessage name="old_id" class="text-danger small" />
          </div>
        </div>

        <div class="d-flex gap-2 mt-4">
          <Btn type="submit" color="dark" icon="save" :loading="isSubmitting || isDeleting">
            {{ isCreateMode ? 'Crea' : 'Salva' }}
          </Btn>
          <Btn v-if="!isCreateMode" type="button" color="danger" variant="outline" icon="delete" :loading="isDeleting" @click="onDeleteClient">
            Elimina
          </Btn>
        </div>
      </Form>

      <p v-else class="text-muted small mt-3">Cliente non trovato.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.edit-wrapper {
  max-width: 780px;
}
</style>
