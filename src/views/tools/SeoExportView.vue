<script setup lang="ts">
import { computed } from 'vue'
import { cicKitStore } from 'cic-kit'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { appConfigStore } from '../../stores/appConfigStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { productStore } from '../../stores/productStore'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { productCategoryStore } from '../../stores/productCategoryStore'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const config = computed(() => appConfigStore.getConfigData())

const brandName = computed(() => String(config.value.brandName ?? '').trim())
const ownerName = computed(() => String(config.value.ownerName ?? '').trim())
const legalEntity = computed(() => String(config.value.legalEntity ?? '').trim())
const vatOrTaxCode = computed(() => String(config.value.vatOrTaxCode ?? '').trim())
const officeAddress = computed(() => String(config.value.officeAddress ?? '').trim())
const publicPhone = computed(() => String(config.value.publicPhone ?? '').trim())
const privacyEmail = computed(() => String(config.value.privacyEmail ?? '').trim())
const dayStart = computed(() => String(config.value.dayStart ?? '').trim())
const dayEnd = computed(() => String(config.value.dayEnd ?? '').trim())

const treatmentCategoryMap = computed(() => {
  const map: Record<string, string> = {}
  for (const category of treatmentCategoryStore.itemsActiveArray) {
    map[category.id] = category.title
  }
  return map
})

const productCategoryMap = computed(() => {
  const map: Record<string, string> = {}
  for (const category of productCategoryStore.itemsActiveArray) {
    map[category.id] = category.title
  }
  return map
})

const visibleTreatments = computed(() => treatmentStore.itemsActiveArray.filter((item) => item.storeVisible))
const visibleProducts = computed(() => productStore.itemsActiveArray.filter((item) => item.storeVisible))

const formatPrice = (value: number | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return `${value.toFixed(2)} €`
}

const faqItems = computed(() => [
  {
    q: 'Come prenotare un trattamento?',
    a: `Contatta ${brandName.value} al numero ${publicPhone.value || 'disponibile in sede'} oppure recati in ${officeAddress.value || 'sede del centro'}.`,
  },
  {
    q: 'I prezzi sono aggiornati?',
    a: 'Sì, il listino è costruito dai dati attivi del catalogo interno.',
  },
  {
    q: 'Differenza tra trattamenti e prodotti?',
    a: 'I trattamenti sono servizi professionali in cabina, i prodotti sono articoli consigliati per routine domiciliare.',
  },
])

