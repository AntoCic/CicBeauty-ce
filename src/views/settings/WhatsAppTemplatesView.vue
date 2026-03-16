<script setup lang="ts">
import { Btn, cicKitStore, defaultUserPermission, toast, useChangeHeader, useStoreWatch } from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed, nextTick, ref } from 'vue'
import { Auth } from '../../main'
import {
  WHATSAPP_TEMPLATE_DEFAULTS,
  WHATSAPP_TEMPLATE_KEYS,
  mergeWhatsAppTemplateWithDefaults,
  type WhatsAppTemplateKey,
} from '../../models/WhatsAppTemplate'
import { whatsAppTemplateStore } from '../../stores/whatsAppTemplateStore'
import {
  WHATSAPP_PLACEHOLDER_DEFINITIONS,
  replaceWhatsAppPlaceholders,
  type WhatsAppTemplateVariables,
} from '../../utils/whatsapp'
import { hasPermissionAccess } from '../../utils/permissions'

useChangeHeader('Template WhatsApp', { name: 'home' })

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const canManage = computed(() => hasPermissionAccess(defaultUserPermission.ADMIN))
useStoreWatch(canManage.value ? [{ store: whatsAppTemplateStore }] : [])

const templateSections = [
  {
    key: 'confirmationTemplate',
    title: 'Conferma appuntamento',
    description: 'Usato quando crei un nuovo appuntamento.',
  },
  {
    key: 'updateTemplate',
    title: 'Modifica appuntamento',
    description: 'Usato quando salvi modifiche su un appuntamento esistente.',
  },
  {
    key: 'deleteTemplate',
    title: 'Cancellazione appuntamento',
    description: 'Usato quando elimini un appuntamento.',
  },
  {
    key: 'reminderTemplate',
    title: 'Promemoria appuntamento',
    description: 'Usato per i reminder di domani dalla vista giorno.',
  },
] as const satisfies Array<{ key: WhatsAppTemplateKey; title: string; description: string }>

type WhatsAppTemplatesForm = {
  confirmationTemplate: string
  updateTemplate: string
  deleteTemplate: string
  reminderTemplate: string
  updateBy: string
}

const config = computed(() => whatsAppTemplateStore.getConfig())
const configData = computed(() => mergeWhatsAppTemplateWithDefaults(config.value?.toData()))
const formKey = computed(() => `${configData.value.id}:${config.value?.updatedAt?.seconds ?? 0}`)

const defaultUpdateBy = computed(() => {
  const email = String(Auth.user?.email ?? '').trim()
  if (email) return email
  const uid = String(Auth.uid ?? '').trim()
  if (uid) return uid
  return 'admin'
})

const schema = toTypedSchema(
  yup.object({
    confirmationTemplate: yup.string().trim().required('Campo obbligatorio'),
    updateTemplate: yup.string().trim().required('Campo obbligatorio'),
    deleteTemplate: yup.string().trim().required('Campo obbligatorio'),
    reminderTemplate: yup.string().trim().required('Campo obbligatorio'),
    updateBy: yup.string().trim().required('Campo obbligatorio'),
  }),
)

const initialValues = computed<WhatsAppTemplatesForm>(() => ({
  confirmationTemplate: configData.value.confirmationTemplate,
  updateTemplate: configData.value.updateTemplate,
  deleteTemplate: configData.value.deleteTemplate,
  reminderTemplate: configData.value.reminderTemplate,
  updateBy: configData.value.updateBy || defaultUpdateBy.value,
}))

const previewVariables: WhatsAppTemplateVariables = {
  '[NOME]': 'Giulia',
  '[COGNOME]': 'Rossi',
  '[GIORNO]': 'lunedi',
  '[DATA]': '16/03/2026',
  '[ORA]': '15:30',
  '[DURATA]': '1h 15m',
  '[PREZZO]': '\u20AC65,00',
  '[TRATTAMENTI]': 'Pulizia viso, Laminazione sopracciglia',
  '[INDIRIZZO]': 'Via Enrico de Nicola, 16',
}

const textAreaRefs = ref<Partial<Record<WhatsAppTemplateKey, HTMLTextAreaElement>>>({})

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function setTemplateTextareaRef(key: WhatsAppTemplateKey, element: HTMLTextAreaElement | null) {
  if (!element) {
    delete textAreaRefs.value[key]
    return
  }
  textAreaRefs.value[key] = element
}

function templateValue(values: Record<string, unknown>, key: WhatsAppTemplateKey) {
  return String(values[key] ?? '')
}

function insertPlaceholder(
  key: WhatsAppTemplateKey,
  token: string,
  values: Record<string, unknown>,
  setFieldValue: (field: string, value: unknown) => void,
) {
  const current = templateValue(values, key)
  const textarea = textAreaRefs.value[key]

  if (!textarea) {
    const spacer = current && !/\s$/.test(current) ? ' ' : ''
    setFieldValue(key, `${current}${spacer}${token}`)
    return
  }

  const start = textarea.selectionStart ?? current.length
  const end = textarea.selectionEnd ?? current.length
  const next = `${current.slice(0, start)}${token}${current.slice(end)}`
  setFieldValue(key, next)

  void nextTick(() => {
    textarea.focus()
    const cursor = start + token.length
    textarea.setSelectionRange(cursor, cursor)
  })
}

