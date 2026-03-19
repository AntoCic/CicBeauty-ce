// router.ts

import { createWebHistory, type RouteLocationNormalizedLoaded, type RouteRecordRaw } from 'vue-router';
import { defaultUserPermission, initRouter } from 'cic-kit';
import { UserPermission } from './enums/UserPermission';
import ProductsView from './views/products/ProductsView.vue';
import ProductsManageView from './views/products/ProductsManageView.vue';
import ProductCategoriesView from './views/products/ProductCategoriesView.vue';
import ProductCategoriesManageView from './views/products/ProductCategoriesManageView.vue';
import ProductEditView from './views/products/ProductEditView.vue';
import ProductView from './views/products/ProductView.vue';
import HomeView from './views/home/HomeView.vue';
import HomeAuthView from './views/home/HomeAuthView.vue';
import UserView from './views/user/UserView.vue';
import TreatmentsView from './views/treatments/TreatmentsView.vue';
import TreatmentsManageView from './views/treatments/TreatmentsManageView.vue';
import TreatmentCategoriesView from './views/treatments/TreatmentCategoriesView.vue';
import TreatmentCategoriesManageView from './views/treatments/TreatmentCategoriesManageView.vue';
import TreatmentView from './views/treatments/TreatmentView.vue';
import TreatmentEditView from './views/treatments/TreatmentEditView.vue';
import TypeExpensesView from './views/type-expenses/TypeExpensesView.vue';
import AnnouncementsView from './views/announcements/AnnouncementsView.vue';
import AiBeautyChatView from './views/ai/AiBeautyChatView.vue';
import PdfPlacementDemoView from './views/tools/PdfPlacementDemoView.vue';
import PrivacyPolicyView from './views/legal/PrivacyPolicyView.vue';
import CookiePolicyView from './views/legal/CookiePolicyView.vue';
import TermsConditionsView from './views/legal/TermsConditionsView.vue';
import AiTransparencyView from './views/legal/AiTransparencyView.vue';
import AppConfigView from './views/app-config/AppConfigView.vue';
import AgentPromptsView from './views/ai/AgentPromptsView.vue';
import TestPlaygroundView from './views/tools/TestPlaygroundView.vue';
import CalendarDayView from './views/calendar/CalendarDayView.vue';
import AppointmentEditView from './views/calendar/AppointmentEditView.vue';
import CalendarRecurrenceRulesView from './views/calendar/CalendarRecurrenceRulesView.vue';
import ClientsView from './views/clients/ClientsView.vue';
import ClientEditView from './views/clients/ClientEditView.vue';
import ClientLaserSheetView from './views/clients/ClientLaserSheetView.vue';
import ClientLaserSheetsView from './views/clients/ClientLaserSheetsView.vue';
import PublicLaserSheetFormView from './views/clients/PublicLaserSheetFormView.vue';
import ExpensesView from './views/expenses/ExpensesView.vue';
import CouponsView from './views/coupons/CouponsView.vue';
import CouponGiftCreateView from './views/coupons/CouponGiftCreateView.vue';
import CouponsListView from './views/coupons/CouponsListView.vue';
import CouponDetailView from './views/coupons/CouponDetailView.vue';
import StatisticheGuadagniView from './views/home/auth/app/statistiche/StatisticheGuadagniView.vue';
import StatisticheClientiView from './views/home/auth/app/statistiche/StatisticheClientiView.vue';
import StatisticheAppuntamentiView from './views/home/auth/app/statistiche/StatisticheAppuntamentiView.vue';
import StatisticheAppView from './views/home/auth/app/statistiche/StatisticheAppView.vue';
import MigrationImportView from './views/migration/MigrationImportView.vue';
import CatalogBackupView from './views/settings/CatalogBackupView.vue';
import WhatsAppTemplatesView from './views/settings/WhatsAppTemplatesView.vue';
import BonificoView from './views/payments/BonificoView.vue';
import PriceListView from './views/price-list/PriceListView.vue';
import RefreshHomeView from './views/tools/RefreshHomeView.vue';


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
      keepAlive: true,
      title: 'CNC Beauty | Trattamenti, prodotti e benessere',
      description: 'Centro estetico CNC Beauty: trattamenti professionali, prodotti selezionati e consulenza personalizzata.',
    },
  },
  {
    path: '/home-app',
    name: 'homeApp',
    component: HomeAuthView,
    meta: {
      loginStatus: true,
      publicRoute: true,
      robots: 'noindex,nofollow',
    },
  },
  {
    path: '/laser-share/:token',
    name: 'PublicLaserSheetFormView',
    component: PublicLaserSheetFormView,
    meta: {
      publicRoute: true,
      publicDepth: 0,
      robots: 'noindex,nofollow',
      title: 'Compilazione Scheda Laser | CNC Beauty',
      description: 'Compilazione guidata della scheda laser condivisa con operatore.',
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
  { path: '/calendar/day', name: 'CalendarDayView', component: CalendarDayView, meta: { loginStatus: true, permission: UserPermission.OPERATORE } },
  { path: '/appointments/:id', name: 'AppointmentEditView', component: AppointmentEditView, meta: { loginStatus: true, permission: UserPermission.OPERATORE } },
  { path: '/clients', name: 'ClientsView', component: ClientsView, meta: { loginStatus: true, permission: UserPermission.OPERATORE } },
  {
    path: '/clients/:id',
    alias: '/clientes/:id',
    name: 'ClientEditView',
    component: ClientEditView,
    meta: { loginStatus: true, permission: UserPermission.OPERATORE },
  },
  { path: '/clients/:id/laser', name: 'ClientLaserSheetView', component: ClientLaserSheetView, meta: { loginStatus: true, permission: UserPermission.OPERATORE } },
  { path: '/laser-sheets', name: 'ClientLaserSheetsView', component: ClientLaserSheetsView, meta: { loginStatus: true, permission: UserPermission.OPERATORE } },
  { path: '/expenses', name: 'ExpensesView', component: ExpensesView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/bonifico-app', name: 'BonificoView', component: BonificoView, meta: { loginStatus: true, permission: UserPermission.OPERATORE } },
  { path: '/price-list', name: 'PriceListView', component: PriceListView, meta: { loginStatus: true, permission: UserPermission.OPERATORE } },
  { path: '/coupons', name: 'CouponsView', component: CouponsView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/coupons/create/gift', name: 'CouponGiftCreateView', component: CouponGiftCreateView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/coupons/list', name: 'CouponsListView', component: CouponsListView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/coupons/:id', name: 'CouponDetailView', component: CouponDetailView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  {
    path: '/stats',
    name: 'StatsView',
    component: StatisticheAppView,
    meta: { loginStatus: true, permission: [UserPermission.OPERATORE] },
    children: [
      {
        path: '',
        redirect: { name: 'StatsGuadagniView' },
      },
      {
        path: 'guadagni',
        name: 'StatsGuadagniView',
        component: StatisticheGuadagniView,
        meta: { loginStatus: true, permission: [UserPermission.OPERATORE] },
      },
      {
        path: 'clienti',
        name: 'StatsClientiView',
        component: StatisticheClientiView,
        meta: { loginStatus: true, permission: [UserPermission.OPERATORE] },
      },
      {
        path: 'appuntamenti',
        name: 'StatsAppuntamentiView',
        component: StatisticheAppuntamentiView,
        meta: { loginStatus: true, permission: [UserPermission.OPERATORE] },
      },
    ],
  },
  { path: '/migration/import', name: 'MigrationImportView', component: MigrationImportView, meta: { loginStatus: true, permission: [UserPermission.OPERATORE, defaultUserPermission.BETA_FEATURES] } },
  { path: '/announcements', name: 'AnnouncementsView', component: AnnouncementsView, meta: { loginStatus: true, permission: defaultUserPermission.BETA_FEATURES } },
  { path: '/settings/app-config', name: 'AppConfigView', component: AppConfigView, meta: { loginStatus: true, permission: defaultUserPermission.SUPERADMIN } },
  { path: '/settings/agent-prompts', name: 'AgentPromptsView', component: AgentPromptsView, meta: { loginStatus: true, permission: defaultUserPermission.ADMIN } },
  { path: '/settings/calendar-recurrences', name: 'CalendarRecurrenceRulesView', component: CalendarRecurrenceRulesView, meta: { loginStatus: true, permission: defaultUserPermission.ADMIN } },
  { path: '/settings/catalog-backup', name: 'CatalogBackupView', component: CatalogBackupView, meta: { loginStatus: true, permission: defaultUserPermission.SUPERADMIN } },
  { path: '/settings/whatsapp-templates', name: 'WhatsAppTemplatesView', component: WhatsAppTemplatesView, meta: { loginStatus: true, permission: defaultUserPermission.ADMIN } },
  { path: '/tools/refresh-home', name: 'RefreshHomeView', component: RefreshHomeView, meta: { loginStatus: true } },
  {
    path: '/ai/beauty-chat',
    name: 'AiBeautyChatView',
    component: AiBeautyChatView,
    meta: {
      title: 'Beauty AI Chat | CNC Beauty',
      description: 'Assistente AI interno CNC Beauty per supporto operativo e consultazione rapida.',
      robots: 'noindex,nofollow',
    },
  },
  {
    path: '/legal/privacy',
    name: 'PrivacyPolicyView',
    component: PrivacyPolicyView,
    meta: {
      title: 'Privacy Policy | CNC Beauty',
      description: 'Informativa privacy di CNC Beauty su trattamento dati, basi giuridiche e diritti degli interessati.',
      robots: 'index,follow',
    },
  },
  {
    path: '/legal/cookie',
    name: 'CookiePolicyView',
    component: CookiePolicyView,
    meta: {
      title: 'Cookie Policy | CNC Beauty',
      description: 'Cookie Policy CNC Beauty: finalita, categorie di cookie e gestione del consenso analytics.',
      robots: 'index,follow',
    },
  },
  {
    path: '/legal/terms',
    name: 'TermsConditionsView',
    component: TermsConditionsView,
    meta: {
      title: 'Termini e Condizioni | CNC Beauty',
      description: 'Termini e condizioni d\'uso del sito CNC Beauty per servizi informativi e catalogo.',
      robots: 'index,follow',
    },
  },
  {
    path: '/legal/ai-transparency',
    name: 'AiTransparencyView',
    component: AiTransparencyView,
    meta: {
      title: 'Trasparenza AI | CNC Beauty',
      description: 'Trasparenza AI CNC Beauty: provider, modello, limiti e contatti privacy collegati alle funzioni AI.',
      robots: 'index,follow',
    },
  },
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

function ensureNamedMetaTag(name: string): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null
  let metaTag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!metaTag) {
    metaTag = document.createElement('meta')
    metaTag.setAttribute('name', name)
    document.head.appendChild(metaTag)
  }
  return metaTag
}

function ensureCanonicalLinkTag(): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null
  let linkTag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!linkTag) {
    linkTag = document.createElement('link')
    linkTag.setAttribute('rel', 'canonical')
    document.head.appendChild(linkTag)
  }
  return linkTag
}

function resolveRobotsMeta(to: RouteLocationNormalizedLoaded): string {
  const explicitRobots = String(to.meta.robots ?? '').trim()
  if (explicitRobots) {
    return explicitRobots
  }

  return to.meta.publicRoute ? 'index,follow' : 'noindex,nofollow'
}

router.afterEach((to) => {
  if (typeof document === 'undefined') return

  const routeTitle = String(to.meta.title ?? '').trim()
  document.title = routeTitle || DEFAULT_PUBLIC_TITLE

  const routeDescription = String(to.meta.description ?? '').trim()
  const descriptionTag = ensureNamedMetaTag('description')
  if (descriptionTag) {
    descriptionTag.setAttribute('content', routeDescription || DEFAULT_PUBLIC_DESCRIPTION)
  }

  const robotsTag = ensureNamedMetaTag('robots')
  if (robotsTag) {
    robotsTag.setAttribute('content', resolveRobotsMeta(to))
  }

  if (typeof window !== 'undefined') {
    const canonicalTag = ensureCanonicalLinkTag()
    if (canonicalTag) {
      canonicalTag.setAttribute('href', `${window.location.origin}${to.path}`)
    }
  }
})

export default router
