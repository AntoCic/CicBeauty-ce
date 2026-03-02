import type { RouteLocationRaw } from 'vue-router'

export type HomeAppPermissionRule = {
  requiresOperator?: boolean
  requiresAdmin?: boolean
  requiresSuperAdmin?: boolean
  requiresBetaFeatures?: boolean
  requiresAi?: boolean
  requiresAiBetaFeatures?: boolean
}

export type HomeAppShortcut = {
  id: string
  title: string
  to: RouteLocationRaw
  icon: string
  iconClass: string
  permissionRule?: HomeAppPermissionRule
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
  {
    id: 'announcements',
    title: 'Avvisi',
    to: { name: 'AnnouncementsView' },
    icon: 'campaign',
    iconClass: 'app-icon-soft',
  },
]

export const AUTH_HOME_APPS: HomeAppShortcut[] = [
  {
    id: 'calendar',
    title: 'Calendario',
    to: { name: 'CalendarView' },
    icon: 'calendar_month',
    iconClass: 'app-icon-rose',
    permissionRule: { requiresOperator: true },
  },
  {
    id: 'clients',
    title: 'Clienti',
    to: { name: 'ClientsView' },
    icon: 'groups',
    iconClass: 'app-icon-ocean',
    permissionRule: { requiresOperator: true },
  },
  {
    id: 'expenses',
    title: 'Spese',
    to: { name: 'ExpensesView' },
    icon: 'account_balance_wallet',
    iconClass: 'app-icon-amber',
    permissionRule: { requiresOperator: true },
  },
  {
    id: 'coupons',
    title: 'Coupon',
    to: { name: 'CouponsView' },
    icon: 'local_offer',
    iconClass: 'app-icon-calm',
    permissionRule: { requiresOperator: true },
  },
  {
    id: 'stats',
    title: 'Statistiche',
    to: { name: 'StatsView' },
    icon: 'bar_chart',
    iconClass: 'app-icon-sky',
    permissionRule: { requiresOperator: true },
  },
  {
    id: 'relations',
    title: 'Relazioni',
    to: { name: 'RelationsView' },
    icon: 'schema',
    iconClass: 'app-icon-night',
    permissionRule: { requiresOperator: true },
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
  },
  {
    id: 'treatment-categories-manage',
    title: 'Cat. Trattamenti',
    to: { name: 'TreatmentCategoriesManageView' },
    icon: 'edit_note',
    iconClass: 'app-icon-soft',
  },
  {
    id: 'type-expenses',
    title: 'Tipi di spesa',
    to: { name: 'TypeExpensesView' },
    icon: 'payments',
    iconClass: 'app-icon-amber',
  },
  {
    id: 'ai-beauty-chat',
    title: 'Chat AI Beauty',
    to: { name: 'AiBeautyChatView' },
    icon: 'chat',
    iconClass: 'app-icon-sky',
    permissionRule: { requiresAi: true, requiresAiBetaFeatures: true },
  },
  {
    id: 'announcements',
    title: 'Avvisi',
    to: { name: 'AnnouncementsView' },
    icon: 'notifications',
    iconClass: 'app-icon-rose',
    permissionRule: { requiresBetaFeatures: true },
  },
  {
    id: 'app-config',
    title: 'App Config',
    to: { name: 'AppConfigView' },
    icon: 'settings',
    iconClass: 'app-icon-night',
    permissionRule: { requiresSuperAdmin: true },
  },
  {
    id: 'agent-prompts',
    title: 'Prompt Agenti AI',
    to: { name: 'AgentPromptsView' },
    icon: 'psychology',
    iconClass: 'app-icon-sky',
    permissionRule: { requiresAdmin: true },
  },
  {
    id: 'test-playground',
    title: 'Test Playground',
    to: { name: 'TestPlaygroundView' },
    icon: 'science',
    iconClass: 'app-icon-night',
    permissionRule: { requiresBetaFeatures: true },
  },
  {
    id: 'migration-import',
    title: 'Import Migrazione',
    to: { name: 'MigrationImportView' },
    icon: 'upload_file',
    iconClass: 'app-icon-amber',
    permissionRule: { requiresBetaFeatures: true, requiresOperator: true },
  },
]
