<script setup lang="ts">
import { Btn, FieldTiptap, cicKitStore, normalizeGender, toast, type Gender } from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppointmentWatchManager } from '../../composables/useAppointmentWatchManager'
import type { Client } from '../../models/Client'
import { Auth } from '../../main'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { asDate } from '../../utils/date'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import ClientAppointmentCard from './components/ClientAppointmentCard.vue'
import ClientPersonCard from './components/ClientPersonCard.vue'
import { appointmentClientId, buildClientAppointmentSummary, type AppointmentLike } from './clientAppointmentUtils'

const EMPTY_NOTE_HTML = '<p></p>'

type ClientForm = {
  name: string
  surname: string
  phone_number: string
  gender: Gender
  email: string
  birthdate: string
  note: string
}

type GenderToggleOption = {
  value: 'f' | 'o' | 'm'
  label: string
  className: string
}

const genderToggleOptions: GenderToggleOption[] = [
  { value: 'f', label: 'F', className: 'gender-segment--f' },
  { value: 'o', label: 'O', className: 'gender-segment--o' },
  { value: 'm', label: 'M', className: 'gender-segment--m' },
]

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const current = ref<Client | undefined>(undefined)
const isLoading = ref(false)
const isDeleting = ref(false)
const isEditMode = ref(false)

const routeId = computed(() => String(route.params.id ?? '').trim())
const isCreateMode = computed(() => !routeId.value || routeId.value === 'new')
const CLIENT_EDIT_WATCH_SUSPEND_REASON = 'client-edit-view'
const { suspendAppointmentWatch, releaseAppointmentWatch } = useAppointmentWatchManager()

suspendAppointmentWatch(CLIENT_EDIT_WATCH_SUSPEND_REASON)
onBeforeUnmount(() => {
  releaseAppointmentWatch(CLIENT_EDIT_WATCH_SUSPEND_REASON)
})

const schema = toTypedSchema(
  yup.object({
    name: yup.string().required('Campo obbligatorio'),
    surname: yup.string().required('Campo obbligatorio'),
    phone_number: yup.string().default(''),
    gender: yup.string().oneOf(['f', 'm', 'o']).required('Campo obbligatorio').default('f'),
    email: yup.string().email('Email non valida').default(''),
    birthdate: yup.string().default(''),
    note: yup.string().default(EMPTY_NOTE_HTML),
  }),
)

const formKey = computed(() => (isCreateMode.value ? 'client-new' : current.value?.id ?? 'client-edit'))
const initialValues = computed<ClientForm>(() => ({
  name: current.value?.name ?? '',
  surname: current.value?.surname ?? '',
  phone_number: current.value?.phone_number ?? '',
  gender: normalizeGenderForForm(current.value?.gender),
  email: current.value?.email ?? '',
  birthdate: current.value?.birthdate ?? '',
  note: normalizeNoteForEditor(current.value?.note),
}))

const clientAppointments = computed(() => {
  if (!current.value) return []
  const clientId = current.value.id
  return [...appointmentStore.itemsActiveArray]
    .filter((appointment) => appointmentClientId(appointment) === clientId)
    .sort((a, b) => (asDate(b.date_time)?.getTime() ?? 0) - (asDate(a.date_time)?.getTime() ?? 0))
})

const appointmentSummary = computed(() => buildClientAppointmentSummary(clientAppointments.value))

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeGenderForForm(value: unknown): Gender {
  const normalized = normalizeGender(value)
  return normalized || 'f'
}

function normalizeNoteForEditor(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized || EMPTY_NOTE_HTML
}

function normalizeNoteForSave(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized && normalized !== EMPTY_NOTE_HTML ? normalized : ''
}

function defaultUpdateBy() {
  return String(Auth.user?.email ?? Auth.uid ?? 'admin').trim()
}

function enterEditMode() {
  isEditMode.value = true
}

function onCancelEdit() {
  if (isCreateMode.value) {
    void router.replace({ name: 'ClientsView' })
    return
  }
  isEditMode.value = false
}