function resetTemplateField(key: WhatsAppTemplateKey, setFieldValue: (field: string, value: unknown) => void) {
  setFieldValue(key, WHATSAPP_TEMPLATE_DEFAULTS[key])
}

function resetAllTemplates(setFieldValue: (field: string, value: unknown) => void) {
  for (const key of WHATSAPP_TEMPLATE_KEYS) {
    setFieldValue(key, WHATSAPP_TEMPLATE_DEFAULTS[key])
  }
}

function previewMessage(values: Record<string, unknown>, key: WhatsAppTemplateKey) {
  return replaceWhatsAppPlaceholders(templateValue(values, key), previewVariables)
}

async function onSubmit(values: Record<string, unknown>) {
  if (!canManage.value) {
    toast.error('Permessi insufficienti per modificare i template WhatsApp.')
    return
  }

  const payload: WhatsAppTemplatesForm = {
    confirmationTemplate: normalizeText(values.confirmationTemplate),
    updateTemplate: normalizeText(values.updateTemplate),
    deleteTemplate: normalizeText(values.deleteTemplate),
    reminderTemplate: normalizeText(values.reminderTemplate),
    updateBy: normalizeText(values.updateBy) || defaultUpdateBy.value,
  }

  try {
    if (config.value) {
      await config.value.update(payload)
    } else {
      await whatsAppTemplateStore.add({
        id: configData.value.id,
        ...payload,
      })
    }

    toast.success('Template WhatsApp salvati')
  } catch (error) {
    console.error(error)
    toast.error('Errore nel salvataggio dei template WhatsApp')
  }
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <p v-if="!canManage" class="text-muted small mt-3">
      Sezione disponibile solo per utenti admin.
    </p>

    <Form
      v-else
      :key="formKey"
      class="card border-0 shadow-sm p-3 my-3"
      :validation-schema="schema"
      :initial-values="initialValues"
      @submit="onSubmit"
      v-slot="{ isSubmitting, values, setFieldValue }"
    >
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h2 class="h6 mb-1">Gestione messaggi WhatsApp</h2>
          <p class="text-muted small mb-0">
            Usa i placeholder per riempire automaticamente nome, giorno, ora, durata e prezzo.
          </p>
        </div>

        <Btn type="button" color="secondary" class="btn-sm" @click="resetAllTemplates(setFieldValue)">
          Ripristina tutti i default
        </Btn>
      </div>

      <div class="mb-3">
        <label class="form-label">Aggiornato da</label>
        <Field name="updateBy" class="form-control" />
        <ErrorMessage name="updateBy" class="text-danger small" />
      </div>

      <article v-for="section in templateSections" :key="section.key" class="template-card">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
          <div>
            <h3 class="h6 mb-1">{{ section.title }}</h3>
            <p class="text-muted small mb-0">{{ section.description }}</p>
          </div>

          <Btn type="button" color="secondary" class="btn-sm" @click="resetTemplateField(section.key, setFieldValue)">
            Default
          </Btn>
        </div>

        <div class="placeholder-pills mb-2">
          <button
            v-for="placeholder in WHATSAPP_PLACEHOLDER_DEFINITIONS"
            :key="`${section.key}-${placeholder.token}`"
            type="button"
            class="placeholder-pill"
            :title="`Inserisci ${placeholder.label}`"
            @click="insertPlaceholder(section.key, placeholder.token, values, setFieldValue)"
          >
            {{ placeholder.token }}
          </button>
        </div>

        <Field :name="section.key" v-slot="{ field, handleChange, handleBlur }">
          <textarea
            :value="field.value"
            class="form-control template-textarea"
            rows="8"
            @input="handleChange"
            @blur="handleBlur"
            :ref="(element) => setTemplateTextareaRef(section.key, element as HTMLTextAreaElement | null)"
          />
        </Field>
        <ErrorMessage :name="section.key" class="text-danger small" />

        <div class="preview-box mt-2">
          <small class="text-muted d-block mb-1">Preview con valori esempio</small>
          <div class="preview-content">{{ previewMessage(values, section.key) }}</div>
        </div>
      </article>

      <Btn class="mt-3" type="submit" color="dark" icon="save" :loading="isSubmitting">
        Salva template WhatsApp
      </Btn>
    </Form>
  </div>
</template>

<style scoped lang="scss">
.template-card {
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.84);
  margin-bottom: 0.85rem;
}

.placeholder-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.placeholder-pill {
  border: 1px solid rgba(84, 44, 58, 0.26);
  background: rgba(84, 44, 58, 0.08);
  color: #4b2935;
  border-radius: 999px;
  font-size: 0.74rem;
  padding: 0.2rem 0.55rem;
  cursor: pointer;
}

.placeholder-pill:hover {
  background: rgba(84, 44, 58, 0.14);
}

.template-textarea {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.82rem;
  line-height: 1.35;
  min-height: 10rem;
}

.preview-box {
  border: 1px dashed rgba(84, 44, 58, 0.24);
  border-radius: 0.5rem;
  background: rgba(247, 241, 242, 0.58);
  padding: 0.5rem;
}

.preview-content {
  white-space: pre-wrap;
  font-size: 0.8rem;
  color: #3f2430;
}
</style>
