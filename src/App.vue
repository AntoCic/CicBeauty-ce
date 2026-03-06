<script setup lang="ts">
import { cicKitStore, defaultUserPermission, LoaderCmp, loading, ToastCmp, ModalDev, RegisterSW, AutoPushPermissionModal, HeaderApp, useStoreWatch } from 'cic-kit';
import { computed, nextTick, onMounted, ref, watch, type CSSProperties } from 'vue';
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
import { typeCouponStore } from './stores/typeCouponStore';
import { Timestamp, where } from 'firebase/firestore';

const route = useRoute();
let initAppLoadingClosed = false;
const userPermission = computed(() => Object.values(UserPermission));
const pageTransitionName = ref('page-fade');
let previousPublicDepth: number | null = null;
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


const startToday = new Date();
startToday.setHours(0, 0, 0, 0);

const tomorrow = new Date(startToday);
tomorrow.setDate(tomorrow.getDate() + 1);

useStoreWatch([
  { store: appConfigStore, checkLogin: false },
  { store: treatmentCategoryStore, checkLogin: false },
  { store: treatmentStore, checkLogin: false },
  { store: productStore, checkLogin: false },
  { store: productCategoryStore, checkLogin: false },
  { store: clientStore },
  { store: publicUserStore },
  { store: typeExpenseStore },
  { store: typeCouponStore },
  {
    store: couponStore,
    getOpts: {
      query: [
        where("active", "==", true),
        where("valid_from", ">=", Timestamp.fromDate(startToday)),
        where("valid_to", "<=", Timestamp.fromDate(tomorrow)),
      ],
    },
  },
]);

watch(
  () => route.fullPath,
  () => {
    const isPublicRoute = Boolean(route.meta.publicRoute);
    const depthValue = route.meta.publicDepth;
    const currentDepth = typeof depthValue === 'number' ? depthValue : null;

    if (isPublicRoute && currentDepth !== null && previousPublicDepth !== null) {
      if (currentDepth > previousPublicDepth) {
        pageTransitionName.value = 'page-slide-forward';
      } else if (currentDepth < previousPublicDepth) {
        pageTransitionName.value = 'page-slide-back';
      } else {
        pageTransitionName.value = 'page-fade';
      }
    } else {
      pageTransitionName.value = 'page-fade';
    }

    previousPublicDepth = isPublicRoute ? currentDepth : null;
  },
  { immediate: true },
);


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
  },
  { immediate: true },
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
      <Transition :name="pageTransitionName" mode="out-in">
        <component :is="Component" :key="activeRoute.fullPath" @vue:mounted="onRouteComponentMounted" />
      </Transition>
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
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 340ms cubic-bezier(0.22, 0.8, 0.26, 1), transform 340ms cubic-bezier(0.22, 0.8, 0.26, 1);
  will-change: opacity, transform;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translate3d(0, 14px, 0);
}

.page-slide-forward-enter-active,
.page-slide-forward-leave-active,
.page-slide-back-enter-active,
.page-slide-back-leave-active {
  transition: opacity 380ms cubic-bezier(0.16, 1, 0.3, 1), transform 380ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

.page-slide-forward-enter-from {
  opacity: 0;
  transform: translate3d(24px, 0, 0);
}

.page-slide-forward-leave-to {
  opacity: 0;
  transform: translate3d(-16px, 0, 0);
}

.page-slide-back-enter-from {
  opacity: 0;
  transform: translate3d(-24px, 0, 0);
}

.page-slide-back-leave-to {
  opacity: 0;
  transform: translate3d(16px, 0, 0);
}

@media (prefers-reduced-motion: reduce) {

  .page-fade-enter-active,
  .page-fade-leave-active,
  .page-slide-forward-enter-active,
  .page-slide-forward-leave-active,
  .page-slide-back-enter-active,
  .page-slide-back-leave-active {
    transition-duration: 1ms;
  }

  .page-fade-enter-from,
  .page-fade-leave-to,
  .page-slide-forward-enter-from,
  .page-slide-forward-leave-to,
  .page-slide-back-enter-from,
  .page-slide-back-leave-to {
    transform: none;
  }
}

main.app-main--with-quick-toolbar {
  padding-bottom: calc(92px + env(safe-area-inset-bottom));
}
</style>
