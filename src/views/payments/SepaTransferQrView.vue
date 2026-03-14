<script setup lang="ts">
import { cicKitStore, useChangeHeader } from 'cic-kit'
import * as QRCode from 'qrcode'
import { computed, ref } from 'vue'
import { appConfigStore } from '../../stores/appConfigStore'
import {
  buildSepaEpcQrPayload,
  normalizeSepaBic,
  normalizeSepaIban,
  parseSepaAmountInput,
} from '../../utils/sepaEpcQr'

const DEFAULT_REMITTANCE_TEXT = 'Acquisto CNC Beauty'
type SepaViewStep = 'form' | 'preview'

useChangeHeader('QR Bonifico SEPA', { name: 'home' })

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const amountInput = ref('')
const remittanceInput = ref(DEFAULT_REMITTANCE_TEXT)
const qrImageDataUrl = ref('')
const qrRenderError = ref('')
const formError = ref('')
const isGeneratingQr = ref(false)
const appliedData = ref<{ amount: number; remittance: string } | null>(null)
const step = ref<SepaViewStep>('form')
let qrRenderToken = 0

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

const configData = computed(() => appConfigStore.getConfigData())
const beneficiaryName = computed(() => String(configData.value.sepaBeneficiaryName ?? '').trim())
const beneficiaryIban = computed(() => normalizeSepaIban(configData.value.sepaBeneficiaryIban))
const beneficiaryBic = computed(() => normalizeSepaBic(configData.value.sepaBeneficiaryBic))

const missingConfigFields = computed(() => {
  const missing: string[] = []
  if (!beneficiaryName.value) missing.push('Nome beneficiario')
  if (!beneficiaryIban.value) missing.push('IBAN beneficiario')
  return missing
})

const amountInputText = computed(() => normalizeText(amountInput.value))
const parsedAmount = computed(() => parseSepaAmountInput(amountInputText.value))
const isConfigReady = computed(() => missingConfigFields.value.length === 0)

