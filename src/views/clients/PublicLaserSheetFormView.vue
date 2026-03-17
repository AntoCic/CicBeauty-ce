<script setup lang="ts">
import { Btn, cicKitStore } from 'cic-kit'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchPublicLaserShareSession,
  savePublicLaserShareSessionStep,
  type PublicLaserShareSession,
} from '../../call/clientLaserShare'
import { FITZPATRICK_QUESTIONS } from '../../models/laserSheet'

type StepDefinition = {
  id: string
  title: string
  subtitle?: string
  fields: string[]
  fitzQuestionId?: string
}

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const token = computed(() => String(route.params.token ?? '').trim())
const isLoading = ref(false)
const isSavingStep = ref(false)
const loadError = ref('')
const stepValidationError = ref('')
const session = ref<PublicLaserShareSession | null>(null)
const currentStepIndex = ref(0)
const skippedKeys = ref<string[]>([])

const fallbackStep: StepDefinition = {
  id: 'intro',
  title: '',
  fields: [],
}


const yesNoOptions = [
  { value: 'si', label: 'Si' },
  { value: 'no', label: 'No' },
]

const form = ref<Record<string, string>>({
  clientAddress: '',
  clientAge: '',
  clientGender: '',
  epilationAlreadyDone: '',
  epilationAreasDone: '',
  epilationResults: '',
  epilationCurrentMethods: '',
  medsWomanAnticoncezionali: 'no',
  medsWomanAnabolizzanti: 'no',
  medsWomanCortisonici: 'no',
  medsWomanAltri: '',
  medsManRicrescitaCapelli: 'no',
  medsManAnabolizzanti: 'no',
  medsManCortisonici: 'no',
  medsManAltri: '',
  gravidanzaAllattamento: 'no',
  pacemaker: 'no',
  epilessia: 'no',
  cicloRegolare: 'no',
  zonaInteresse: '',
  consensoFoto: 'no',
  fitzpatrick_q1: '',
  fitzpatrick_q2: '',
  fitzpatrick_q3: '',
  fitzpatrick_q4: '',
  fitzpatrick_q5: '',
  fitzpatrick_q6: '',
  fitzpatrick_q7: '',
  fitzpatrick_q8: '',
  fitzpatrick_q9: '',
  fitzpatrick_q10: '',
})

const steps = computed<StepDefinition[]>(() => {
  const gender = String(form.value.clientGender ?? '').toUpperCase()
  const hasEpilationDetails = Boolean(String(form.value.epilationAlreadyDone ?? '').trim())
  const includeWomanStep = gender !== 'M'
  const includeManStep = gender !== 'F'

  const list: StepDefinition[] = [
    {
      id: 'intro',
      title: 'Iniziamo ✨',
      fields: [],
    },
    {
      id: 'profile',
      title: 'Dati base',
      subtitle: 'Compila i dati principali per la scheda 👇',
      fields: ['clientAddress', 'clientAge', 'clientGender'],
    },
    {
      id: 'epilation-base',
      title: 'Questionario epilazione',
      subtitle: 'Hai gia effettuato trattamenti di epilazione progressiva permanente?',
      fields: ['epilationAlreadyDone'],
    },
  ]

  if (hasEpilationDetails) {
    list.push({
      id: 'epilation-details',
      title: 'Dettagli epilazione',
      subtitle: 'Completa le informazioni sui trattamenti gia fatti.',
      fields: ['epilationAreasDone', 'epilationResults', 'epilationCurrentMethods'],
    })
  }

  if (includeWomanStep) {
    list.push({
      id: 'meds-woman',
      title: 'Farmaci e condizioni - Donna',
      fields: [
        'medsWomanAnticoncezionali',
        'medsWomanAnabolizzanti',
        'medsWomanCortisonici',
        'medsWomanAltri',
        'gravidanzaAllattamento',
        'cicloRegolare',
      ],
    })
  }

  if (includeManStep) {
    list.push({
      id: 'meds-man',
      title: 'Farmaci e condizioni - Uomo',
      fields: ['medsManRicrescitaCapelli', 'medsManAnabolizzanti', 'medsManCortisonici', 'medsManAltri'],
    })
  }

  list.push(
    {
      id: 'conditions-general',
      title: 'Condizioni generali',
      fields: ['pacemaker', 'epilessia', 'consensoFoto'],
    },
    {
      id: 'zone',
      title: 'Zona da trattare 🎯',
      subtitle: 'Indica la zona principale di interesse.',
      fields: ['zonaInteresse'],
    },
  )

  for (const question of FITZPATRICK_QUESTIONS) {
    list.push({
      id: `fitz-${question.id}`,
      title: 'Questionario Fitzpatrick',
      subtitle: question.label,
      fields: [question.id],
      fitzQuestionId: question.id,
    })
  }

  list.push({
    id: 'done',
    title: 'Compilazione completata 🎉',
    subtitle: 'Hai finito: grazie per la collaborazione.',
    fields: [],
  })

  return list
})

