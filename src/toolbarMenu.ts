import type { OffcanvasTab } from "cic-kit";

type OffcanvasTabConfig = OffcanvasTab & {
  requiresBetaFeatures?: boolean
  requiresSuperAdmin?: boolean
  requiresAdmin?: boolean
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
    name: 'App Config',
    icon: 'settings',
    to: { name: 'AppConfigView' },
    requiresSuperAdmin: true,
  },
  {
    name: 'Backup Catalogo JSON',
    icon: 'download',
    to: { name: 'CatalogBackupView' },
    requiresSuperAdmin: true,
  },
  {
    name: 'Prompt Agenti AI',
    icon: 'psychology',
    to: { name: 'AgentPromptsView' },
    requiresAdmin: true,
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
  {
    name: 'Project Msg Demo',
    icon: 'send',
    to: { name: 'ProjectMessageDemoView' },
    requiresBetaFeatures: true,
  },
  {
    name: 'Test Playground',
    icon: 'science',
    to: { name: 'TestPlaygroundView' },
    requiresBetaFeatures: true,
  },
];

export function getToolbarOffcanvasTabs(
  hasBetaFeatures: boolean,
  hasSuperAdmin: boolean,
  hasAdmin: boolean,
): OffcanvasTab[] {
  return toolbarOffcanvasTabConfigs.filter((tab) => {
    const betaFeatureAllowed = !tab.requiresBetaFeatures || hasBetaFeatures
    const superAdminAllowed = !tab.requiresSuperAdmin || hasSuperAdmin
    const adminAllowed = !tab.requiresAdmin || hasAdmin
    return betaFeatureAllowed && superAdminAllowed && adminAllowed
  })
}
