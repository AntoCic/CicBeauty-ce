<script setup lang="ts">
import { computed } from 'vue'
import { cicKitStore } from 'cic-kit'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import AppHeaderCatalogNav from '../../components/headers/AppHeaderCatalogNav.vue'
import { treatmentStore } from '../../stores/treatmentStore'
import { productStore } from '../../stores/productStore'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { productCategoryStore } from '../../stores/productCategoryStore'
import { appConfigStore } from '../../stores/appConfigStore'
import { usePublicSeo } from '../../composables/usePublicSeo'
import { useStructuredData } from '../../composables/useStructuredData'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const config = computed(() => appConfigStore.getConfigData())
const brandName = computed(() => String(config.value.brandName ?? 'CNC Beauty').trim() || 'CNC Beauty')
const address = computed(() => String(config.value.officeAddress ?? '').trim())
const publicPhone = computed(() => String(config.value.publicPhone ?? '').trim())
const privacyEmail = computed(() => String(config.value.privacyEmail ?? '').trim())
const openingHours = computed(() => {
  const start = String(config.value.dayStart ?? '').trim()
  const end = String(config.value.dayEnd ?? '').trim()
  if (!start || !end) return 'Su appuntamento'
  return `${start} - ${end}`
})

const priceFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const formatPrice = (value: number | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Da definire in sede'
  return priceFormatter.format(value)
}

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

const treatmentRows = computed(() => visibleTreatments.value.map((item) => ({
  id: item.id,
  title: item.title,
  subtitle: item.subtitle,
  description: item.description,
  price: item.price,
  duration: item.duration,
  categoryLabel: treatmentCategoryMap.value[item.categoryIds[0] ?? ''] ?? 'Trattamenti estetici',
  blockedNote: String(item.storeDisabeld ?? '').trim(),
})))

const productRows = computed(() => visibleProducts.value.map((item) => ({
  id: item.id,
  title: item.title,
  subtitle: item.subtitle,
  description: item.description,
  price: item.price,
  categoryLabel: productCategoryMap.value[item.categoryIds[0] ?? ''] ?? 'Prodotti beauty',
  skinTypes: item.tipiDiPelle,
  blockedNote: String(item.storeDisabeld ?? '').trim(),
})))

const faqItems = computed(() => [
  {
    question: `Come prenotare un trattamento da ${brandName.value}?`,
    answer: `Per prenotare puoi contattare ${brandName.value} al numero ${publicPhone.value || 'disponibile in pagina contatti'} oppure passare in sede in ${address.value || 'centro città'}.`,
  },
  {
    question: 'I prezzi pubblicati sono aggiornati?',
    answer: 'Sì, questa pagina mostra il listino pubblicato nel catalogo digitale. In caso di promozioni o percorsi personalizzati, la conferma finale viene data in sede.',
  },
  {
    question: 'Qual è la differenza tra trattamenti e prodotti?',
    answer: 'I trattamenti sono servizi in cabina con durata e protocollo professionale, mentre i prodotti sono soluzioni domiciliari consigliate per proseguire la routine beauty a casa.',
  },
])

usePublicSeo(
  computed(() => `Prezzi trattamenti e prodotti | ${brandName.value}`),
  computed(() => `${brandName.value}: listino trattamenti estetici e prodotti beauty con prezzi, categorie e informazioni di contatto locali.`),
  {
    canonicalPath: '/prezzi',
  },
)

const structuredData = computed(() => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'BeautySalon',
      '@id': `${window.location.origin}/#beautysalon`,
      name: brandName.value,
      url: `${window.location.origin}/`,
      telephone: publicPhone.value || undefined,
      email: privacyEmail.value || undefined,
      address: address.value
        ? {
          '@type': 'PostalAddress',
          streetAddress: address.value,
          addressCountry: 'IT',
        }
        : undefined,
      openingHours: openingHours.value,
    },
    {
      '@type': 'OfferCatalog',
      name: 'Listino trattamenti estetici',
      url: `${window.location.origin}/prezzi`,
      itemListElement: treatmentRows.value.map((item, index) => ({
        '@type': 'Offer',
        position: index + 1,
        itemOffered: {
          '@type': 'Service',
          name: item.title,
          description: item.subtitle || item.description || undefined,
          category: item.categoryLabel,
        },
        price: typeof item.price === 'number' ? String(item.price) : undefined,
        priceCurrency: 'EUR',
        availability: item.blockedNote ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      })),
    },
    {
      '@type': 'OfferCatalog',
      name: 'Catalogo prodotti beauty',
      url: `${window.location.origin}/prezzi`,
      itemListElement: productRows.value.map((item, index) => ({
        '@type': 'Offer',
        position: index + 1,
        itemOffered: {
          '@type': 'Product',
          name: item.title,
          description: item.subtitle || item.description || undefined,
          category: item.categoryLabel,
        },
        price: typeof item.price === 'number' ? String(item.price) : undefined,
        priceCurrency: 'EUR',
        availability: item.blockedNote ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      })),
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqItems.value.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ],
}))

