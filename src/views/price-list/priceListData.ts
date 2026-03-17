type CatalogItemSource = {
  id: string
  title: string
  subtitle?: string
  description?: string
  price: number
  storeOrder?: number
  categoryIds?: string[]
  storeDisabeld?: string
}

type CatalogCategorySource = {
  id: string
  title: string
}

export type PriceListItem = {
  id: string
  title: string
  subtitle?: string
  description?: string
  price: number
  formattedPrice: string
  storeDisabledReason?: string
  order: number
}

export type PriceListCategory = {
  id: string
  title: string
  items: PriceListItem[]
}

export type PriceListSectionKey = 'treatments' | 'products'

export type PriceListSection = {
  key: PriceListSectionKey
  title: string
  description: string
  categories: PriceListCategory[]
  totalItems: number
}

export type PriceListData = {
  sections: PriceListSection[]
  totalItems: number
  generatedAtIso: string
}

type BuildPriceListDataInput = {
  treatments: readonly CatalogItemSource[]
  treatmentCategories: readonly CatalogCategorySource[]
  products: readonly CatalogItemSource[]
  productCategories: readonly CatalogCategorySource[]
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const UNCATEGORIZED_ID = '__uncategorized__'
const UNCATEGORIZED_TITLE = 'Senza categoria'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizePrice(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null
  }
  return value
}

function normalizeOrder(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER
}

function mapCategories(source: readonly CatalogCategorySource[]) {
  const byId = new Map<string, string>()

  for (const category of source) {
    const categoryId = normalizeText(category.id)
    const categoryTitle = normalizeText(category.title)
    if (!categoryId || !categoryTitle) {
      continue
    }

    if (!byId.has(categoryId)) {
      byId.set(categoryId, categoryTitle)
    }
  }

  return [...byId.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title, 'it'))
}

function resolvePrimaryCategoryId(categoryIds: readonly string[] | undefined, validCategoryIds: Set<string>): string {
  for (const categoryId of categoryIds ?? []) {
    const normalizedId = normalizeText(categoryId)
    if (normalizedId && validCategoryIds.has(normalizedId)) {
      return normalizedId
    }
  }
  return UNCATEGORIZED_ID
}

function sortItems(items: PriceListItem[]) {
  items.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order
    }
    return a.title.localeCompare(b.title, 'it')
  })
}

function buildSection(
  key: PriceListSectionKey,
  title: string,
  description: string,
  items: readonly CatalogItemSource[],
  categories: readonly CatalogCategorySource[],
): PriceListSection {
  const normalizedCategories = mapCategories(categories)
  const categoryTitleById = new Map(normalizedCategories.map((category) => [category.id, category.title]))
  const validCategoryIds = new Set(normalizedCategories.map((category) => category.id))
  const buckets = new Map<string, PriceListItem[]>()

  for (const item of items) {
    const itemId = normalizeText(item.id)
    const itemTitle = normalizeText(item.title)
    const itemPrice = normalizePrice(item.price)
    if (!itemId || !itemTitle || itemPrice === null) {
      continue
    }

    const categoryId = resolvePrimaryCategoryId(item.categoryIds, validCategoryIds)
    const bucket = buckets.get(categoryId) ?? []
    if (!buckets.has(categoryId)) {
      buckets.set(categoryId, bucket)
    }

    const itemSubtitle = normalizeText(item.subtitle) || undefined
    const itemDescription = normalizeText(item.description) || undefined
    const storeDisabledReason = normalizeText(item.storeDisabeld) || undefined

    bucket.push({
      id: itemId,
      title: itemTitle,
      subtitle: itemSubtitle,
      description: itemDescription,
      price: itemPrice,
      formattedPrice: CURRENCY_FORMATTER.format(itemPrice),
      storeDisabledReason,
      order: normalizeOrder(item.storeOrder),
    })
  }

  const sectionCategories: PriceListCategory[] = []

  for (const category of normalizedCategories) {
    const categoryItems = buckets.get(category.id)
    if (!categoryItems?.length) {
      continue
    }

    sortItems(categoryItems)
    sectionCategories.push({
      id: category.id,
      title: category.title,
      items: categoryItems,
    })
  }

  const uncategorizedItems = buckets.get(UNCATEGORIZED_ID)
  if (uncategorizedItems?.length) {
    sortItems(uncategorizedItems)
    sectionCategories.push({
      id: UNCATEGORIZED_ID,
      title: UNCATEGORIZED_TITLE,
      items: uncategorizedItems,
    })
  }

  for (const category of sectionCategories) {
    if (categoryTitleById.has(category.id)) {
      continue
    }
    if (category.id !== UNCATEGORIZED_ID) {
      category.title = normalizeText(category.title) || UNCATEGORIZED_TITLE
    }
  }

  return {
    key,
    title,
    description,
    categories: sectionCategories,
    totalItems: sectionCategories.reduce((sum, category) => sum + category.items.length, 0),
  }
}

export function buildPriceListData(input: BuildPriceListDataInput): PriceListData {
  const treatmentSection = buildSection(
    'treatments',
    'Trattamenti',
    'Percorsi professionali viso e corpo con prezzi ufficiali aggiornati.',
    input.treatments,
    input.treatmentCategories,
  )

  const productSection = buildSection(
    'products',
    'Prodotti',
    'Selezione prodotti consigliati in istituto con relativo listino.',
    input.products,
    input.productCategories,
  )

  const sections = [treatmentSection, productSection]
  const totalItems = sections.reduce((sum, section) => sum + section.totalItems, 0)

  return {
    sections,
    totalItems,
    generatedAtIso: new Date().toISOString(),
  }
}