const currentStep = computed<StepDefinition>(() => steps.value[currentStepIndex.value] ?? steps.value[0] ?? fallbackStep)
const totalSteps = computed(() => steps.value.length || 1)
const currentStepNumber = computed(() => Math.min(currentStepIndex.value + 1, totalSteps.value))
const progressValue = computed(() => Math.round((currentStepNumber.value / totalSteps.value) * 100))
const operatorFirstName = computed(() => String(session.value?.operatorFirstName ?? 'operatore').trim() || 'operatore')
const canSkipCurrentStep = computed(() => currentStep.value.fields.length > 0 && currentStep.value.id !== 'done')
const isCurrentStepSkipped = computed(() => currentStep.value.fields.some((field) => skippedKeys.value.includes(field)))
const fitzQuestionForStep = computed(() => {
  const questionId = currentStep.value.fitzQuestionId
  if (!questionId) return undefined
  return FITZPATRICK_QUESTIONS.find((item) => item.id === questionId)
})

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function setYesNo(field: string, value: string) {
  form.value[field] = value
}

function setFitzValue(field: string, value: string) {
  form.value[field] = value
}

function validateCurrentStep() {
  stepValidationError.value = ''
  if (!currentStep.value || !currentStep.value.fields.length) return true
  if (currentStep.value.id === 'profile') {
    const address = normalizeString(form.value.clientAddress)
    const age = Number(form.value.clientAge)
    const gender = normalizeString(form.value.clientGender).toUpperCase()
    if (!address || !Number.isFinite(age) || age <= 0 || (gender !== 'F' && gender !== 'M')) {
      stepValidationError.value = 'Compila indirizzo, eta e sesso oppure usa "Salta".'
      return false
    }
    return true
  }

  if (currentStep.value.id === 'zone') {
    if (!normalizeString(form.value.zonaInteresse)) {
      stepValidationError.value = 'Indica la zona da trattare oppure usa "Salta".'
      return false
    }
    return true
  }

  if (currentStep.value.fitzQuestionId) {
    const answer = normalizeString(form.value[currentStep.value.fitzQuestionId])
    if (!answer) {
      stepValidationError.value = 'Seleziona una risposta del quiz oppure usa "Salta".'
      return false
    }
    return true
  }

  return true
}

function hydrateFormFromSession(nextSession: PublicLaserShareSession) {
  const nextForm = { ...form.value }
  for (const [key, value] of Object.entries(nextSession.answers ?? {})) {
    nextForm[key] = String(value ?? '')
  }
  form.value = nextForm
  skippedKeys.value = Array.isArray(nextSession.skippedKeys) ? [...nextSession.skippedKeys] : []
}

function buildStepUpdates(fields: string[]) {
  const updates: Record<string, unknown> = {}
  for (const field of fields) {
    const raw = form.value[field]
    if (field.startsWith('fitzpatrick_') || field === 'clientAge') {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) {
        updates[field] = parsed
      }
      continue
    }
    updates[field] = raw ?? ''
  }
  return updates
}

async function loadSession() {
  if (!token.value) {
    loadError.value = 'Token mancante.'
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const loaded = await fetchPublicLaserShareSession(token.value)
    session.value = loaded
    hydrateFormFromSession(loaded)
    currentStepIndex.value = 0
    stepValidationError.value = ''
  } catch (error) {
    loadError.value = normalizeString((error as Error)?.message) || 'Sessione non disponibile o scaduta.'
  } finally {
    isLoading.value = false
  }
}

async function saveCurrentStep() {
  if (!session.value) return
  const fields = currentStep.value.fields
  if (!fields.length) return

  const payload = {
    token: token.value,
    updates: buildStepUpdates(fields),
    skippedKeys: [] as string[],
  }

  const response = await savePublicLaserShareSessionStep(payload)
  skippedKeys.value = response.skippedKeys
}

