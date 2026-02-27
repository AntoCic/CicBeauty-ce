import type { OffcanvasTab } from "cic-kit";

type OffcanvasTabConfig = OffcanvasTab & {
  requiresBetaFeatures?: boolean
}

const toolbarOffcanvasTabConfigs: OffcanvasTabConfig[] = [
  {
    name: 'Prodotti',
    icon: 'shopping_bag',
    to: { name: 'ProductsManageView' },
  },
  {
    name: 'Trattamenti',
    icon: 'bolt',
    to: { name: 'TreatmentsManageView' },
  },
  {
    name: 'Cat. Prodotti',
    icon: 'edit_note',
    to: { name: 'ProductCategoriesManageView' },
  },
  {
    name: 'Cat. Trattamenti',
    icon: 'edit_note',
    to: { name: 'TreatmentCategoriesManageView' },
  },
  {
    name: 'Tipi di spesa',
    icon: 'payments',
    to: { name: 'TypeExpensesView' },
  },
  {
    name: 'Avvisi',
    icon: 'notifications',
    to: { name: 'AnnouncementsView' },
    requiresBetaFeatures: true,
  },
  {
    name: 'PDF Demo',
    icon: 'picture_as_pdf',
    to: { name: 'PdfPlacementDemoView' },
    requiresBetaFeatures: true,
  },
];

export function getToolbarOffcanvasTabs(hasBetaFeatures: boolean): OffcanvasTab[] {
  return toolbarOffcanvasTabConfigs.filter((tab) => !tab.requiresBetaFeatures || hasBetaFeatures)
}
