<script setup lang="ts">
import { Btn, cicKitStore, toast } from 'cic-kit'
import { computed, ref } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { productCategoryStore } from '../../stores/productCategoryStore'
import { productStore } from '../../stores/productStore'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { buildPriceListData } from './priceListData'
import { generatePriceListPdf, type PriceListPdfVariant } from './priceListPdf'

type DownloadCard = {
  id: PriceListPdfVariant
  title: string
  subtitle: string
  buttonLabel: string
  icon: string
  buttonColor: 'dark' | 'secondary' | 'primary'
  cardClass: string
}

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const downloadingTarget = ref<PriceListPdfVariant | null>(null)

const priceListData = computed(() => buildPriceListData({
  treatments: treatmentStore.itemsActiveArray,
  treatmentCategories: treatmentCategoryStore.itemsActiveArray,
  products: productStore.itemsActiveArray,
  productCategories: productCategoryStore.itemsActiveArray,
}))

const hasEntries = computed(() => priceListData.value.totalItems > 0)

const downloadCards: DownloadCard[] = [
  {
    id: 'operator-basic',
    title: 'PDF Operatore Base',
    subtitle: 'Versione essenziale in bianco e nero: solo titolo trattamento/prodotto e prezzo.',
    buttonLabel: 'Scarica PDF Operatore',
    icon: 'description',
    buttonColor: 'dark',
    cardClass: 'price-card--mono',
  },
  {
    id: 'client-standard',
    title: 'PDF Clienti',
    subtitle: 'Versione attuale completa, elegante e pronta da condividere con i clienti.',
    buttonLabel: 'Scarica PDF Clienti',
    icon: 'auto_stories',
    buttonColor: 'secondary',
    cardClass: 'price-card--rose',
  },
  {
    id: 'client-large-text',
    title: 'PDF Clienti Testo Grande',
    subtitle: 'Stessa struttura clienti, ma con testo molto piu grande per stampa e piega successiva.',
    buttonLabel: 'Scarica PDF Testo Grande',
    icon: 'menu_book',
    buttonColor: 'primary',
    cardClass: 'price-card--ink',
  },
]

function isLoading(variant: PriceListPdfVariant) {
  return downloadingTarget.value === variant
}

function buildFileName(variant: PriceListPdfVariant) {
  const dateToken = new Date().toISOString().slice(0, 10)
  if (variant === 'operator-basic') return `cnc-beauty-listino-operatore-base-${dateToken}.pdf`
  if (variant === 'client-large-text') return `cnc-beauty-listino-clienti-testo-grande-${dateToken}.pdf`
  return `cnc-beauty-listino-clienti-${dateToken}.pdf`
}

function successMessage(variant: PriceListPdfVariant) {
  if (variant === 'operator-basic') return 'PDF operatore base scaricato.'
  if (variant === 'client-large-text') return 'PDF clienti testo grande scaricato.'
  return 'PDF clienti scaricato.'
}

async function downloadPriceListPdf(variant: PriceListPdfVariant) {
  if (!hasEntries.value) {
    toast.warning('Nessun elemento disponibile per generare il PDF.')
    return
  }

  downloadingTarget.value = variant
  try {
    const pdfBytes = await generatePriceListPdf(priceListData.value, {
      variant,
      separateSectionsByPage: true,
    })
    const safePdfBytes = Uint8Array.from(pdfBytes)
    const blob = new Blob([safePdfBytes], { type: 'application/pdf' })
    const pdfUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = pdfUrl
    anchor.download = buildFileName(variant)
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1200)
    toast.success(successMessage(variant))
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
    <HeaderApp title="Listini PDF" :to="{ name: 'homeApp' }" />

    <section class="price-cards-shell">
      <article
        v-for="card in downloadCards"
        :key="card.id"
        class="price-card"
        :class="card.cardClass"
      >
        <div class="price-card__smoke" aria-hidden="true"></div>
        <div class="price-card__content">
          <h2 class="price-card__title">{{ card.title }}</h2>
          <p class="price-card__subtitle">{{ card.subtitle }}</p>
          <Btn
            :icon="card.icon"
            :color="card.buttonColor"
            :disabled="!hasEntries || downloadingTarget !== null"
            :loading="isLoading(card.id)"
            @click="downloadPriceListPdf(card.id)"
          >
            {{ card.buttonLabel }}
          </Btn>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped lang="scss">
.price-cards-shell {
  width: min(1060px, 100%);
  margin: 0 auto;
  padding: 0.45rem clamp(0.2rem, 1vw, 0.8rem) 1.3rem;
  display: grid;
  gap: 0.95rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.price-card {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  min-height: 230px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  box-shadow: 0 16px 34px rgba(24, 17, 23, 0.16);
  isolation: isolate;
}

.price-card__smoke {
  position: absolute;
  inset: -35%;
  z-index: 0;
  filter: blur(34px);
  opacity: 0.62;
}

.price-card__content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: grid;
  align-content: space-between;
  gap: 0.8rem;
  padding: 1.05rem 1rem 1rem;
}

.price-card__title {
  margin: 0;
  font-size: clamp(1.02rem, 1.5vw, 1.3rem);
  line-height: 1.15;
  color: #22171c;
}

.price-card__subtitle {
  margin: 0;
  color: rgba(35, 24, 31, 0.82);
  font-size: 0.87rem;
  line-height: 1.45;
}

.price-card--mono {
  background:
    radial-gradient(circle at 18% -8%, rgba(255, 255, 255, 0.84), transparent 48%),
    linear-gradient(145deg, rgba(249, 249, 249, 0.95), rgba(227, 227, 227, 0.92));
}

.price-card--mono .price-card__smoke {
  background:
    radial-gradient(circle at 26% 35%, rgba(138, 138, 138, 0.44), transparent 58%),
    radial-gradient(circle at 74% 68%, rgba(72, 72, 72, 0.36), transparent 58%);
}

.price-card--rose {
  background:
    radial-gradient(circle at 18% -8%, rgba(255, 255, 255, 0.82), transparent 48%),
    linear-gradient(140deg, rgba(251, 240, 244, 0.96), rgba(233, 181, 191, 0.9));
}

.price-card--rose .price-card__smoke {
  background:
    radial-gradient(circle at 22% 28%, rgba(232, 179, 190, 0.58), transparent 57%),
    radial-gradient(circle at 78% 72%, rgba(132, 76, 98, 0.36), transparent 57%);
}

.price-card--ink {
  background:
    radial-gradient(circle at 14% -7%, rgba(255, 255, 255, 0.64), transparent 45%),
    linear-gradient(145deg, rgba(63, 46, 58, 0.96), rgba(33, 24, 30, 0.93));
}

.price-card--ink .price-card__smoke {
  background:
    radial-gradient(circle at 24% 28%, rgba(232, 179, 190, 0.32), transparent 60%),
    radial-gradient(circle at 72% 74%, rgba(255, 255, 255, 0.18), transparent 60%);
}

.price-card--ink .price-card__title {
  color: #f8edf0;
}

.price-card--ink .price-card__subtitle {
  color: rgba(245, 233, 238, 0.85);
}

@media (max-width: 991.98px) {
  .price-cards-shell {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .price-card {
    min-height: 198px;
  }
}
</style>