async function onSkipCurrentStep() {
  if (!canSkipCurrentStep.value || isSavingStep.value) return
  isSavingStep.value = true
  stepValidationError.value = ''
  try {
    const response = await savePublicLaserShareSessionStep({
      token: token.value,
      updates: {},
      skippedKeys: currentStep.value.fields,
    })
    skippedKeys.value = response.skippedKeys
    if (currentStepIndex.value < totalSteps.value - 1) {
      currentStepIndex.value += 1
    }
  } catch (error) {
    loadError.value = normalizeString((error as Error)?.message) || 'Errore durante il salto step.'
  } finally {
    isSavingStep.value = false
  }
}

async function onNextStep() {
  if (isSavingStep.value) return
  if (!currentStep.value) return
  if (currentStep.value.id === 'done') {
    router.push({ name: 'home' })
    return
  }
  if (!validateCurrentStep()) return

  isSavingStep.value = true
  try {
    await saveCurrentStep()
    if (currentStepIndex.value < totalSteps.value - 1) {
      currentStepIndex.value += 1
    }
  } catch (error) {
    loadError.value = normalizeString((error as Error)?.message) || 'Errore salvataggio step.'
  } finally {
    isSavingStep.value = false
  }
}

function onPrevStep() {
  if (isSavingStep.value) return
  if (currentStepIndex.value > 0) {
    currentStepIndex.value -= 1
    stepValidationError.value = ''
  }
}

watch(steps, (value) => {
  if (currentStepIndex.value > value.length - 1) {
    currentStepIndex.value = Math.max(0, value.length - 1)
  }
})

watch(
  () => currentStep.value.fields.map((field) => String(form.value[field] ?? '')).join('|'),
  () => {
    if (!stepValidationError.value) return
    stepValidationError.value = ''
  },
)

watch(token, loadSession)
onMounted(loadSession)
</script>