useStructuredData('public-price-list-schema', structuredData)
</script>

<template>
  <div class="public-page" :style="bgStyle">
    <HeaderApp :to="{ name: 'home' }">
      <AppHeaderCatalogNav />
    </HeaderApp>

    <main class="container-fluid pb-t pt-3 pt-md-4 overflow-auto vh-100">
      <article class="price-page mx-auto">
        <header class="price-page__header">
          <p class="price-page__kicker">Listino pubblico</p>
          <h1>Prezzi trattamenti e prodotti {{ brandName }}</h1>
          <p>
            Pagina ottimizzata per consultare in modo rapido trattamenti, prodotti e prezzi del centro estetico.
            Le informazioni sono presentate in formato testuale e tabellare per una lettura più chiara da parte di utenti, motori di ricerca e sistemi AI.
          </p>
        </header>

        <section class="price-page__section" aria-labelledby="trattamenti-title">
          <h2 id="trattamenti-title">Trattamenti estetici con prezzi</h2>
          <div class="table-responsive">
            <table class="table table-sm align-middle price-table">
              <caption>Elenco trattamenti, categoria, durata e prezzo indicativo.</caption>
              <thead>
                <tr>
                  <th scope="col">Trattamento</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Durata</th>
                  <th scope="col">Prezzo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in treatmentRows" :key="item.id">
                  <th scope="row">
                    <RouterLink :to="{ name: 'TreatmentView', params: { id: item.id } }">{{ item.title }}</RouterLink>
                    <p v-if="item.subtitle" class="mb-0 text-muted small">{{ item.subtitle }}</p>
                  </th>
                  <td>{{ item.categoryLabel }}</td>
                  <td>{{ item.duration ? `${Math.round(item.duration)} min` : '-' }}</td>
                  <td>
                    <strong>{{ formatPrice(item.price) }}</strong>
                    <p v-if="item.blockedNote" class="mb-0 text-muted small">{{ item.blockedNote }}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="price-page__section" aria-labelledby="prodotti-title">
          <h2 id="prodotti-title">Prodotti beauty con prezzi</h2>
          <div class="table-responsive">
            <table class="table table-sm align-middle price-table">
              <caption>Elenco prodotti con categoria e prezzo indicativo.</caption>
              <thead>
                <tr>
                  <th scope="col">Prodotto</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Indicazione</th>
                  <th scope="col">Prezzo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in productRows" :key="item.id">
                  <th scope="row">
                    <RouterLink :to="{ name: 'ProductView', params: { id: item.id } }">{{ item.title }}</RouterLink>
                    <p v-if="item.subtitle" class="mb-0 text-muted small">{{ item.subtitle }}</p>
                  </th>
                  <td>{{ item.categoryLabel }}</td>
                  <td>{{ item.skinTypes || '-' }}</td>
                  <td>
                    <strong>{{ formatPrice(item.price) }}</strong>
                    <p v-if="item.blockedNote" class="mb-0 text-muted small">{{ item.blockedNote }}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="price-page__section" aria-labelledby="faq-title">
          <h2 id="faq-title">FAQ rapide</h2>
          <dl class="faq-list mb-0">
            <div v-for="item in faqItems" :key="item.question" class="faq-item">
              <dt>{{ item.question }}</dt>
              <dd>{{ item.answer }}</dd>
            </div>
          </dl>
        </section>

        <section class="price-page__section" aria-labelledby="contatti-title">
          <h2 id="contatti-title">Contatti e località</h2>
          <ul class="mb-0 ps-3">
            <li><strong>Brand:</strong> {{ brandName }}</li>
            <li><strong>Indirizzo:</strong> {{ address || 'Disponibile su richiesta telefonica' }}</li>
            <li><strong>Telefono:</strong> {{ publicPhone || 'Disponibile in reception' }}</li>
            <li><strong>Email:</strong> {{ privacyEmail || 'Disponibile in reception' }}</li>
            <li><strong>Orari:</strong> {{ openingHours }}</li>
          </ul>
        </section>
      </article>
    </main>
  </div>
</template>

<style scoped>
.public-page {
  min-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.price-page {
  width: min(1080px, 100%);
  margin: 0 auto;
  padding: 0.8rem 0.2rem 2rem;
}

.price-page__header h1 {
  margin-bottom: 0.6rem;
  font-size: clamp(1.4rem, 2.8vw, 2rem);
}

.price-page__kicker {
  margin-bottom: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.75rem;
  font-weight: 700;
  color: #6f3c4c;
}

.price-page__section {
  margin-top: 1.35rem;
  padding-top: 0.9rem;
  border-top: 1px solid rgba(84, 44, 58, 0.15);
}

.price-page__section h2 {
  margin-bottom: 0.75rem;
  font-size: clamp(1.05rem, 2.1vw, 1.5rem);
}

.price-table th,
.price-table td {
  vertical-align: top;
}

.faq-list {
  display: grid;
  gap: 0.7rem;
}

.faq-item dt {
  font-weight: 700;
}

.faq-item dd {
  margin-bottom: 0;
}
</style>
