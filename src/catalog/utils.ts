export type SearchableValue = string | null | undefined

export function normalizeSearchTerm(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

export function normalizeIdList(ids: readonly unknown[] | undefined): string[] {
  return [...new Set((ids ?? []).map((id) => String(id ?? '').trim()).filter(Boolean))]
}

export function matchesSearchTerm(values: readonly SearchableValue[], term: string): boolean {
  if (!term) return true
  return values.some((value) => String(value ?? '').toLowerCase().includes(term))
}

export function filterBySearch<T>(
  items: readonly T[],
  rawTerm: unknown,
  getSearchValues: (item: T) => readonly SearchableValue[],
): T[] {
  const term = normalizeSearchTerm(rawTerm)
  if (!term) return [...items]
  return items.filter((item) => matchesSearchTerm(getSearchValues(item), term))
}

export function buildCategoryItemCount<T>(
  items: readonly T[],
  getCategoryIds: (item: T) => readonly unknown[] | undefined,
): Record<string, number> {
  const countByCategoryId: Record<string, number> = {}
  for (const item of items) {
    const categoryIds = normalizeIdList(getCategoryIds(item))
    for (const categoryId of categoryIds) {
      countByCategoryId[categoryId] = (countByCategoryId[categoryId] ?? 0) + 1
    }
  }
  return countByCategoryId
}