<template>
  <div class="container-fluid public-laser-page" :style="bgStyle">
    <div class="public-laser-shell mx-auto">
      <p v-if="isLoading" class="text-muted small">Caricamento sessione...</p>

      <article v-else-if="loadError" class="public-laser-card p-3">
        <h1 class="h6 mb-2">Link non disponibile</h1>
        <p class="mb-0 small text-muted">{{ loadError }}</p>
      </article>

      <template v-else-if="session">
        <article class="public-laser-card p-3 p-md-4">
          <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
            <div class="d-flex align-items-center gap-2 min-w-0">
              <Btn
                v-if="currentStepIndex > 0 && currentStep.id !== 'done'"
                type="button"
                color="secondary"
                variant="outline"
                icon="arrow_back"
                class="d-md-none"
                :disabled="isSavingStep"
                aria-label="Step precedente"
                @click="onPrevStep"
              />
              <h1 class="h6 mb-0">{{ currentStep.title }}</h1>
            </div>
            <span class="badge text-bg-light border">Step {{ currentStepNumber }}/{{ totalSteps }}</span>
          </div>
          <p v-if="currentStep.subtitle" class="small text-muted mb-2">{{ currentStep.subtitle }}</p>

          <div class="step-progress mb-3" aria-hidden="true">
            <span class="step-progress__fill" :style="{ width: `${progressValue}%` }"></span>
          </div>

          <div v-if="isCurrentStepSkipped" class="skip-info mb-2">
            Step segnato come "da completare con {{ operatorFirstName }}".
          </div>
          <p v-if="stepValidationError" class="step-validation-error mb-2">⚠️ {{ stepValidationError }}</p>

          <section v-if="currentStep.id === 'intro'" class="step-body">
            <p class="mb-2">Ciao {{ session.clientName }} 👋 grazie per la collaborazione.</p>
            <p class="mb-0 small text-muted">
              Le informazioni saranno visibili solo all'operatore 🔒. In ogni domanda puoi scegliere "Salta e completa
              con {{ operatorFirstName }}".
            </p>
          </section>

          <section v-else-if="currentStep.id === 'profile'" class="step-body row g-3">
            <div class="col-12">
              <label class="form-label">Indirizzo</label>
              <input v-model="form.clientAddress" type="text" class="form-control" placeholder="Via, citta..." />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Eta</label>
              <input v-model="form.clientAge" type="number" min="0" step="1" class="form-control" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label d-block">Sesso</label>
              <div class="chip-radio-group">
                <label class="chip-radio" :class="{ 'is-active': form.clientGender === 'F' }">
                  <input class="chip-radio__input" type="radio" name="clientGender" value="F" :checked="form.clientGender === 'F'" @change="form.clientGender = 'F'" />
                  <span>Donna</span>
                </label>
                <label class="chip-radio" :class="{ 'is-active': form.clientGender === 'M' }">
                  <input class="chip-radio__input" type="radio" name="clientGender" value="M" :checked="form.clientGender === 'M'" @change="form.clientGender = 'M'" />
                  <span>Uomo</span>
                </label>
              </div>
            </div>
          </section>

          <section v-else-if="currentStep.id === 'epilation-base'" class="step-body">
            <label class="form-label">Risposta</label>
            <textarea v-model="form.epilationAlreadyDone" rows="4" class="form-control"></textarea>
          </section>

          <section v-else-if="currentStep.id === 'epilation-details'" class="step-body row g-3">
            <div class="col-12">
              <label class="form-label">Quali aree ha trattato?</label>
              <textarea v-model="form.epilationAreasDone" rows="3" class="form-control"></textarea>
            </div>
            <div class="col-12">
              <label class="form-label">Che risultati ha ottenuto?</label>
              <textarea v-model="form.epilationResults" rows="3" class="form-control"></textarea>
            </div>
            <div class="col-12">
              <label class="form-label">Metodi depilazione abituali</label>
              <textarea v-model="form.epilationCurrentMethods" rows="3" class="form-control"></textarea>
            </div>
          </section>

          <section v-else-if="currentStep.id === 'meds-woman'" class="step-body vstack gap-2">
            <div class="toggle-row">
              <span>Anticoncezionali</span>
              <div class="yes-no-switch">
                <label v-for="option in yesNoOptions" :key="`medsWomanAnticoncezionali-${option.value}`" class="yes-no-switch__option" :class="{ 'is-active': form.medsWomanAnticoncezionali === option.value }">
                  <input class="yes-no-switch__input" type="radio" name="medsWomanAnticoncezionali" :value="option.value" @change="setYesNo('medsWomanAnticoncezionali', option.value)" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
            <div class="toggle-row">
              <span>Anabolizzanti</span>
              <div class="yes-no-switch">
                <label v-for="option in yesNoOptions" :key="`medsWomanAnabolizzanti-${option.value}`" class="yes-no-switch__option" :class="{ 'is-active': form.medsWomanAnabolizzanti === option.value }">
                  <input class="yes-no-switch__input" type="radio" name="medsWomanAnabolizzanti" :value="option.value" @change="setYesNo('medsWomanAnabolizzanti', option.value)" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
            <div class="toggle-row">
              <span>Cortisonici</span>
              <div class="yes-no-switch">
                <label v-for="option in yesNoOptions" :key="`medsWomanCortisonici-${option.value}`" class="yes-no-switch__option" :class="{ 'is-active': form.medsWomanCortisonici === option.value }">
                  <input class="yes-no-switch__input" type="radio" name="medsWomanCortisonici" :value="option.value" @change="setYesNo('medsWomanCortisonici', option.value)" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
            <label class="form-label mb-0">Altri farmaci</label>
            <input v-model="form.medsWomanAltri" type="text" class="form-control" />
          </section>

          <section v-else-if="currentStep.id === 'meds-man'" class="step-body vstack gap-2">
            <div class="toggle-row">
              <span>Ricrescita capelli</span>
              <div class="yes-no-switch">
                <label v-for="option in yesNoOptions" :key="`medsManRicrescitaCapelli-${option.value}`" class="yes-no-switch__option" :class="{ 'is-active': form.medsManRicrescitaCapelli === option.value }">
                  <input class="yes-no-switch__input" type="radio" name="medsManRicrescitaCapelli" :value="option.value" @change="setYesNo('medsManRicrescitaCapelli', option.value)" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
            <div class="toggle-row">
              <span>Anabolizzanti</span>
              <div class="yes-no-switch">
                <label v-for="option in yesNoOptions" :key="`medsManAnabolizzanti-${option.value}`" class="yes-no-switch__option" :class="{ 'is-active': form.medsManAnabolizzanti === option.value }">
                  <input class="yes-no-switch__input" type="radio" name="medsManAnabolizzanti" :value="option.value" @change="setYesNo('medsManAnabolizzanti', option.value)" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
            <div class="toggle-row">
              <span>Cortisonici</span>
              <div class="yes-no-switch">
                <label v-for="option in yesNoOptions" :key="`medsManCortisonici-${option.value}`" class="yes-no-switch__option" :class="{ 'is-active': form.medsManCortisonici === option.value }">
                  <input class="yes-no-switch__input" type="radio" name="medsManCortisonici" :value="option.value" @change="setYesNo('medsManCortisonici', option.value)" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
            <label class="form-label mb-0">Altri farmaci</label>
            <input v-model="form.medsManAltri" type="text" class="form-control" />
          </section>

          <section v-else-if="currentStep.id === 'conditions-general'" class="step-body vstack gap-2">
            <div class="toggle-row">
              <span>Pacemaker</span>
              <div class="yes-no-switch">
                <label v-for="option in yesNoOptions" :key="`pacemaker-${option.value}`" class="yes-no-switch__option" :class="{ 'is-active': form.pacemaker === option.value }">
                  <input class="yes-no-switch__input" type="radio" name="pacemaker" :value="option.value" @change="setYesNo('pacemaker', option.value)" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
            <div class="toggle-row">
              <span>Epilessia</span>
              <div class="yes-no-switch">
                <label v-for="option in yesNoOptions" :key="`epilessia-${option.value}`" class="yes-no-switch__option" :class="{ 'is-active': form.epilessia === option.value }">
                  <input class="yes-no-switch__input" type="radio" name="epilessia" :value="option.value" @change="setYesNo('epilessia', option.value)" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
            <div class="toggle-row">
              <span>Consenso foto</span>
              <div class="yes-no-switch">
                <label v-for="option in yesNoOptions" :key="`consensoFoto-${option.value}`" class="yes-no-switch__option" :class="{ 'is-active': form.consensoFoto === option.value }">
                  <input class="yes-no-switch__input" type="radio" name="consensoFoto" :value="option.value" @change="setYesNo('consensoFoto', option.value)" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
          </section>

          <section v-else-if="currentStep.id === 'zone'" class="step-body">
            <label class="form-label">Zona da trattare 🎯</label>
            <input v-model="form.zonaInteresse" type="text" class="form-control" placeholder="Es. inguine, gambe, ascelle..." />
          </section>

          <section v-else-if="fitzQuestionForStep" class="step-body">
            <label class="form-label d-block mb-2">{{ fitzQuestionForStep.label }}</label>
            <div class="fitz-options">
              <label
                v-for="option in fitzQuestionForStep.options"
                :key="`${fitzQuestionForStep.id}-${option.value}`"
                class="fitz-option"
                :class="{ 'is-active': form[fitzQuestionForStep.id] === String(option.value) }"
              >
                <input
                  class="fitz-option__input"
                  type="radio"
                  :name="fitzQuestionForStep.id"
                  :value="String(option.value)"
                  :checked="form[fitzQuestionForStep.id] === String(option.value)"
                  @change="setFitzValue(fitzQuestionForStep.id, String(option.value))"
                >
                <span class="fitz-option__text">{{ option.value }} : {{ option.label }}</span>
              </label>
            </div>
          </section>

          <section v-else class="step-body step-body--done">
            <div class="done-badge" aria-hidden="true">
              <span class="material-symbols-outlined">check_circle</span>
            </div>
            <h2 class="h5 mb-2 text-center">Compilazione completata! 🎉</h2>
            <p class="mb-1 text-center">Hai finito tutto correttamente ✅</p>
            <p class="mb-0 small text-muted text-center">
              Le tue risposte sono state salvate e l'operatore le rivedra con te.
            </p>
          </section>

          <div class="d-flex align-items-center justify-content-between gap-2 mt-3 flex-wrap">
            <Btn
              v-if="currentStepIndex > 0 && currentStep.id !== 'done'"
              type="button"
              color="secondary"
              variant="outline"
              class="d-none d-md-inline-flex"
              :disabled="isSavingStep"
              @click="onPrevStep"
            >
              Indietro
            </Btn>
            <div v-else></div>

            <div class="d-flex gap-2 flex-wrap">
              <Btn
                v-if="canSkipCurrentStep"
                type="button"
                color="secondary"
                variant="outline"
                :disabled="isSavingStep"
                @click="onSkipCurrentStep"
              >
                Salta e completa con {{ operatorFirstName }}
              </Btn>
              <Btn type="button" color="dark" :loading="isSavingStep" @click="onNextStep">
                {{ currentStep.id === 'done' ? 'Chiudi e torna alla home 🏠' : 'Avanti' }}
              </Btn>
            </div>
          </div>
        </article>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.public-laser-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding: 0.9rem 0.25rem;
}

