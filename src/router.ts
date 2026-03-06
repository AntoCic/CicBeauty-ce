// router.ts

import { createWebHistory, type RouteRecordRaw } from 'vue-router';
import { defaultUserPermission, initRouter } from 'cic-kit';
import { UserPermission } from './enums/UserPermission';
const ProductsView = () => import('./views/products/ProductsView.vue');
const ProductsManageView = () => import('./views/products/ProductsManageView.vue');
const ProductCategoriesView = () => import('./views/products/ProductCategoriesView.vue');
const ProductCategoriesManageView = () => import('./views/products/ProductCategoriesManageView.vue');
const ProductEditView = () => import('./views/products/ProductEditView.vue');
const ProductView = () => import('./views/products/ProductView.vue');
const HomeView = () => import('./views/home/HomeView.vue');
const UserView = () => import('./views/user/UserView.vue');
const TreatmentsView = () => import('./views/treatments/TreatmentsView.vue');
const TreatmentsManageView = () => import('./views/treatments/TreatmentsManageView.vue');
const TreatmentCategoriesView = () => import('./views/treatments/TreatmentCategoriesView.vue');
const TreatmentCategoriesManageView = () => import('./views/treatments/TreatmentCategoriesManageView.vue');
const TreatmentView = () => import('./views/treatments/TreatmentView.vue');
const TreatmentEditView = () => import('./views/treatments/TreatmentEditView.vue');
const TypeExpensesView = () => import('./views/type-expenses/TypeExpensesView.vue');
const TypeCouponsView = () => import('./views/type-coupons/TypeCouponsView.vue');
const AnnouncementsView = () => import('./views/announcements/AnnouncementsView.vue');
const AiBeautyChatView = () => import('./views/ai/AiBeautyChatView.vue');
const PdfPlacementDemoView = () => import('./views/tools/PdfPlacementDemoView.vue');
const PrivacyPolicyView = () => import('./views/legal/PrivacyPolicyView.vue');
const CookiePolicyView = () => import('./views/legal/CookiePolicyView.vue');
const TermsConditionsView = () => import('./views/legal/TermsConditionsView.vue');
const AiTransparencyView = () => import('./views/legal/AiTransparencyView.vue');
const AppConfigView = () => import('./views/app-config/AppConfigView.vue');
const AgentPromptsView = () => import('./views/ai/AgentPromptsView.vue');
const TestPlaygroundView = () => import('./views/tools/TestPlaygroundView.vue');
const CalendarView = () => import('./views/calendar/CalendarView.vue');
const CalendarDayView = () => import('./views/calendar/CalendarDayView.vue');
const AppointmentEditView = () => import('./views/calendar/AppointmentEditView.vue');
const ClientsView = () => import('./views/clients/ClientsView.vue');
const ClientEditView = () => import('./views/clients/ClientEditView.vue');
const ExpensesView = () => import('./views/expenses/ExpensesView.vue');
const CouponsView = () => import('./views/coupons/CouponsView.vue');
const StatsView = () => import('./views/stats/StatsView.vue');
const RelationsView = () => import('./views/relations/RelationsView.vue');
const MigrationImportView = () => import('./views/migration/MigrationImportView.vue');
const CatalogBackupView = () => import('./views/settings/CatalogBackupView.vue');


