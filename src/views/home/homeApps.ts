import { defaultUserPermission } from 'cic-kit'
import type { RouteLocationRaw } from 'vue-router'
import { UserPermission } from '../../enums/UserPermission'
import type { AppPermissionInput } from '../../utils/permissions'

export type HomeAppShortcut = {
  id: string
  title: string
  to: RouteLocationRaw
  icon: string
  iconClass: string
  permission?: AppPermissionInput
  group?: 'settings'
}

export const GUEST_HOME_APPS: HomeAppShortcut[] = [
  {
    id: 'catalog-treatments',
    title: 'Catalogo Trattamenti',
    to: { name: 'TreatmentCategoriesView' },
    icon: 'spa',
    iconClass: 'app-icon-calm',
  },
  {
    id: 'catalog-products',
    title: 'Catalogo Prodotti',
    to: { name: 'ProductCategoriesView' },
    icon: 'shopping_bag',
    iconClass: 'app-icon-warm',
  },
]

export const AUTH_HOME_APPS: HomeAppShortcut[] = [
  {
    id: 'user-profile',
    title: 'Profilo',
    to: '/user',
    icon: 'manage_accounts',
    iconClass: 'app-icon-soft',
    group: 'settings',
  },
  {
    id: 'calendar',
    title: 'Calendario',
    to: { name: 'CalendarView' },
    icon: 'calendar_month',
    iconClass: 'app-icon-rose',
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
  },
  {
    id: 'clients',
    title: 'Clienti',
    to: { name: 'ClientsView' },
    icon: 'groups',
    iconClass: 'app-icon-ocean',
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
  },
  {
    id: 'expenses',
    title: 'Spese',
    to: { name: 'ExpensesView' },
    icon: 'account_balance_wallet',
    iconClass: 'app-icon-amber',
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
  },
  {
    id: 'coupons',
    title: 'Coupon',
    to: { name: 'CouponsView' },
    icon: 'local_offer',
    iconClass: 'app-icon-calm',
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
  },
  {
    id: 'stats',
    title: 'Statistiche',
    to: { name: 'StatsView' },
    icon: 'bar_chart',
    iconClass: 'app-icon-sky',
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
  },
  {
    id: 'relations',
    title: 'Relazioni',
    to: { name: 'RelationsView' },
    icon: 'schema',
    iconClass: 'app-icon-night',
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
    group: 'settings',
  },
  {
    id: 'products-manage',
    title: 'Prodotti',
    to: { name: 'ProductsManageView' },
    icon: 'shopping_bag',
    iconClass: 'app-icon-warm',
  },
  {
    id: 'treatments-manage',
    title: 'Trattamenti',
    to: { name: 'TreatmentsManageView' },
    icon: 'bolt',
    iconClass: 'app-icon-calm',
  },
  {
    id: 'product-categories-manage',
    title: 'Cat. Prodotti',
    to: { name: 'ProductCategoriesManageView' },
    icon: 'edit_note',
    iconClass: 'app-icon-soft',
    group: 'settings',
  },
  {
    id: 'treatment-categories-manage',
    title: 'Cat. Trattamenti',
    to: { name: 'TreatmentCategoriesManageView' },
    icon: 'edit_note',
    iconClass: 'app-icon-soft',
    group: 'settings',
  },
  {
    id: 'type-expenses',
    title: 'Tipi di spesa',
    to: { name: 'TypeExpensesView' },
    icon: 'payments',
    iconClass: 'app-icon-amber',
    group: 'settings',
  },
  {
    id: 'ai-beauty-chat',
    title: 'Chat AI Beauty',
    to: { name: 'AiBeautyChatView' },
    icon: 'chat',
    iconClass: 'app-icon-sky',
    permission: UserPermission.AI_BETA_FEATURES,
  },
  {
    id: 'announcements',
    title: 'Avvisi',
    to: { name: 'AnnouncementsView' },
    icon: 'notifications',
    iconClass: 'app-icon-rose',
    permission: defaultUserPermission.BETA_FEATURES,
  },
  {
    id: 'app-config',
    title: 'App Config',
    to: { name: 'AppConfigView' },
    icon: 'settings',
    iconClass: 'app-icon-night',
    permission: defaultUserPermission.SUPERADMIN,
    group: 'settings',
  },
  {
    id: 'catalog-backup',
    title: 'Backup JSON',
    to: { name: 'CatalogBackupView' },
    icon: 'download',
    iconClass: 'app-icon-night',
    permission: defaultUserPermission.SUPERADMIN,
    group: 'settings',
  },
  {
    id: 'agent-prompts',
    title: 'Prompt Agenti AI',
    to: { name: 'AgentPromptsView' },
    icon: 'psychology',
    iconClass: 'app-icon-sky',
    permission: defaultUserPermission.ADMIN,
    group: 'settings',
  },
  {
    id: 'test-playground',
    title: 'Test Playground',
    to: { name: 'TestPlaygroundView' },
    icon: 'science',
    iconClass: 'app-icon-night',
    permission: defaultUserPermission.BETA_FEATURES,
    group: 'settings',
  },
  {
    id: 'pdf-placement-demo',
    title: 'PDF Demo',
    to: { name: 'PdfPlacementDemoView' },
    icon: 'picture_as_pdf',
    iconClass: 'app-icon-soft',
    permission: defaultUserPermission.BETA_FEATURES,
  },
  {
    id: 'migration-import',
    title: 'Import Migrazione',
    to: { name: 'MigrationImportView' },
    icon: 'upload_file',
    iconClass: 'app-icon-amber',
    permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES],
    group: 'settings',
  },
]