.public-laser-shell {
  width: min(920px, 100%);
  padding-inline: 0.3rem;
}

.public-laser-card {
  border: 1px solid rgba(84, 44, 58, 0.22);
  border-radius: 1rem;
  background:
    radial-gradient(circle at 100% 0%, rgba(232, 179, 190, 0.32) 0%, transparent 52%),
    linear-gradient(165deg, rgba(255, 255, 255, 0.96), rgba(247, 241, 242, 0.94));
  box-shadow: 0 14px 26px rgba(37, 23, 30, 0.12);
}

.step-progress {
  height: 0.55rem;
  border-radius: 999px;
  background: rgba(84, 44, 58, 0.14);
  overflow: hidden;
}

.step-progress__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(95deg, #1f8a70 0%, #5c3543 100%);
  transition: width 0.24s ease;
}

.skip-info {
  font-size: 0.78rem;
  color: #7a4958;
  border: 1px dashed rgba(122, 73, 88, 0.42);
  border-radius: 0.55rem;
  padding: 0.42rem 0.52rem;
  background: rgba(255, 255, 255, 0.7);
}

.step-validation-error {
  font-size: 0.78rem;
  color: #7a1111;
  border: 1px solid rgba(190, 55, 55, 0.28);
  border-radius: 0.55rem;
  padding: 0.42rem 0.52rem;
  background: rgba(255, 243, 243, 0.88);
}

