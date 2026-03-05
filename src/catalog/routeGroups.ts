const PRODUCT_ROUTE_NAMES = new Set([
  'ProductCategoriesView',
  'ProductsView',
  'ProductView',
  'ProductsManageView',
  'ProductCategoriesManageView',
  'ProductEditView',
])

const TREATMENT_ROUTE_NAMES = new Set([
  'TreatmentCategoriesView',
  'TreatmentsView',
  'TreatmentView',
  'TreatmentsManageView',
  'TreatmentCategoriesManageView',
  'TreatmentEditView',
])

export type CatalogRouteGroup = 'products' | 'treatments'

export function isCatalogRouteActive(routeName: unknown, group: CatalogRouteGroup): boolean {
  const currentRouteName = String(routeName ?? '').trim()
  if (!currentRouteName) return false
  if (group === 'products') return PRODUCT_ROUTE_NAMES.has(currentRouteName)
  if (group === 'treatments') return TREATMENT_ROUTE_NAMES.has(currentRouteName)
  return false
}
