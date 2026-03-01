import type { OffcanvasTab } from "cic-kit";

type OffcanvasTabConfig = OffcanvasTab & {
  requiresBetaFeatures?: boolean
  requiresSuperAdmin?: boolean
  requiresAdmin?: boolean
  requiresOperator?: boolean
}

const toolbarOffcanvasTabConfigs: OffcanvasTabConfig[] = [
  {
    name: 'Calendario',
    icon: 'calendar_month',
    to: { name: 'CalendarView' },
    requiresOperator: true,
  },
  {
    name: 'Clienti',
    icon: 'groups',
    to: { name: 'ClientsView' },
    requiresOperator: true,
  },
  {
    name: 'Spese',
    icon: 'account_balance_wallet',
    to: { name: 'ExpensesView' },
    requiresOperator: true,
  },
  {
    name: 'Coupon',
    icon: 'local_offer',
    to: { name: 'CouponsView' },
    requiresOperator: true,
  },
  {
    name: 'Statistiche',
    icon: 'bar_chart',
    to: { name: 'StatsView' },
    requiresOperator: true,
  },
  {
    name: 'Relazioni',
    icon: 'schema',
    to: { name: 'RelationsView' },
    requiresOperator: true,
  },
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
  {
    name: 'Import Migrazione',
    icon: 'upload_file',
    to: { name: 'MigrationImportView' },
    requiresBetaFeatures: true,
    requiresOperator: true,
  },
];

export function getToolbarOffcanvasTabs(
  hasBetaFeatures: boolean,
  hasSuperAdmin: boolean,
  hasAdmin: boolean,
  hasOperator: boolean,
): OffcanvasTab[] {
  return toolbarOffcanvasTabConfigs.filter((tab) => {
    const betaFeatureAllowed = !tab.requiresBetaFeatures || hasBetaFeatures
    const superAdminAllowed = !tab.requiresSuperAdmin || hasSuperAdmin
    const adminAllowed = !tab.requiresAdmin || hasAdmin
    const operatorAllowed = !tab.requiresOperator || hasOperator
    return betaFeatureAllowed && superAdminAllowed && adminAllowed && operatorAllowed
  })
}
