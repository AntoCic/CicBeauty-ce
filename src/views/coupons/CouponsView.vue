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
  type Gender,
  useStoreWatch,
} from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { Timestamp } from 'firebase/firestore'
import { computed, ref } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { Auth } from '../../main'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { typeCouponStore } from '../../stores/typeCouponStore'
import { asDate } from '../../utils/date'

type CouponForm = {
  code: string
  title: string
  note: string
  usage: number | string
  type_coupon_id: string
  client_id: string
  valid_from: string
  valid_to: string
  meta_json: string
}

type QuickClientForm = {
  name: string
  surname: string
  phone_number: string
  gender: Gender
  birthdate: string
}

type SetFieldValue = (field: string, value: unknown, shouldValidate?: boolean) => void

useStoreWatch([
  { store: couponStore, getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } } },
  { store: typeCouponStore, getOpts: { orderBy: { fieldPath: 'name', directionStr: 'asc' } } },
])

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const formKey = ref(0)
const fileValue = ref<FieldFileValue>([])
const isUploading = ref(false)
const isClientModalOpen = ref(false)
const isCreatingClient = ref(false)
const quickClientError = ref('')
const quickClientForm = ref<QuickClientForm>(defaultQuickClientForm())

const schema = toTypedSchema(
  yup.object({
    code: yup.string().required('Campo obbligatorio'),
    title: yup.string().required('Campo obbligatorio'),
    note: yup.string().default(''),
    usage: yup.number().typeError('Numero non valido').min(0).required('Campo obbligatorio'),
    type_coupon_id: yup.string().required('Campo obbligatorio'),
    client_id: yup.string().default(''),
    valid_from: yup.string().default(''),
    valid_to: yup.string().default(''),
    meta_json: yup.string().default('{}'),
  }),
)

const initialValues = computed<CouponForm>(() => ({
  code: '',
  title: '',
  note: '',
  usage: 0,
  type_coupon_id: '',
  client_id: '',
  valid_from: '',
  valid_to: '',
  meta_json: '{}',
}))

const sortedCoupons = computed(() =>
  [...couponStore.itemsActiveArray].sort((a, b) => a.code.localeCompare(b.code, 'it')),
)
const typeCouponById = computed(() => new Map(typeCouponStore.itemsActiveArray.map((item) => [item.id, item])))

function normalizeString(value: unknown, fallback = '') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function normalizeNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function normalizeGenderValue(value: unknown): Gender {
  const normalized = normalizeString(value).toLowerCase()
  if (normalized === 'm' || normalized === 'o' || normalized === 'f') return normalized
  return 'f'
}

function defaultUpdateBy() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

function resetFileSelection() {
  fileValue.value = []
}

function defaultQuickClientForm(): QuickClientForm {
  return {
    name: '',
    surname: '',
    phone_number: '',
    gender: 'f',
    birthdate: '',
  }
}

function resetQuickClientForm() {
  quickClientForm.value = defaultQuickClientForm()
  quickClientError.value = ''
}

function openQuickClientModal() {
  resetQuickClientForm()
  isClientModalOpen.value = true
}

function closeQuickClientModal() {
  if (isCreatingClient.value) return
  isClientModalOpen.value = false
  quickClientError.value = ''
}

function sanitizeFileName(name: string) {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return safe || 'coupon-file'
}

function stripFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) return fileName
  return fileName.slice(0, dotIndex)
}

