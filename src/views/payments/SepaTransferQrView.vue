<script setup lang="ts">
import { cicKitStore, useChangeHeader } from 'cic-kit'
import * as QRCode from 'qrcode'
import { computed, ref, watch } from 'vue'
import { appConfigStore } from '../../stores/appConfigStore'
import {
  buildSepaEpcQrPayload,
  normalizeSepaBic,
  normalizeSepaIban,
  parseSepaAmountInput,
} from '../../utils/sepaEpcQr'

const DEFAULT_REMITTANCE_TEXT = 'Acquisto CNC Beauty'

useChangeHeader('QR Bonifico SEPA', { name: 'home' })

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const amountInput = ref('')
const qrImageDataUrl = ref('')
const qrRenderError = ref('')
let qrRenderToken = 0

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

const parsedAmount = computed(() => parseSepaAmountInput(amountInput.value))
const isConfigReady = computed(() => missingConfigFields.value.length === 0)

const amountValidationMessage = computed(() => {
  if (!amountInput.value.trim()) return ''
  if (parsedAmount.value === null) return 'Formato importo non valido (usa massimo 2 decimali).'
  if (parsedAmount.value <= 0) return "L'importo deve essere maggiore di zero."
  return ''
})

const generationStatusMessage = computed(() => {
  if (!isConfigReady.value) return 'Configura i dati SEPA in App Config per generare il QR.'
  if (!amountInput.value.trim()) return 'Inserisci un importo per generare il QR.'
  if (amountValidationMessage.value) return amountValidationMessage.value
  return ''
})

const epcPayload = computed(() => {
  if (!isConfigReady.value || parsedAmount.value === null || parsedAmount.value <= 0) return ''

  try {
    return buildSepaEpcQrPayload({
      beneficiaryName: beneficiaryName.value,
      iban: beneficiaryIban.value,
      bic: beneficiaryBic.value,
      amount: parsedAmount.value,
      remittanceText: DEFAULT_REMITTANCE_TEXT,
    })
  } catch {
    return ''
  }
})

const textualPreview = computed(() => {
  return [
    { label: 'Standard', value: 'EPC QR (BCD/002 - SCT)' },
    { label: 'Beneficiario', value: beneficiaryName.value || '-' },
    { label: 'IBAN', value: beneficiaryIban.value || '-' },
    { label: 'BIC', value: beneficiaryBic.value || '(non impostato)' },
    { label: 'Importo', value: parsedAmount.value !== null ? `${parsedAmount.value.toFixed(2)} EUR` : '-' },
    { label: 'Causale', value: DEFAULT_REMITTANCE_TEXT },
  ]
})

watch(
  epcPayload,
  async (payload) => {
    const runId = ++qrRenderToken

    if (!payload) {
      qrImageDataUrl.value = ''
      qrRenderError.value = ''
      return
    }

    try {
      const nextQrDataUrl = await QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'M',
      })

      if (runId !== qrRenderToken) return
      qrImageDataUrl.value = nextQrDataUrl
      qrRenderError.value = ''
    } catch (error) {
      console.error(error)
      if (runId !== qrRenderToken) return
      qrImageDataUrl.value = ''
      qrRenderError.value = 'Errore durante la generazione del QR.'
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <section class="card border-0 shadow-sm p-3 my-3">
      <h1 class="h5 mb-2">QR Bonifico SEPA</h1>
      <p class="text-muted small mb-3">
        Inserisci l'importo: il QR viene generato in formato EPC/GiroCode con causale precompilata.
      </p>

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

      <div class="row g-4">
        <div class="col-12 col-lg-5">
          <div class="mb-3">
            <label for="sepa-amount-input" class="form-label">Importo (EUR)</label>
            <div class="input-group">
              <span class="input-group-text">EUR</span>
              <input
                id="sepa-amount-input"
                v-model="amountInput"
                type="number"
                min="0.01"
                step="0.01"
                inputmode="decimal"
                class="form-control"
                placeholder="Es. 49.90"
                :disabled="!isConfigReady"
              >
            </div>
            <p v-if="amountValidationMessage" class="text-danger small mt-1 mb-0">{{ amountValidationMessage }}</p>
          </div>

          <div class="mb-3">
            <label class="form-label">Causale precompilata</label>
            <input type="text" class="form-control" :value="DEFAULT_REMITTANCE_TEXT" readonly>
          </div>

          <p v-if="generationStatusMessage && !amountValidationMessage" class="text-muted small mb-0">
            {{ generationStatusMessage }}
          </p>
        </div>

        <div class="col-12 col-lg-7">
          <div class="qr-preview-card">
            <p class="qr-preview-card__title mb-2">Anteprima QR</p>
            <div class="qr-preview-card__body">
              <img
                v-if="qrImageDataUrl"
                :src="qrImageDataUrl"
                class="sepa-qr-image"
                alt="QR bonifico SEPA EPC"
              >
              <p v-else class="text-muted small mb-0">
                QR non disponibile finche non inserisci un importo valido.
              </p>
            </div>
            <p v-if="qrRenderError" class="text-danger small mt-2 mb-0">{{ qrRenderError }}</p>
          </div>
        </div>
      </div>

      <div class="mt-4">
        <h2 class="h6 mb-2">Anteprima dati usati</h2>
        <div class="row g-2">
          <div v-for="item in textualPreview" :key="item.label" class="col-12 col-md-6">
            <div class="preview-row">
              <span class="preview-row__label">{{ item.label }}</span>
              <span class="preview-row__value">{{ item.value }}</span>
            </div>
          </div>
        </div>

        <p class="small text-muted mt-3 mb-1">Payload EPC generato</p>
        <pre class="epc-raw-preview">{{ epcPayload || '-' }}</pre>
      </div>
    </section>
  </div>
</template>

<style scoped>
.qr-preview-card {
  border: 1px solid #ececec;
  border-radius: 2px;
  background: #fff;
  padding: 0.85rem;
}

.qr-preview-card__title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #3d232c;
}

.qr-preview-card__body {
  min-height: 220px;
  display: grid;
  place-items: center;
}

.sepa-qr-image {
  width: min(100%, 320px);
  height: auto;
  display: block;
}

.preview-row {
  border: 1px solid #ececec;
  border-radius: 2px;
  padding: 0.55rem 0.65rem;
  background: #fff;
  display: flex;
  justify-content: space-between;
  gap: 0.65rem;
}

.preview-row__label {
  font-size: 0.8rem;
  color: rgba(61, 35, 44, 0.72);
}

.preview-row__value {
  font-size: 0.83rem;
  font-weight: 600;
  color: #3d232c;
  text-align: right;
}

.epc-raw-preview {
  margin: 0;
  border: 1px solid #ececec;
  border-radius: 2px;
  background: #fff;
  padding: 0.65rem;
  font-size: 0.76rem;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