async function onContinue() {
  if (!isConfigReady.value) {
    formError.value = 'Configura i dati SEPA in App Config prima di continuare.'
    return
  }

  if (!amountInputText.value) {
    formError.value = 'Inserisci un importo.'
    return
  }

  if (parsedAmount.value === null || parsedAmount.value <= 0) {
    formError.value = "Importo non valido. Usa massimo 2 decimali e un valore maggiore di zero."
    return
  }

  const remittance = normalizeText(remittanceInput.value)
  if (!remittance) {
    formError.value = 'Inserisci una causale.'
    return
  }

  let epcPayload = ''
  try {
    epcPayload = buildSepaEpcQrPayload({
      beneficiaryName: beneficiaryName.value,
      iban: beneficiaryIban.value,
      bic: beneficiaryBic.value,
      amount: parsedAmount.value,
      remittanceText: remittance,
    })
  } catch (error) {
    console.error(error)
    formError.value = 'Dati non validi per generare il QR.'
    return
  }

  formError.value = ''
  qrRenderError.value = ''
  appliedData.value = {
    amount: parsedAmount.value,
    remittance,
  }

  const runId = ++qrRenderToken
  isGeneratingQr.value = true
  step.value = 'preview'

  try {
    const nextQrDataUrl = await QRCode.toDataURL(epcPayload, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
    if (runId !== qrRenderToken) return
    qrImageDataUrl.value = nextQrDataUrl
  } catch (error) {
    console.error(error)
    if (runId !== qrRenderToken) return
    qrImageDataUrl.value = ''
    qrRenderError.value = 'Errore durante la generazione del QR.'
  } finally {
    if (runId === qrRenderToken) {
      isGeneratingQr.value = false
    }
  }
}

function goBackToForm() {
  step.value = 'form'
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <section class="sepa-page">
      <div v-if="!isConfigReady" class="alert alert-danger py-2 px-3 mb-3">
        <p class="fw-semibold mb-1">Configurazione SEPA incompleta</p>
        <p class="small mb-1">Campi mancanti in App Config:</p>
        <ul class="small mb-2">
          <li v-for="field in missingConfigFields" :key="field">{{ field }}</li>
        </ul>
        <p class="small mb-0">
          Compila i campi in
          <RouterLink :to="{ name: 'AppConfigView' }">App Config</RouterLink>
          e rientra in questa pagina.
        </p>
      </div>

      <Transition name="step-card" mode="out-in">
        <article v-if="step === 'form'" key="step-form" class="sepa-card sepa-card--form">
          <form class="sepa-form" @submit.prevent="onContinue">
            <div class="sepa-form__group">
              <label for="sepa-amount-input" class="sepa-form__label">Importo</label>
              <div class="amount-input-shell">
                <span class="amount-input-shell__currency">€</span>
                <input
                  id="sepa-amount-input"
                  v-model="amountInput"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputmode="decimal"
                  class="amount-input-shell__input"
                  placeholder="0,00"
                  :disabled="!isConfigReady"
                >
              </div>
            </div>

            <div class="sepa-form__group">
              <label for="sepa-remittance-input" class="sepa-form__label">Causale</label>
              <input
                id="sepa-remittance-input"
                v-model="remittanceInput"
                type="text"
                maxlength="140"
                class="form-control form-control-lg text-center"
                :disabled="!isConfigReady"
              >
            </div>

            <button type="submit" class="btn btn-dark sepa-continue-btn" :disabled="!isConfigReady || isGeneratingQr">
              {{ isGeneratingQr ? 'Generazione...' : 'Continua' }}
            </button>

            <p v-if="formError" class="text-danger small mt-2 mb-0 text-center">{{ formError }}</p>
          </form>
        </article>

        <article v-else key="step-preview" class="sepa-card sepa-card--preview">
          <button type="button" class="btn-back-edit" @click="goBackToForm" aria-label="Torna indietro">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Indietro</span>
          </button>

          <div class="amount-hero">
            <span class="amount-hero__currency">€</span>
            <span class="amount-hero__value">{{ appliedData?.amount.toFixed(2) ?? '0.00' }}</span>
          </div>

          <div class="applied-preview">
            <div class="applied-preview__row">
              <span>Beneficiario</span>
              <strong>{{ beneficiaryName }}</strong>
            </div>
            <div class="applied-preview__row">
              <span>IBAN</span>
              <strong>{{ beneficiaryIban }}</strong>
            </div>
            <div class="applied-preview__row">
              <span>Causale</span>
              <strong>{{ appliedData?.remittance }}</strong>
            </div>
          </div>

          <div class="qr-wrap">
            <img
              v-if="qrImageDataUrl"
              :src="qrImageDataUrl"
              class="sepa-qr-image"
              alt="QR bonifico SEPA EPC"
            >
            <p v-else-if="isGeneratingQr" class="text-muted small mb-0">Generazione QR in corso...</p>
            <p v-else-if="qrRenderError" class="text-danger small mb-0">{{ qrRenderError }}</p>
          </div>
        </article>
      </Transition>
    </section>
  </div>
</template>

<style scoped>
.sepa-page {
  width: min(580px, 100%);
  margin: 0 auto;
  padding-block: 0.75rem 1.25rem;
}

.sepa-card {
  position: relative;
  border-radius: 24px;
  padding: clamp(1.1rem, 2.8vw, 1.5rem);
  background:
    radial-gradient(circle at 14% 8%, rgba(232, 179, 190, 0.34), transparent 34%),
    radial-gradient(circle at 95% 96%, rgba(31, 94, 255, 0.12), transparent 35%),
    rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(84, 44, 58, 0.14);
  box-shadow: 0 12px 30px rgba(56, 30, 40, 0.14);
}

.sepa-card--form {
  min-height: 420px;
  display: grid;
  place-items: center;
}

.sepa-card--preview {
  min-height: 460px;
}

.sepa-form {
  width: min(430px, 100%);
  display: grid;
  gap: 1rem;
}

.sepa-form__group {
  display: grid;
  gap: 0.4rem;
}

.sepa-form__label {
  text-align: center;
  font-weight: 600;
  color: #3d232c;
  letter-spacing: 0.02em;
}

.amount-input-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 16px;
  background: #fff;
  padding: 0.35rem 0.55rem;
}

.amount-input-shell__currency {
  font-size: 1.5rem;
  font-weight: 700;
  color: #542c3a;
  margin-right: 0.35rem;
}

.amount-input-shell__input {
  border: 0;
  outline: 0;
  width: 100%;
  background: transparent;
  text-align: center;
  font-size: clamp(1.35rem, 4.2vw, 1.8rem);
  font-weight: 700;
  color: #2e1b22;
}

.amount-input-shell__input::placeholder {
  color: rgba(46, 27, 34, 0.35);
}

.sepa-continue-btn {
  margin-top: 0.3rem;
  min-height: 48px;
  border-radius: 999px;
  font-weight: 600;
}

.btn-back-edit {
  border: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: #3d232c;
  font-weight: 600;
  padding: 0.1rem 0.3rem;
}

.btn-back-edit .material-symbols-outlined {
  font-size: 1.1rem;
}

.amount-hero {
  margin-top: 0.35rem;
  margin-bottom: 0.9rem;
  min-height: 86px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  background: linear-gradient(130deg, #542c3a 0%, #7f3f57 48%, #965f74 100%);
  color: #fff;
  box-shadow: 0 12px 24px rgba(84, 44, 58, 0.24);
  animation: glowPulse 2.8s ease-in-out infinite;
}

.amount-hero__currency {
  font-size: clamp(1.5rem, 5vw, 2rem);
  font-weight: 700;
}

.amount-hero__value {
  font-size: clamp(1.7rem, 5.8vw, 2.35rem);
  font-weight: 800;
  letter-spacing: 0.02em;
}

.applied-preview {
  border: 1px solid #ececec;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  padding: 0.7rem;
  display: grid;
  gap: 0.35rem;
}

.applied-preview__row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.7rem;
  font-size: 0.8rem;
  color: #5e3a48;
}

.applied-preview__row strong {
  color: #2f1b23;
  font-weight: 700;
  text-align: right;
  overflow-wrap: anywhere;
}

.qr-wrap {
  margin-top: 0.85rem;
  border: 1px solid rgba(84, 44, 58, 0.16);
  border-radius: 16px;
  background: #fff;
  padding: 0.95rem;
  display: grid;
  place-items: center;
  min-height: 220px;
}

.sepa-qr-image {
  width: min(100%, 300px);
  height: auto;
  display: block;
  animation: qrReveal 360ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.step-card-enter-active,
.step-card-leave-active {
  transition: opacity 300ms ease, transform 300ms ease, filter 300ms ease;
}

.step-card-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
  filter: blur(2px);
}

.step-card-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.985);
  filter: blur(1px);
}

@keyframes qrReveal {
  from {
    opacity: 0;
    transform: scale(0.94);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes glowPulse {
  0% {
    box-shadow: 0 10px 20px rgba(84, 44, 58, 0.16);
  }

  50% {
    box-shadow: 0 14px 30px rgba(84, 44, 58, 0.32);
  }

  100% {
    box-shadow: 0 10px 20px rgba(84, 44, 58, 0.16);
  }
}

@media (max-width: 767.98px) {
  .sepa-card {
    border-radius: 18px;
    padding: 0.95rem;
  }

  .applied-preview__row {
    flex-direction: column;
    gap: 0.1rem;
  }

  .applied-preview__row strong {
    text-align: left;
  }
}
</style>