function openAppointment(appointment: AppointmentLike) {
  router.push({ name: 'AppointmentEditView', params: { id: appointment.id } })
}

async function loadItem() {
  if (isCreateMode.value) {
    current.value = undefined
    isEditMode.value = true
    return
  }

  isLoading.value = true
  try {
    current.value = await clientStore.ensureOne(routeId.value)
    if (!current.value) {
      toast.warning('Cliente non trovato')
      return
    }
    isEditMode.value = false
  } catch (error) {
    console.error(error)
    toast.error('Errore caricamento cliente')
  } finally {
    isLoading.value = false
  }
}

async function onSubmit(values: Record<string, unknown>) {
  const payload = {
    name: normalizeString(values.name),
    surname: normalizeString(values.surname),
    phone_number: normalizeString(values.phone_number),
    gender: normalizeGenderForForm(values.gender),
    email: normalizeString(values.email),
    birthdate: normalizeString(values.birthdate),
    note: normalizeNoteForSave(values.note),
    updateBy: defaultUpdateBy(),
  }

  try {
    if (isCreateMode.value) {
      const created = await clientStore.add(payload)
      current.value = created
      isEditMode.value = false
      toast.success('Cliente creato')
      await router.replace({ name: 'ClientEditView', params: { id: created.id } })
      return
    }

    if (!current.value) return
    await current.value.update(payload)
    await loadItem()
    isEditMode.value = false
    toast.success('Cliente aggiornato')
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
    <HeaderApp :title="isCreateMode ? 'Nuovo cliente' : 'Cliente'" :to="{ name: 'ClientsView' }" />

    <div class="edit-wrapper mx-auto py-3">
      <p v-if="isLoading" class="text-muted small mt-3">Caricamento...</p>

      <Form
        v-else-if="isEditMode && (isCreateMode || current)"
        :key="formKey"
        :validation-schema="schema"
        :initial-values="initialValues"
        @submit="onSubmit"
        v-slot="{ isSubmitting, values, setFieldValue }"
        class="card border-0 shadow-sm p-3 p-md-4 form-shell"
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
            <label class="form-label">Telefono</label>
            <Field name="phone_number" class="form-control" placeholder="+39..." />
            <ErrorMessage name="phone_number" class="text-danger small" />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label d-block">Gender</label>
            <div class="gender-switch" role="radiogroup" aria-label="Selezione gender">
              <button
                v-for="option in genderToggleOptions"
                :key="option.value"
                type="button"
                class="gender-segment"
                :class="[option.className, { 'is-active': values.gender === option.value }]"
                :aria-pressed="values.gender === option.value"
                @click="setFieldValue('gender', option.value, true)"
              >
                {{ option.label }}
              </button>
            </div>
            <ErrorMessage name="gender" class="text-danger small d-block mt-1" />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Email</label>
            <Field name="email" class="form-control" placeholder="mail@dominio.it" />
            <ErrorMessage name="email" class="text-danger small" />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label">Data di nascita</label>
            <Field name="birthdate" type="date" class="form-control" />
            <ErrorMessage name="birthdate" class="text-danger small" />
          </div>

          <div class="col-12">
            <FieldTiptap
              name="note"
              label="Note"
              :required="false"
              :show-errors="false"
              :model-value="normalizeNoteForEditor(values.note)"
              toolbar-sticky-on="top"
              @update:model-value="(value) => setFieldValue('note', value)"
            />
            <ErrorMessage name="note" class="text-danger small" />
          </div>

          <template v-if="!isCreateMode">
            <div class="col-12 col-md-6">
              <label class="form-label">user_id (sola lettura)</label>
              <input class="form-control" :value="current?.user_id || '-'" disabled readonly>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">old_id (sola lettura)</label>
              <input class="form-control" :value="current?.old_id || '-'" disabled readonly>
            </div>
          </template>
        </div>

        <div class="d-flex gap-2 mt-4 flex-wrap">
          <Btn type="submit" color="dark" icon="save" :loading="isSubmitting || isDeleting">
            {{ isCreateMode ? 'Crea' : 'Salva' }}
          </Btn>
          <Btn type="button" color="secondary" variant="outline" icon="close" :disabled="isSubmitting" @click="onCancelEdit">
            Annulla
          </Btn>
          <Btn
            v-if="!isCreateMode"
            type="button"
            color="danger"
            variant="outline"
            icon="delete"
            :loading="isDeleting"
            :disabled="isSubmitting"
            @click="onDeleteClient"
          >
            Elimina
          </Btn>
        </div>
      </Form>

      <div v-else-if="current" class="view-shell">
        <ClientPersonCard
          :name="current.name"
          :surname="current.surname"
          :gender="current.gender"
          :phone-number="current.phone_number"
          :email="current.email"
          :birthdate="current.birthdate"
          :note="current.note"
          :show-details="true"
          compact
          class="client-main-card mx-auto"
        >
          <template #actions>
            <Btn
              type="button"
              color="dark"
              variant="outline"
              icon="edit"
              title="Modifica cliente"
              aria-label="Modifica cliente"
              @click="enterEditMode"
            />
          </template>
        </ClientPersonCard>

        <div class="row g-2 mt-2">
          <div class="col-12 col-md-6">
            <ClientAppointmentCard
              title="Prossimo appuntamento"
              :appointment="appointmentSummary.next"
              empty-label="Nessun prossimo appuntamento"
              :show-today-emoji="appointmentSummary.hasTodayAppointment"
              today-emoji-label="&#x1F4C5; Oggi c'e un appuntamento"
            />
          </div>
          <div class="col-12 col-md-6">
            <ClientAppointmentCard
              title="Appuntamento precedente"
              :appointment="appointmentSummary.previous"
              empty-label="Nessun appuntamento precedente"
            />
          </div>
        </div>

        <div class="d-flex gap-2 mt-2 flex-wrap">
          <Btn type="button" color="danger" variant="outline" icon="delete" :loading="isDeleting" @click="onDeleteClient">
            Elimina cliente
          </Btn>
        </div>

        <section class="mt-3">
          <h2 class="h6 mb-2">Appuntamenti cliente</h2>
          <div class="vstack gap-2">
            <ClientAppointmentCard
              v-for="appointment in clientAppointments"
              :key="appointment.id"
              title="Appuntamento"
              :appointment="appointment"
              :show-status="true"
              :clickable="true"
              @click="openAppointment"
            />
            <p v-if="!clientAppointments.length" class="text-muted small mb-0">Nessun appuntamento trovato per questo cliente.</p>
          </div>
        </section>
      </div>

      <p v-else class="text-muted small mt-3">Cliente non trovato.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.edit-wrapper {
  max-width: 880px;
}

.form-shell {
  max-width: 760px;
  margin-inline: auto;
}

.client-main-card {
  max-width: 520px;
}

.gender-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
}

.gender-segment {
  border: 1px solid #d6d8da;
  background: #ffffff;
  color: #212529;
  border-radius: 0.45rem;
  font-weight: 700;
  line-height: 1;
  min-height: 2.4rem;
  transition: all 0.18s ease;
}

.gender-segment--f {
  border-color: rgba(214, 51, 132, 0.42);
  background: rgba(214, 51, 132, 0.1);
  color: #d63384;
}

.gender-segment--o {
  border-color: rgba(17, 17, 17, 0.45);
  background: rgba(17, 17, 17, 0.1);
  color: #111111;
}

.gender-segment--m {
  border-color: rgba(13, 110, 253, 0.42);
  background: rgba(13, 110, 253, 0.1);
  color: #0d6efd;
}

.gender-segment--f.is-active {
  background: #d63384;
  border-color: #d63384;
  color: #ffffff;
}

.gender-segment--o.is-active {
  background: #111111;
  border-color: #111111;
  color: #ffffff;
}

.gender-segment--m.is-active {
  background: #0d6efd;
  border-color: #0d6efd;
  color: #ffffff;
}
</style>