// ===================================================================================================
export const routes: RouteRecordRaw[] = [
  // public
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      publicRoute: true,
      publicDepth: 0,
      title: 'CNC Beauty | Trattamenti, prodotti e benessere',
      description: 'Centro estetico CNC Beauty: trattamenti professionali, prodotti selezionati e consulenza personalizzata.',
    },
  },
  {
    path: '/user',
    name: 'user',
    component: UserView,
    meta: {
      loginStatus: true,
      title: 'Profilo utente | CNC Beauty',
      description: 'Gestisci profilo, permessi e notifiche push del tuo account CNC Beauty.',
    },
  },
  {
    path: '/treatments',
    name: 'TreatmentCategoriesView',
    component: TreatmentCategoriesView,
    meta: {
      publicRoute: true,
      publicDepth: 1,
      title: 'Categorie Trattamenti | CNC Beauty',
      description: 'Esplora le categorie trattamenti CNC Beauty e trova il percorso adatto alla tua pelle.',
    },
  },
  { path: '/treatments/manage', name: 'TreatmentsManageView', component: TreatmentsManageView, meta: { loginStatus: true } },
  {
    path: '/treatments/category/:categoryId?',
    name: 'TreatmentsView',
    component: TreatmentsView,
    meta: {
      publicRoute: true,
      publicDepth: 2,
      title: 'Catalogo Trattamenti | CNC Beauty',
      description: 'Scopri i trattamenti CNC Beauty all\'interno della categoria selezionata.',
    },
  },
  {
    path: '/treatment/:id',
    name: 'TreatmentView',
    component: TreatmentView,
    meta: {
      publicRoute: true,
      publicDepth: 3,
      title: 'Dettaglio Trattamento | CNC Beauty',
      description: 'Dettaglio trattamento CNC Beauty con benefici, durata e prodotti consigliati.',
    },
  },
  {
    path: '/products',
    name: 'ProductCategoriesView',
    component: ProductCategoriesView,
    meta: {
      publicRoute: true,
      publicDepth: 1,
      title: 'Categorie Prodotti | CNC Beauty',
      description: 'Naviga tra le categorie prodotti CNC Beauty e trova la routine ideale per te.',
    },
  },
  { path: '/products/manage', name: 'ProductsManageView', component: ProductsManageView, meta: { loginStatus: true } },
  {
    path: '/products/category/:categoryId?',
    name: 'ProductsView',
    component: ProductsView,
    meta: {
      publicRoute: true,
      publicDepth: 2,
      title: 'Catalogo Prodotti | CNC Beauty',
      description: 'Selezione prodotti CNC Beauty: filtra la categoria e approfondisci il dettaglio.',
    },
  },
  {
    path: '/product/:id',
    name: 'ProductView',
    component: ProductView,
    meta: {
      publicRoute: true,
      publicDepth: 3,
      title: 'Dettaglio Prodotto | CNC Beauty',
      description: 'Dettaglio prodotto CNC Beauty con ingredienti, consigli d\'uso e trattamenti abbinati.',
    },
  },
  { path: '/type-expenses', name: 'TypeExpensesView', component: TypeExpensesView, meta: { loginStatus: true } },
  { path: '/type-coupons', name: 'TypeCouponsView', component: TypeCouponsView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/calendar', name: 'CalendarView', component: CalendarView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/calendar/day', name: 'CalendarDayView', component: CalendarDayView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/appointments/:id', name: 'AppointmentEditView', component: AppointmentEditView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/clients', name: 'ClientsView', component: ClientsView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/clients/:id', name: 'ClientEditView', component: ClientEditView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/expenses', name: 'ExpensesView', component: ExpensesView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/coupons', name: 'CouponsView', component: CouponsView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/stats', name: 'StatsView', component: StatsView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/relations', name: 'RelationsView', component: RelationsView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/migration/import', name: 'MigrationImportView', component: MigrationImportView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/announcements', name: 'AnnouncementsView', component: AnnouncementsView, meta: { loginStatus: true, permission: defaultUserPermission.BETA_FEATURES } },
  { path: '/settings/app-config', name: 'AppConfigView', component: AppConfigView, meta: { loginStatus: true, permission: defaultUserPermission.SUPERADMIN } },
  { path: '/settings/agent-prompts', name: 'AgentPromptsView', component: AgentPromptsView, meta: { loginStatus: true, permission: defaultUserPermission.ADMIN } },
  { path: '/settings/catalog-backup', name: 'CatalogBackupView', component: CatalogBackupView, meta: { loginStatus: true, permission: defaultUserPermission.SUPERADMIN } },
  { path: '/ai/beauty-chat', name: 'AiBeautyChatView', component: AiBeautyChatView },
  { path: '/legal/privacy', name: 'PrivacyPolicyView', component: PrivacyPolicyView },
  { path: '/legal/cookie', name: 'CookiePolicyView', component: CookiePolicyView },
  { path: '/legal/terms', name: 'TermsConditionsView', component: TermsConditionsView },
  { path: '/legal/ai-transparency', name: 'AiTransparencyView', component: AiTransparencyView },
  { path: '/tools/pdf-placement-demo', name: 'PdfPlacementDemoView', component: PdfPlacementDemoView, meta: { loginStatus: true, permission: defaultUserPermission.BETA_FEATURES } },
  { path: '/tools/test-playground', name: 'TestPlaygroundView', component: TestPlaygroundView, meta: { loginStatus: true, permission: defaultUserPermission.BETA_FEATURES } },
  { path: '/products/categories/manage', name: 'ProductCategoriesManageView', component: ProductCategoriesManageView, meta: { loginStatus: true } },
  { path: '/treatments/categories/manage', name: 'TreatmentCategoriesManageView', component: TreatmentCategoriesManageView, meta: { loginStatus: true } },

  // -------------------------------------------------------------------------------------------------
  // auth
  { path: '/treatment/:id/edit', name: 'TreatmentEditView', component: TreatmentEditView, meta: { loginStatus: true } },
  { path: '/product/:id/edit', name: 'ProductEditView', component: ProductEditView, meta: { loginStatus: true } },
];

// ===================================================================================================
export const router = initRouter({
  history: createWebHistory(),
  routes
})

const DEFAULT_PUBLIC_TITLE = 'CNC Beauty'
const DEFAULT_PUBLIC_DESCRIPTION = 'Centro estetico CNC Beauty: trattamenti professionali e prodotti selezionati.'

router.afterEach((to) => {
  if (typeof document === 'undefined') return

  const routeTitle = String(to.meta.title ?? '').trim()
  document.title = routeTitle || DEFAULT_PUBLIC_TITLE

  const routeDescription = String(to.meta.description ?? '').trim()
  let descriptionTag = document.querySelector('meta[name="description"]')
  if (!descriptionTag) {
    descriptionTag = document.createElement('meta')
    descriptionTag.setAttribute('name', 'description')
    document.head.appendChild(descriptionTag)
  }
  descriptionTag.setAttribute('content', routeDescription || DEFAULT_PUBLIC_DESCRIPTION)
})

export default router