function parseMeta(metaRaw: unknown) {
  const normalized = String(metaRaw ?? '').trim()
  if (!normalized) return {} as Record<string, any>

  let parsed: unknown
  try {
    parsed = JSON.parse(normalized)
  } catch (error) {
    throw new Error(`Meta JSON non valido: ${(error as Error).message}`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Meta JSON deve essere un oggetto')
  }

  return parsed as Record<string, any>
}

async function uploadCouponFiles(files: File[], couponId: string) {
  if (!couponStore.storageFolder) {
    throw new Error('Cartella allegati coupon non disponibile')
  }

  const batchId = Date.now()
  return uploadFilesToUrls(files, async (file, index) => {
    const extension = getFileExtension(file)
    const baseName = sanitizeFileName(stripFileExtension(file.name))
    const filename = extension
      ? `${couponId}/files/${batchId}_${index}_${baseName}.${extension}`
      : `${couponId}/files/${batchId}_${index}_${baseName}`
    const upload = await couponStore.storageFolder!.update(filename, file)
    return upload.url
  })
}

async function onQuickClientSubmit(setFieldValue: SetFieldValue) {
  const payload = {
    name: normalizeString(quickClientForm.value.name),
    surname: normalizeString(quickClientForm.value.surname),
    phone_number: normalizeString(quickClientForm.value.phone_number),
    gender: normalizeGenderValue(quickClientForm.value.gender),
    birthdate: normalizeString(quickClientForm.value.birthdate),
    email: '',
    note: '',
    preferredOperatorIds: [] as string[],
    preferred: [] as string[],
    updateBy: defaultUpdateBy(),
  }

  if (!payload.name || !payload.surname) {
    quickClientError.value = 'Nome e cognome sono obbligatori'
    return
  }

  isCreatingClient.value = true
  quickClientError.value = ''
  try {
    const created = await clientStore.add(payload)
    setFieldValue('client_id', created.id, true)
    isClientModalOpen.value = false
    resetQuickClientForm()
    toast.success('Cliente creato')
  } catch (error) {
    console.error(error)
    quickClientError.value = 'Errore creazione cliente'
  } finally {
    isCreatingClient.value = false
  }
}

async function onSubmit(values: Record<string, unknown>) {
  const selectedFiles = toFileArray(fileValue.value)
  if (selectedFiles.length && !couponStore.storageFolder) {
    toast.error('Cartella allegati coupon non disponibile')
    return
  }

  try {
    const payload = {
      code: normalizeString(values.code).toUpperCase(),
      title: normalizeString(values.title),
      note: normalizeString(values.note),
      active: true,
      valid_from: normalizeString(values.valid_from)
        ? Timestamp.fromDate(new Date(`${normalizeString(values.valid_from)}T00:00:00`))
        : undefined,
      valid_to: normalizeString(values.valid_to)
        ? Timestamp.fromDate(new Date(`${normalizeString(values.valid_to)}T23:59:59`))
        : undefined,
      usage: normalizeNumber(values.usage, 0),
      client_id: normalizeString(values.client_id) || undefined,
      treatment_ids: [] as string[],
      product_ids: [] as string[],
      type_coupon_id: normalizeString(values.type_coupon_id) || undefined,
      fileUrls: [] as string[],
      meta: parseMeta(values.meta_json),
      updateBy: defaultUpdateBy(),
    }

    isUploading.value = true
    const created = await couponStore.add(payload)

    if (selectedFiles.length) {
      const uploadedUrls = await uploadCouponFiles(selectedFiles, created.id)
      await created.update({
        fileUrls: uploadedUrls,
        updateBy: defaultUpdateBy(),
      })
    }

    formKey.value += 1
    resetFileSelection()
    toast.success('Coupon creato')
  } catch (error) {
    console.error(error)
    toast.error('Errore creazione coupon')
  } finally {
    isUploading.value = false
  }
}

async function toggleCouponActive(id: string, active: boolean) {
  const coupon = couponStore.findItemsById(id)
  if (!coupon) return
  try {
    await coupon.update({ active, updateBy: defaultUpdateBy() })
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
    await Promise.allSettled(
      (coupon.fileUrls ?? [])
        .map((url) => String(url ?? '').trim())
        .filter(Boolean)
        .map((url) => couponStore.storageFolder?.removeFromUrl(url)),
    )
    await coupon.delete(couponStore)
    toast.success('Coupon eliminato')
  } catch (error) {
    console.error(error)
    toast.error('Errore eliminazione coupon')
  }
}

function formatDate(value: unknown) {
  const date = asDate(value)
  if (!date) return '-'
  return date.toLocaleDateString('it-IT')
}

function couponTypeLabel(typeCouponId: string | undefined) {
  const normalized = normalizeString(typeCouponId)
  if (!normalized) return 'Tipo non assegnato'
  const typeCoupon = typeCouponById.value.get(normalized)
  return typeCoupon?.name ?? normalized
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Coupon" :to="{ name: 'home' }" />

    <div class="px-2 pb-4">
      <Form
        :key="formKey"
        class="card border-0 shadow-sm p-3 mb-3"
        :validation-schema="schema"
        :initial-values="initialValues"
        @submit="onSubmit"
        v-slot="{ isSubmitting, setFieldValue }"
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
            <label class="form-label">Uso</label>
            <Field name="usage" type="number" step="1" min="0" class="form-control" />
            <ErrorMessage name="usage" class="text-danger small" />
          </div>
          <div class="col-12 col-md-2">
            <label class="form-label">Tipo coupon</label>
            <Field name="type_coupon_id" as="select" class="form-select">
              <option value="">Seleziona tipo</option>
              <option v-for="typeCoupon in typeCouponStore.itemsActiveArray" :key="typeCoupon.id" :value="typeCoupon.id">
                {{ typeCoupon.name }}
              </option>
            </Field>
            <ErrorMessage name="type_coupon_id" class="text-danger small" />
          </div>

          <div class="col-12 col-md-6">
            <div class="d-flex align-items-center justify-content-between gap-2">
              <label class="form-label mb-0">Cliente dedicato (opzionale)</label>
              <Btn type="button" color="secondary" variant="outline" icon="person_add" @click="openQuickClientModal">
                Nuovo cliente
              </Btn>
            </div>
            <Field name="client_id" as="select" class="form-select mt-1">
              <option value="">Nessuno</option>
              <option v-for="client in clientStore.itemsActiveArray" :key="client.id" :value="client.id">
                {{ client.name }} {{ client.surname }}
              </option>
            </Field>
            <ErrorMessage name="client_id" class="text-danger small" />
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
            <label class="form-label">Note</label>
            <Field name="note" as="textarea" rows="2" class="form-control" />
            <ErrorMessage name="note" class="text-danger small" />
          </div>
          <div class="col-12">
            <label class="form-label">Meta (JSON object)</label>
            <Field name="meta_json" as="textarea" rows="4" class="form-control font-monospace" />
            <ErrorMessage name="meta_json" class="text-danger small" />
          </div>
          <div class="col-12">
            <label class="form-label">Allegati coupon</label>
            <FieldFile
              name="coupon_files"
              v-model="fileValue"
              multiple
              :show-errors="false"
              :disabled="isUploading"
              @clear="resetFileSelection"
            >
              <template #dropzone="{ open, clear, files, disabled, dragging }">
                <div class="dropzone-wrap" :class="{ dragging, disabled }">
                  <div class="fw-semibold">
                    {{ dragging ? 'Rilascia qui i file' : 'Trascina file o clicca per selezionare' }}
                  </div>
                  <div class="small text-muted mb-2">File selezionati: <strong>{{ files.length }}</strong></div>
                  <div class="d-flex gap-2 flex-wrap">
                    <Btn type="button" icon="upload_file" color="dark" :disabled="disabled" @click="open">
                      Scegli file
                    </Btn>
                    <Btn type="button" icon="delete" variant="outline" color="secondary" :disabled="disabled || !files.length" @click="clear">
                      Svuota selezione
                    </Btn>
                  </div>
                </div>
              </template>
            </FieldFile>
          </div>
        </div>

        <Btn class="mt-3" type="submit" color="dark" icon="add" :loading="isSubmitting || isUploading">
          Crea coupon
        </Btn>

        <div
          v-if="isClientModalOpen"
          class="coupon-client-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Nuovo cliente rapido"
        >
          <div class="coupon-client-modal__backdrop" @click="closeQuickClientModal"></div>
          <div class="coupon-client-modal__content card border-0 shadow-lg p-3 p-md-4">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h3 class="h6 mb-0">Nuovo cliente rapido</h3>
              <button type="button" class="btn-close" aria-label="Chiudi modal cliente" @click="closeQuickClientModal"></button>
            </div>

            <div class="row g-2">
              <div class="col-12 col-md-6">
                <label class="form-label">Nome</label>
                <input v-model="quickClientForm.name" class="form-control" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Cognome</label>
                <input v-model="quickClientForm.surname" class="form-control" />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">Gender</label>
                <select v-model="quickClientForm.gender" class="form-select">
                  <option value="f">F</option>
                  <option value="o">O</option>
                  <option value="m">M</option>
                </select>
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">Telefono</label>
                <input v-model="quickClientForm.phone_number" class="form-control" placeholder="+39..." />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">Compleanno</label>
                <input v-model="quickClientForm.birthdate" type="date" class="form-control" />
              </div>
            </div>

            <p v-if="quickClientError" class="text-danger small mt-2 mb-0">{{ quickClientError }}</p>

            <div class="d-flex gap-2 mt-3">
              <Btn type="button" color="dark" icon="save" :loading="isCreatingClient" @click="onQuickClientSubmit(setFieldValue)">
                Crea cliente
              </Btn>
              <Btn type="button" color="secondary" variant="outline" icon="close" :disabled="isCreatingClient" @click="closeQuickClientModal">
                Annulla
              </Btn>
            </div>
          </div>
        </div>
      </Form>

      <div class="vstack gap-2">
        <article v-for="coupon in sortedCoupons" :key="coupon.id" class="card border-0 shadow-sm p-3">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div class="min-w-0">
              <p class="fw-semibold mb-0">{{ coupon.code }} - {{ coupon.title }}</p>
              <p class="small text-muted mb-0">
                tipo: {{ couponTypeLabel(coupon.type_coupon_id) }} | uso: {{ coupon.usage }}
              </p>
              <p class="small text-muted mb-0">
                validita: {{ formatDate(coupon.valid_from) }} - {{ formatDate(coupon.valid_to) }}
              </p>
              <p class="small text-muted mb-0">{{ coupon.note || 'Nessuna nota' }}</p>
              <p v-if="coupon.fileUrls?.length" class="small mb-0 mt-1">
                Allegati: {{ coupon.fileUrls.length }}
              </p>
              <div v-if="coupon.fileUrls?.length" class="files-list">
                <a
                  v-for="(url, index) in coupon.fileUrls"
                  :key="`${coupon.id}-${index}`"
                  :href="url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  File {{ index + 1 }}
                </a>
              </div>
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
    </div>
  </div>
</template>

<style scoped lang="scss">
.dropzone-wrap {
  border: 1px dashed #cbd5e1;
  border-radius: 0.75rem;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.02);
}

.dropzone-wrap.dragging {
  border-color: #30475e;
  background: rgba(48, 71, 94, 0.08);
}

.dropzone-wrap.disabled {
  opacity: 0.65;
}

.coupon-client-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.coupon-client-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
}

.coupon-client-modal__content {
  position: relative;
  width: min(calc(100vw - 2rem), 720px);
  max-height: calc(100vh - 2rem);
  overflow: auto;
}

.files-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.files-list a {
  font-size: 0.78rem;
}

.min-w-0 {
  min-width: 0;
}
</style>
