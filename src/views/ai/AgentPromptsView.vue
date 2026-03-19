<script setup lang="ts">
import { Btn, cicKitStore, toast, useChangeHeader } from 'cic-kit'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { computed, onMounted, ref } from 'vue'
import { Auth } from '../../main'
import {
  AGENT_PROMPT_DEFAULTS,
  AGENT_PROMPT_IDS,
  AGENT_PROMPT_LABELS,
  AGENT_PROMPT_MODEL_OPTIONS,
  mergeAgentPromptWithDefaults,
  type AgentPromptId,
} from '../../models/AgentPrompt'
import { agentPromptStore } from '../../stores/agentPromptStore'

type AgentPromptForm = {
  prompt: string
  tokens: number
  temperature: number
  model: string
  updateBy: string
}

useChangeHeader('Prompt AI Agents', { name: 'home' })

const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin)
onMounted(() => {
  if (!canManage.value) return
  void agentPromptStore.get()
})

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const selectedAgentId = ref<AgentPromptId>(AGENT_PROMPT_IDS[0])
const selectedPrompt = computed(() => agentPromptStore.findItemsById(selectedAgentId.value))
const selectedPromptData = computed(() =>
  mergeAgentPromptWithDefaults(selectedAgentId.value, selectedPrompt.value?.toData()),
)
const formKey = computed(
  () => `${selectedAgentId.value}:${selectedPrompt.value?.updatedAt?.seconds ?? 0}`,
)

const defaultUpdateBy = computed(() => {
  const email = String(Auth.user?.email ?? '').trim()
  if (email) return email
  const uid = String(Auth.uid ?? '').trim()
  if (uid) return uid
  return 'admin'
})

const schema = toTypedSchema(
  yup.object({
    prompt: yup.string().trim().required('Campo obbligatorio'),
    tokens: yup.number().typeError('Numero non valido').integer('Numero intero').min(1).max(8192).required(),
    temperature: yup.number().typeError('Numero non valido').min(0).max(1).required(),
    model: yup.string().oneOf([...AGENT_PROMPT_MODEL_OPTIONS]).required('Campo obbligatorio'),
    updateBy: yup.string().trim().required('Campo obbligatorio'),
  }),
)

const initialValues = computed<AgentPromptForm>(() => ({
  prompt: selectedPromptData.value.prompt,
  tokens: selectedPromptData.value.tokens,
  temperature: selectedPromptData.value.temperature,
  model: selectedPromptData.value.model,
  updateBy: selectedPromptData.value.updateBy || defaultUpdateBy.value,
}))

function normalizeTemperature(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0.35
  if (parsed < 0) return 0
  if (parsed > 1) return 1
  return Number(parsed.toFixed(2))
}

function normalizeTokens(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1400
  const normalized = Math.round(parsed)
  if (normalized < 1) return 1
  if (normalized > 8192) return 8192
  return normalized
}

async function onSubmit(values: Record<string, unknown>) {
  if (!canManage.value) {
    toast.error('Solo admin e super admin possono modificare i prompt agenti.')
    return
  }

  const payload: AgentPromptForm = {
    prompt: String(values.prompt ?? '').trim(),
    tokens: normalizeTokens(values.tokens),
    temperature: normalizeTemperature(values.temperature),
    model: String(values.model ?? '').trim() || AGENT_PROMPT_MODEL_OPTIONS[0],
    updateBy: String(values.updateBy ?? '').trim() || defaultUpdateBy.value,
  }

  try {
    if (selectedPrompt.value) {
      await selectedPrompt.value.update(payload)
    } else {
      await agentPromptStore.add({
        id: selectedAgentId.value,
        ...payload,
      })
    }
    toast.success('Prompt agente salvato')
  } catch (error) {
    console.error(error)
    toast.error('Errore salvataggio prompt agente')
  }
}

function resetPromptToDefault(setFieldValue: (field: string, value: unknown) => void) {
  setFieldValue('prompt', AGENT_PROMPT_DEFAULTS[selectedAgentId.value].prompt)
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <p v-if="!canManage" class="text-muted small mt-3">
      Questa sezione e riservata ad amministratori e super amministratori.
    </p>

    <Form
      v-if="canManage"
      :key="formKey"
      class="card border-0 shadow-sm p-3 my-3"
      :validation-schema="schema"
      :initial-values="initialValues"
      @submit="onSubmit"
      v-slot="{ isSubmitting, values, setFieldValue }"
    >
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label">Agente</label>
          <select v-model="selectedAgentId" class="form-select">
            <option v-for="agentId in AGENT_PROMPT_IDS" :key="agentId" :value="agentId">
              {{ AGENT_PROMPT_LABELS[agentId] }} ({{ agentId }})
            </option>
          </select>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Model</label>
          <Field name="model" as="select" class="form-select">
            <option v-for="modelOption in AGENT_PROMPT_MODEL_OPTIONS" :key="modelOption" :value="modelOption">
              {{ modelOption }}
            </option>
          </Field>
          <ErrorMessage name="model" class="text-danger small" />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Aggiornato da</label>
          <Field name="updateBy" class="form-control" />
          <ErrorMessage name="updateBy" class="text-danger small" />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Tokens</label>
          <Field name="tokens" type="number" class="form-control" min="1" max="8192" />
          <ErrorMessage name="tokens" class="text-danger small" />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label d-flex justify-content-between align-items-center">
            <span>Temperature</span>
            <strong>{{ Number(values.temperature ?? 0).toFixed(2) }}</strong>
          </label>
          <Field name="temperature" type="range" class="form-range" min="0" max="1" step="0.01" />
          <ErrorMessage name="temperature" class="text-danger small" />
        </div>

        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label mb-0">Prompt</label>
            <Btn type="button" color="secondary" class="btn-sm" @click="resetPromptToDefault(setFieldValue)">
              Reset prompt default
            </Btn>
          </div>
          <Field name="prompt" as="textarea" class="form-control prompt-textarea" rows="16" />
          <ErrorMessage name="prompt" class="text-danger small" />
        </div>
      </div>

      <Btn class="mt-3" type="submit" color="dark" icon="save" :loading="isSubmitting">
        Salva prompt agente
      </Btn>
    </Form>
  </div>
</template>

<style scoped>
.prompt-textarea {
  min-height: 18rem;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.85rem;
}
</style>
