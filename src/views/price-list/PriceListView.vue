<script setup lang="ts">
import { Btn, cicKitStore, toast } from 'cic-kit'
import { computed, ref } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { productCategoryStore } from '../../stores/productCategoryStore'
import { productStore } from '../../stores/productStore'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'
import PriceListPreviewSection from './components/PriceListPreviewSection.vue'
import { buildPriceListData, type PriceListSection } from './priceListData'
import { generatePriceListPdf, type PriceListPdfAudience } from './priceListPdf'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const downloadingTarget = ref<PriceListPdfAudience | null>(null)

const emptyTreatmentSection: PriceListSection = {
  key: 'treatments',
  title: 'Trattamenti',
  description: 'Percorsi professionali viso e corpo con prezzi ufficiali aggiornati.',
  categories: [],
  totalItems: 0,
}

const emptyProductSection: PriceListSection = {
  key: 'products',
  title: 'Prodotti',
  description: 'Selezione prodotti consigliati in istituto con relativo listino.',
  categories: [],
  totalItems: 0,
}

const priceListData = computed(() => buildPriceListData({
  treatments: treatmentStore.itemsActiveArray,
  treatmentCategories: treatmentCategoryStore.itemsActiveArray,
  products: productStore.itemsActiveArray,
  productCategories: productCategoryStore.itemsActiveArray,
}))

const treatmentSection = computed(() => {
  return priceListData.value.sections.find((section) => section.key === 'treatments') ?? emptyTreatmentSection
})

const productSection = computed(() => {
  return priceListData.value.sections.find((section) => section.key === 'products') ?? emptyProductSection
})

const totalCategories = computed(() => treatmentSection.value.categories.length + productSection.value.categories.length)
const hasEntries = computed(() => priceListData.value.totalItems > 0)
const isDownloadingAny = computed(() => downloadingTarget.value !== null)
const isDownloadingOperator = computed(() => downloadingTarget.value === 'operator')
const isDownloadingClient = computed(() => downloadingTarget.value === 'client')
const generatedAtLabel = computed(() => {
  const parsedDate = new Date(priceListData.value.generatedAtIso)
  if (Number.isNaN(parsedDate.getTime())) {
    return '-'
  }
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsedDate)
})

async function downloadPriceListPdf(audience: PriceListPdfAudience) {
  if (!hasEntries.value) {
    toast.warning('Nessun elemento disponibile per generare il PDF.')
    return
  }

  downloadingTarget.value = audience
  try {
    const pdfBytes = await generatePriceListPdf(priceListData.value, {
      audience,
      separateSectionsByPage: true,
    })
    const safePdfBytes = Uint8Array.from(pdfBytes)
    const blob = new Blob([safePdfBytes], { type: 'application/pdf' })
    const pdfUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const dateToken = new Date().toISOString().slice(0, 10)
    anchor.href = pdfUrl
    anchor.download = audience === 'client'
      ? `cnc-beauty-listino-clienti-${dateToken}.pdf`
      : `cnc-beauty-listino-operatore-${dateToken}.pdf`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1200)
    toast.success(audience === 'client' ? 'PDF clienti scaricato.' : 'PDF operatore scaricato.')
  } catch (error) {
    console.error(error)
    toast.error('Errore durante la generazione del PDF.')
  } finally {
    downloadingTarget.value = null
  }
}
</script>

