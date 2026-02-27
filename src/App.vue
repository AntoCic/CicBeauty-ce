<script setup lang="ts">
import { cicKitStore, defaultUserPermission, LoaderCmp, loading, ToastCmp, ToolbarApp, toolbarOffcanvasStore, ModalDev, RegisterSW, HeaderApp, toolbarStore, useStoreWatch } from 'cic-kit';
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { Auth } from './main';
import { getToolbarOffcanvasTabs } from './toolbarMenu';
import { registerSW } from "virtual:pwa-register";
import { publicUserStore } from './stores/publicUser';
import { UserPermission } from './enums/UserPermission';
import CookieConsentBanner from './components/CookieConsentBanner.vue';
import { appConfigStore } from './stores/appConfigStore';

const route = useRoute();
let initAppLoadingClosed = false;
const userPermission = computed(() => Object.values(UserPermission));

function applyToolbarMenu() {
  toolbarOffcanvasStore.title = "Menu";
  const hasBetaFeatures = Auth?.user?.hasPermission(defaultUserPermission.BETA_FEATURES) ?? false;
  const hasSuperAdmin = Auth?.user?.hasPermission(defaultUserPermission.SUPERADMIN) ?? false;
  toolbarOffcanvasStore.setTabs(getToolbarOffcanvasTabs(hasBetaFeatures, hasSuperAdmin));
}
useStoreWatch([{ store: appConfigStore, checkLogin: false }, { store: publicUserStore }]);

watch(
  () => Auth.isLoggedIn,
  () => {
    toolbarStore.show = Auth.isLoggedIn;
    applyToolbarMenu();
  },
);

watch(
  () => route.name,
  () => {
    applyToolbarMenu();
  },
  { immediate: true, flush: "post" }
);

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
onBeforeUnmount(() => {
  toolbarOffcanvasStore.title = "Menu";
  toolbarOffcanvasStore.setTabs(undefined);
});
</script>

<template>
  <LoaderCmp v-if="loading.state" />
  <HeaderApp />

  <main>
    <RouterView v-slot="{ Component }">
      <component :is="Component" @vue:mounted="onRouteComponentMounted" />
    </RouterView>
  </main>

  <ToolbarApp glass primary-dark="#e8b3be" primary-light="#542c3a" />
  <ModalDev v-if="Auth?.user?.hasPermission(defaultUserPermission.MODAL_DEV_ON) && cicKitStore.debugMod"
    :public-users="publicUserStore.items" :user_permissions="userPermission" />
  <ToastCmp />
  <CookieConsentBanner />
  <RegisterSW :registerSW="registerSW" />
</template>

<style scoped>
/* ciao mondo */
</style>