.step-body {
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 0.72rem;
  background: rgba(255, 255, 255, 0.78);
  padding: 0.8rem;
}

.step-body--done {
  position: relative;
  overflow: hidden;
  display: grid;
  justify-items: center;
  gap: 0.2rem;
  padding: 1.1rem 0.9rem;
}

.step-body--done::before {
  content: '';
  position: absolute;
  inset: -45% -25%;
  background: radial-gradient(circle, rgba(55, 164, 134, 0.18) 0%, transparent 58%);
  animation: doneGlow 2.4s ease-in-out infinite;
}

.done-badge {
  position: relative;
  z-index: 1;
  width: 4rem;
  height: 4rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #0f7b61;
  background: rgba(233, 252, 245, 0.92);
  border: 1px solid rgba(15, 123, 97, 0.32);
  animation: donePop 1s ease-in-out infinite alternate;
}

.done-badge .material-symbols-outlined {
  font-size: 2.2rem;
}

.min-w-0 {
  min-width: 0;
}

.chip-radio-group {
  display: flex;
  gap: 0.5rem;
}

.chip-radio {
  position: relative;
  border: 1px solid rgba(84, 44, 58, 0.22);
  border-radius: 999px;
  min-height: 2rem;
  min-width: 5.4rem;
  padding: 0.35rem 0.8rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #5c3543;
  background: rgba(255, 255, 255, 0.85);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.chip-radio.is-active {
  background: #5c3543;
  color: #fff;
}

.chip-radio__input {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.yes-no-switch {
  display: inline-flex;
  border: 1px solid rgba(84, 44, 58, 0.22);
  border-radius: 999px;
  padding: 0.12rem;
  background: rgba(255, 255, 255, 0.85);
}

.yes-no-switch__option {
  position: relative;
  min-width: 3rem;
  text-align: center;
  border-radius: 999px;
  padding: 0.22rem 0.6rem;
  font-size: 0.72rem;
  color: #6f4f5c;
}

.yes-no-switch__option.is-active {
  background: #5c3543;
  color: #fff;
}

.yes-no-switch__input {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.fitz-options {
  display: grid;
  gap: 0.4rem;
}

.fitz-option {
  position: relative;
  border: 1px solid rgba(84, 44, 58, 0.26);
  border-radius: 0.65rem;
  min-height: 2.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.74rem;
  line-height: 1.2;
  font-weight: 700;
  color: #5c3543;
  background: rgba(255, 255, 255, 0.92);
  padding: 0.4rem 0.6rem;
}

.fitz-option.is-active {
  background: #5c3543;
  color: #fff;
}

.fitz-option__input {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.fitz-option__text {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@keyframes donePop {
  from {
    transform: translateY(0) scale(1);
  }
  to {
    transform: translateY(-2px) scale(1.03);
  }
}

@keyframes doneGlow {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.08);
  }
}

@media (max-width: 767.98px) {
  .public-laser-page {
    align-items: flex-start;
  }
}
</style>

