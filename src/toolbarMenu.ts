import { defaultUserPermission, type OffcanvasTab } from "cic-kit";
import { Auth } from "./main";
import { UserPermission } from "./enums/UserPermission";
import type { AppPermissionInput } from "./utils/permissions";

type OffcanvasTabConfig = OffcanvasTab & {
  permission?: AppPermissionInput
}

const toolbarOffcanvasTabConfigs: OffcanvasTabConfig[] = [
  {
    name: 'Calendario',
    icon: 'calendar_month',
    to: { name: 'CalendarView' },
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
  },
  {
    name: 'Clienti',
    icon: 'groups',
    to: { name: 'ClientsView' },
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
  },
  {
    name: 'Spese',
    icon: 'account_balance_wallet',
    to: { name: 'ExpensesView' },
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
  },
  {
    name: 'Coupon',
    icon: 'local_offer',
    to: { name: 'CouponsView' },
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
  },
  {
    name: 'Statistiche',
    icon: 'bar_chart',
    to: { name: 'StatsView' },
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
  },
  {
    name: 'Relazioni',
    icon: 'schema',
    to: { name: 'RelationsView' },
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
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
    permission: defaultUserPermission.SUPERADMIN,
  },
  {
    name: 'Backup Catalogo JSON',
    icon: 'download',
    to: { name: 'CatalogBackupView' },
    permission: defaultUserPermission.SUPERADMIN,
  },
  {
    name: 'Prompt Agenti AI',
    icon: 'psychology',
    to: { name: 'AgentPromptsView' },
    permission: defaultUserPermission.ADMIN,
  },
  {
    name: 'Avvisi',
    icon: 'notifications',
    to: { name: 'AnnouncementsView' },
    permission: defaultUserPermission.BETA_FEATURES,
  },
  {
    name: 'PDF Demo',
    icon: 'picture_as_pdf',
    to: { name: 'PdfPlacementDemoView' },
    permission: defaultUserPermission.BETA_FEATURES,
  },
  {
    name: 'Project Msg Demo',
    icon: 'send',
    to: { name: 'ProjectMessageDemoView' },
    permission: defaultUserPermission.BETA_FEATURES,
  },
  {
    name: 'Test Playground',
    icon: 'science',
    to: { name: 'TestPlaygroundView' },
    permission: defaultUserPermission.BETA_FEATURES,
  },
  {
    name: 'Import Migrazione',
    icon: 'upload_file',
    to: { name: 'MigrationImportView' },
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
  },
];

export function getToolbarOffcanvasTabs(): OffcanvasTab[] {
  return toolbarOffcanvasTabConfigs
    .filter((tab) => !tab.permission || (Auth?.user?.hasPermission(tab.permission) ?? false))
    .map(({ permission, ...tab }) => tab)
}
