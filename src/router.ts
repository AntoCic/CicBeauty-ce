// router.ts

import { createWebHistory, type RouteRecordRaw } from 'vue-router';
import { initRouter } from 'cic-kit';
import ProductsView from './views/products/ProductsView.vue';
import ProductsManageView from './views/products/ProductsManageView.vue';
import ProductCategoriesView from './views/products/ProductCategoriesView.vue';
import ProductCategoriesManageView from './views/products/ProductCategoriesManageView.vue';
import ProductEditView from './views/products/ProductEditView.vue';
import ProductView from './views/products/ProductView.vue';
import HomeView from './views/HomeView.vue';
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
import ProjectMessageDemoView from './views/tools/ProjectMessageDemoView.vue';
import PrivacyPolicyView from './views/legal/PrivacyPolicyView.vue';
import CookiePolicyView from './views/legal/CookiePolicyView.vue';
import TermsConditionsView from './views/legal/TermsConditionsView.vue';
import AiTransparencyView from './views/legal/AiTransparencyView.vue';
import AppConfigView from './views/app-config/AppConfigView.vue';
import AgentPromptsView from './views/ai/AgentPromptsView.vue';
import TestPlaygroundView from './views/tools/TestPlaygroundView.vue';
import CatalogBackupView from './views/settings/CatalogBackupView.vue';


// ===================================================================================================
export const routes: RouteRecordRaw[] = [
  // public
  { path: '/', name: 'home', component: HomeView },
  { path: '/treatments', name: 'TreatmentCategoriesView', component: TreatmentCategoriesView },
  { path: '/treatments/manage', name: 'TreatmentsManageView', component: TreatmentsManageView, meta: { loginStatus: true } },
  { path: '/treatments/category/:categoryId?', name: 'TreatmentsView', component: TreatmentsView },
  { path: '/treatment/:id', name: 'TreatmentView', component: TreatmentView },
  { path: '/products', name: 'ProductCategoriesView', component: ProductCategoriesView },
  { path: '/products/manage', name: 'ProductsManageView', component: ProductsManageView, meta: { loginStatus: true } },
  { path: '/products/category/:categoryId?', name: 'ProductsView', component: ProductsView },
  { path: '/product/:id', name: 'ProductView', component: ProductView },
  { path: '/type-expenses', name: 'TypeExpensesView', component: TypeExpensesView, meta: { loginStatus: true } },
  { path: '/announcements', name: 'AnnouncementsView', component: AnnouncementsView },
  { path: '/settings/app-config', name: 'AppConfigView', component: AppConfigView, meta: { loginStatus: true } },
  { path: '/settings/agent-prompts', name: 'AgentPromptsView', component: AgentPromptsView, meta: { loginStatus: true } },
  { path: '/settings/catalog-backup', name: 'CatalogBackupView', component: CatalogBackupView, meta: { loginStatus: true } },
  { path: '/ai/beauty-chat', name: 'AiBeautyChatView', component: AiBeautyChatView },
  { path: '/legal/privacy', name: 'PrivacyPolicyView', component: PrivacyPolicyView },
  { path: '/legal/cookie', name: 'CookiePolicyView', component: CookiePolicyView },
  { path: '/legal/terms', name: 'TermsConditionsView', component: TermsConditionsView },
  { path: '/legal/ai-transparency', name: 'AiTransparencyView', component: AiTransparencyView },
  { path: '/tools/pdf-placement-demo', name: 'PdfPlacementDemoView', component: PdfPlacementDemoView, meta: { loginStatus: true } },
  { path: '/tools/project-message-demo', name: 'ProjectMessageDemoView', component: ProjectMessageDemoView, meta: { loginStatus: true } },
  { path: '/tools/test-playground', name: 'TestPlaygroundView', component: TestPlaygroundView, meta: { loginStatus: true } },
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
export default router