<template>
  <div class="container-fluid pb-t pt-3 pt-md-4 overflow-auto vh-100" :style="bgStyle">
    <HeaderApp title="Listino Prezzi" :to="{ name: 'homeApp' }">
      <div class="app-header__tools">
        <Btn
          icon="admin_panel_settings"
          color="dark"
          :disabled="!hasEntries || isDownloadingAny"
          :loading="isDownloadingOperator"
          @click="downloadPriceListPdf('operator')"
        >
          PDF Operatore
        </Btn>
        <Btn
          icon="groups"
          color="secondary"
          :disabled="!hasEntries || isDownloadingAny"
          :loading="isDownloadingClient"
          @click="downloadPriceListPdf('client')"
        >
          PDF Clienti
        </Btn>
      </div>
    </HeaderApp>

    <section class="price-list-shell">
      <article class="price-list-hero">
        <div class="price-list-hero__copy">
          <p class="price-list-hero__eyebrow">Listino ufficiale</p>
          <h1 class="price-list-hero__title">Trattamenti e prodotti con prezzi sempre aggiornati</h1>
          <p class="price-list-hero__description">
            Visualizza una preview ordinata del listino e scarica in un click il PDF brandizzato, pronto da condividere.
          </p>
        </div>

        <div class="price-list-hero__cta">
          <Btn
            icon="admin_panel_settings"
            color="dark"
            :disabled="!hasEntries || isDownloadingAny"
            :loading="isDownloadingOperator"
            @click="downloadPriceListPdf('operator')"
          >
            Scarica PDF Operatore
          </Btn>
          <Btn
            icon="groups"
            color="secondary"
            :disabled="!hasEntries || isDownloadingAny"
            :loading="isDownloadingClient"
            @click="downloadPriceListPdf('client')"
          >
            Scarica PDF Clienti
          </Btn>
          <p class="price-list-hero__hint">Versioni dedicate per operatore e clienti, ottimizzate per mobile e desktop.</p>
        </div>
      </article>

      <div class="price-list-metrics">
        <article class="price-metric-card">
          <p class="price-metric-card__label">Totale voci</p>
          <p class="price-metric-card__value">{{ priceListData.totalItems }}</p>
        </article>
        <article class="price-metric-card">
          <p class="price-metric-card__label">Categorie</p>
          <p class="price-metric-card__value">{{ totalCategories }}</p>
        </article>
        <article class="price-metric-card">
          <p class="price-metric-card__label">Aggiornamento</p>
          <p class="price-metric-card__value price-metric-card__value--date">{{ generatedAtLabel }}</p>
        </article>
      </div>

      <div class="price-list-preview-grid">
        <PriceListPreviewSection
          :title="treatmentSection.title"
          :description="treatmentSection.description"
          :categories="treatmentSection.categories"
          empty-label="Nessun trattamento attivo disponibile."
        />

        <PriceListPreviewSection
          :title="productSection.title"
          :description="productSection.description"
          :categories="productSection.categories"
          empty-label="Nessun prodotto attivo disponibile."
        />
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.price-list-shell {
  width: min(1200px, 100%);
  margin: 0 auto;
  display: grid;
  gap: clamp(0.95rem, 2vw, 1.35rem);
  padding: 0.35rem clamp(0.2rem, 0.8vw, 0.6rem) 1.2rem;
}

.price-list-hero {
  --brand-ink: #4b2935;
  --brand-accent: #e8b3be;
  --brand-soft: #f7f1f2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1.1rem;
  align-items: center;
  padding: clamp(1rem, 2vw, 1.4rem);
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 24px;
  background:
    radial-gradient(circle at 100% 0%, rgba(232, 179, 190, 0.35), transparent 52%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.94), var(--brand-soft));
  box-shadow: 0 16px 36px rgba(39, 20, 29, 0.12);
}

.price-list-hero__copy {
  display: grid;
  gap: 0.45rem;
}

.price-list-hero__eyebrow {
  margin: 0;
  color: var(--brand-ink);
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
}

.price-list-hero__title {
  margin: 0;
  color: #2d1e24;
  font-size: clamp(1.2rem, 2vw, 1.7rem);
  line-height: 1.15;
  max-width: 26ch;
}

.price-list-hero__description {
  margin: 0;
  color: rgba(48, 34, 40, 0.84);
  font-size: 0.9rem;
  line-height: 1.55;
  max-width: 64ch;
}

.price-list-hero__cta {
  justify-self: end;
  display: grid;
  gap: 0.45rem;
  justify-items: end;
}

.price-list-hero__hint {
  margin: 0;
  color: rgba(64, 42, 51, 0.75);
  font-size: 0.74rem;
  letter-spacing: 0.04em;
}

.price-list-metrics {
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.price-metric-card {
  padding: 0.75rem 0.85rem;
  border-radius: 16px;
  border: 1px solid rgba(84, 44, 58, 0.14);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 20px rgba(35, 24, 30, 0.08);
}

.price-metric-card__label {
  margin: 0;
  color: rgba(72, 46, 56, 0.78);
  font-size: 0.73rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.price-metric-card__value {
  margin: 0.3rem 0 0;
  color: #4b2935;
  font-size: clamp(1.05rem, 1.9vw, 1.35rem);
  font-weight: 700;
  line-height: 1.12;
}

.price-metric-card__value--date {
  font-size: clamp(0.9rem, 1.5vw, 1.05rem);
  text-transform: capitalize;
}

.price-list-preview-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 991.98px) {
  .price-list-hero {
    grid-template-columns: 1fr;
  }

  .price-list-hero__cta {
    justify-self: start;
    justify-items: start;
  }

  .price-list-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .price-list-preview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 575.98px) {
  .price-list-shell {
    gap: 0.75rem;
  }

  .price-list-hero {
    border-radius: 18px;
  }

  .price-list-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
