<script setup lang="ts">
import { cicKitStore, defaultUserPermission, LoaderCmp, loading, ToastCmp, ModalDev, RegisterSW, AutoPushPermissionModal, HeaderApp, useStoreWatch } from 'cic-kit';
import { computed, nextTick, onMounted, watch, type CSSProperties } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { Auth } from './main';
import { registerSW } from "virtual:pwa-register";
import { publicUserStore } from './stores/publicUser';
import { UserPermission } from './enums/UserPermission';
import CookieConsentBanner from './components/CookieConsentBanner.vue';
import { appConfigStore } from './stores/appConfigStore';
import AppQuickToolbar from './components/navigation/AppQuickToolbar.vue';
import { treatmentStore } from './stores/treatmentStore';
import { treatmentCategoryStore } from './stores/treatmentCategoryStore';
import { productStore } from './stores/productStore';
import { productCategoryStore } from './stores/productCategoryStore';
import { typeExpenseStore } from './stores/typeExpenseStore';
import { clientStore } from './stores/clientStore';
import { couponStore } from './stores/couponStore';
import { calendarRecurrenceStore } from './stores/calendarRecurrenceStore';
import { whatsAppTemplateStore } from './stores/whatsAppTemplateStore';
import { ensureAppointmentWatchRunning } from './composables/useAppointmentWatchManager';

const route = useRoute();
let initAppLoadingClosed = false;
const userPermission = computed(() => Object.values(UserPermission));
const isPublicRoute = computed(() => Boolean(route.meta.publicRoute));
const showAppHeader = computed(() => !isPublicRoute.value);
const showQuickToolbar = computed(() => Boolean(Auth.isLoggedIn));
const publicMainInlineStyle = computed<CSSProperties | undefined>(() => {
  if (!isPublicRoute.value) {
    return undefined
  }

  return {
    display: 'block',
    height: 'auto',
    minHeight: '100dvh',
    overflowY: 'visible',
    overflowX: 'clip',
  }
})

useStoreWatch([
  { store: appConfigStore, checkLogin: false },
  { store: treatmentCategoryStore, checkLogin: false },
  { store: treatmentStore, checkLogin: false },
  { store: productStore, checkLogin: false },
  { store: productCategoryStore, checkLogin: false },
  { store: clientStore },
  { store: publicUserStore },
  { store: typeExpenseStore },
  { store: calendarRecurrenceStore },
  { store: couponStore },
  { store: whatsAppTemplateStore },
]);

ensureAppointmentWatchRunning()

watch(
  () => Auth?.isLoggedIn,
  () => {
    if (Auth?.isLoggedIn) {
      cicKitStore.autoUpdate = true;
      cicKitStore.serviceWorkerToast = true;
      cicKitStore.appConfig.start();
    } else {
      if (cicKitStore.autoUpdate) {
        cicKitStore.autoUpdate = false;
      }
      if (cicKitStore.serviceWorkerToast) {
        cicKitStore.serviceWorkerToast = false;
      }
    }
    ensureAppointmentWatchRunning()
  },
  { immediate: true },
)

watch(
  () => (Array.isArray(Auth?.user?.permissions) ? Auth.user.permissions.join('|') : ''),
  () => {
    ensureAppointmentWatchRunning()
  },
  { immediate: true },
)

watch(
  () => `${String(Auth?.firebaseUser?.uid ?? '')}|${Boolean(Auth?.isOnLoginProcess)}`,
  () => {
    ensureAppointmentWatchRunning()
  },
)

async function onRouteComponentMounted() {
  if (initAppLoadingClosed) {
    return;
  }
  initAppLoadingClosed = true;
  await nextTick();
  loading.off('loading:initApp');
}

onMounted(() => {
  document.getElementsByClassName('starter-loader')?.[0]?.remove();
})
</script>

<template>
  <LoaderCmp v-if="loading.state" />
  <HeaderApp v-if="showAppHeader" />

  <main :class="{
    'app-main--public': isPublicRoute,
    'app-main--with-quick-toolbar': showQuickToolbar,
  }" :style="publicMainInlineStyle">
    <RouterView v-slot="{ Component, route: activeRoute }">
      <component :is="Component" :key="activeRoute.fullPath" @vue:mounted="onRouteComponentMounted" />
    </RouterView>
  </main>

  <AppQuickToolbar v-if="showQuickToolbar" />
  <ModalDev v-if="Auth?.user?.hasPermission(defaultUserPermission.MODAL_DEV_ON) && cicKitStore.debugMod"
    :public-users="publicUserStore.items" :user_permissions="userPermission" />
  <ToastCmp />
  <CookieConsentBanner />
  <RegisterSW :registerSW="registerSW" />
  <AutoPushPermissionModal :only-after-login="true" />
</template>

<style>
main.app-main--with-quick-toolbar {
  padding-bottom: calc(92px + env(safe-area-inset-bottom));
}
</style>