const htmlDocument = computed(() => {
  const treatmentRows = visibleTreatments.value.map((item) => `
      <tr>
        <td>${item.title}</td>
        <td>${treatmentCategoryMap.value[item.categoryIds[0] ?? ''] ?? 'Trattamenti estetici'}</td>
        <td>${typeof item.duration === 'number' ? `${Math.round(item.duration)} min` : '-'}</td>
        <td>${formatPrice(item.price)}</td>
      </tr>`).join('')

  const productRows = visibleProducts.value.map((item) => `
      <tr>
        <td>${item.title}</td>
        <td>${productCategoryMap.value[item.categoryIds[0] ?? ''] ?? 'Prodotti beauty'}</td>
        <td>${item.tipiDiPelle || '-'}</td>
        <td>${formatPrice(item.price)}</td>
      </tr>`).join('')

  const faqRows = faqItems.value.map((item) => `
      <dt>${item.q}</dt>
      <dd>${item.a}</dd>`).join('')

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Prezzi e FAQ | ${brandName.value}</title>
  <meta name="description" content="Prezzi trattamenti, prodotti e FAQ di ${brandName.value}." />
</head>
<body>
  <main>
    <h1>${brandName.value} - Prezzi e FAQ</h1>

    <section>
      <h2>Informazioni centro</h2>
      <ul>
        <li><strong>Brand:</strong> ${brandName.value || '-'}</li>
        <li><strong>Rappresentante legale:</strong> ${ownerName.value || '-'}</li>
        <li><strong>Ragione sociale:</strong> ${legalEntity.value || '-'}</li>
        <li><strong>Partita IVA / Codice fiscale:</strong> ${vatOrTaxCode.value || '-'}</li>
        <li><strong>Indirizzo:</strong> ${officeAddress.value || '-'}</li>
        <li><strong>Telefono:</strong> ${publicPhone.value || '-'}</li>
        <li><strong>Email:</strong> ${privacyEmail.value || '-'}</li>
        <li><strong>Orari:</strong> ${dayStart.value && dayEnd.value ? `${dayStart.value} - ${dayEnd.value}` : '-'}</li>
      </ul>
    </section>

    <section>
      <h2>Listino trattamenti</h2>
      <table border="1" cellspacing="0" cellpadding="6">
        <thead>
          <tr><th>Trattamento</th><th>Categoria</th><th>Durata</th><th>Prezzo</th></tr>
        </thead>
        <tbody>${treatmentRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Listino prodotti</h2>
      <table border="1" cellspacing="0" cellpadding="6">
        <thead>
          <tr><th>Prodotto</th><th>Categoria</th><th>Indicazione</th><th>Prezzo</th></tr>
        </thead>
        <tbody>${productRows}</tbody>
      </table>
    </section>

    <section>
      <h2>FAQ</h2>
      <dl>${faqRows}</dl>
    </section>
  </main>
</body>
</html>`
})

function downloadHtml() {
  const blob = new Blob([htmlDocument.value], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'prezzi_faq.html'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="container-fluid pb-t pt-3 pt-md-4 overflow-auto vh-100" :style="bgStyle">
    <HeaderApp :to="{ name: 'homeApp' }" />

    <article class="mx-auto" style="max-width: 980px;">
      <h1 class="h4">Export pagina Prezzi e FAQ (AI-friendly)</h1>
      <p class="text-muted small">
        Questa pagina genera un file HTML leggibile da utenti e sistemi AI, usando i dati già presenti negli store caricati dall'app.
      </p>

      <button type="button" class="btn btn-dark btn-sm mb-3" @click="downloadHtml">
        Scarica file HTML Prezzi e FAQ
      </button>

      <section class="mb-3">
        <h2 class="h6">Informazioni centro</h2>
        <ul>
          <li><strong>Brand:</strong> {{ brandName || '-' }}</li>
          <li><strong>Rappresentante legale:</strong> {{ ownerName || '-' }}</li>
          <li><strong>Ragione sociale:</strong> {{ legalEntity || '-' }}</li>
          <li><strong>P.IVA / Codice fiscale:</strong> {{ vatOrTaxCode || '-' }}</li>
          <li><strong>Indirizzo:</strong> {{ officeAddress || '-' }}</li>
          <li><strong>Telefono:</strong> {{ publicPhone || '-' }}</li>
          <li><strong>Email:</strong> {{ privacyEmail || '-' }}</li>
        </ul>
      </section>

      <section class="mb-3">
        <h2 class="h6">Listino trattamenti</h2>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead><tr><th>Trattamento</th><th>Categoria</th><th>Durata</th><th>Prezzo</th></tr></thead>
            <tbody>
              <tr v-for="item in visibleTreatments" :key="item.id">
                <td>{{ item.title }}</td>
                <td>{{ treatmentCategoryMap[item.categoryIds[0] ?? ''] || 'Trattamenti estetici' }}</td>
                <td>{{ item.duration ? `${Math.round(item.duration)} min` : '-' }}</td>
                <td>{{ formatPrice(item.price) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="mb-3">
        <h2 class="h6">Listino prodotti</h2>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead><tr><th>Prodotto</th><th>Categoria</th><th>Indicazione</th><th>Prezzo</th></tr></thead>
            <tbody>
              <tr v-for="item in visibleProducts" :key="item.id">
                <td>{{ item.title }}</td>
                <td>{{ productCategoryMap[item.categoryIds[0] ?? ''] || 'Prodotti beauty' }}</td>
                <td>{{ item.tipiDiPelle || '-' }}</td>
                <td>{{ formatPrice(item.price) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="mb-4">
        <h2 class="h6">FAQ</h2>
        <dl>
          <template v-for="item in faqItems" :key="item.q">
            <dt>{{ item.q }}</dt>
            <dd>{{ item.a }}</dd>
          </template>
        </dl>
      </section>
    </article>
  </div>
</template>
