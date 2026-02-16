// router.ts

import { createWebHistory, type RouteRecordRaw } from 'vue-router';
import { initRouter } from 'cic-kit';
import ProductsView from './views/products/ProductsView.vue';
import ProductEditView from './views/products/ProductEditView.vue';
import ProductView from './views/products/ProductView.vue';
import HomeView from './views/HomeView.vue';
import TreatmentsView from './views/treatments/TreatmentsView.vue';
import TreatmentView from './views/treatments/TreatmentView.vue';
import TreatmentEditView from './views/treatments/TreatmentEditView.vue';


// ===================================================================================================
export const routes: RouteRecordRaw[] = [
  // public
  { path: '/', name: 'home', component: HomeView },
  { path: '/treatments', name: 'TreatmentsView', component: TreatmentsView },
  { path: '/treatment', name: 'TreatmentView', component: TreatmentView },
  { path: '/products', name: 'ProductsView', component: ProductsView },
  { path: '/product/:id', name: 'ProductView', component: ProductView },

  // -------------------------------------------------------------------------------------------------
  // auth
  { path: '/treatment/:id/edit', name: 'TreatmentEditView', component: TreatmentEditView },
  { path: '/product/:id/edit', name: 'ProductEditView', component: ProductEditView, meta: { loginStatus: true } },
];

// ===================================================================================================
export const router = initRouter({
  history: createWebHistory(),
  routes
})
export default router

