<script setup lang="ts">
import { cicKitStore, defaultUserPermission, LoaderCmp, loading, ToastCmp, ToolbarApp, toolbarOffcanvasStore, ModalDev, RegisterSW, HeaderApp, toolbarStore } from 'cic-kit';
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { Auth } from './main';
import { toolbarOffcanvasTabs } from "./toolbarMenu";
import { registerSW } from "virtual:pwa-register";

const route = useRoute();

function applyToolbarMenu() {
  toolbarOffcanvasStore.title = "Menu";
  toolbarOffcanvasStore.setTabs(toolbarOffcanvasTabs);
}

watch(
  () => Auth.isLoggedIn,
  () => {
    toolbarStore.show = Auth.isLoggedIn;
  },
);

watch(
  () => route.name,
  () => {
    applyToolbarMenu();
  },
  { immediate: true, flush: "post" }
);

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
    <RouterView />
  </main>

  <ToolbarApp glass primary-dark="#e8b3be" primary-light=" #542c3a" />
  <ModalDev v-if="Auth?.user?.hasPermission(defaultUserPermission.MODAL_DEV_ON) && cicKitStore.debugMod" />
  <ToastCmp />
  <RegisterSW :registerSW="registerSW" />
</template>

<style scoped>
/* ciao mondo */
</style>
