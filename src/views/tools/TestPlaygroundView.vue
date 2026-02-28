<script setup lang="ts">
import { cicKitStore, defaultUserPermission, useChangeHeader } from 'cic-kit'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BtnAi from '../../components/BtnAi.vue'
import HeaderApp from '../../components/HeaderApp.vue'
import { Auth } from '../../main'

useChangeHeader('Test Playground', { name: 'home' })

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const loadingDemo = ref(false)

const hasBetaFeatures = computed(() => Auth?.user?.hasPermission(defaultUserPermission.BETA_FEATURES) ?? false)

watch(
  hasBetaFeatures,
  (isAllowed) => {
    if (isAllowed) return
    void router.replace({ name: 'home' })
  },
  { immediate: true },
)

async function triggerLoadingDemo() {
  if (loadingDemo.value) return
  loadingDemo.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 1800))
  loadingDemo.value = false
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Test Playground" :to="{ name: 'home' }" />

    <div class="test-wrapper mx-auto py-3 py-md-4">
      <section class="card border-0 shadow-sm p-3 p-md-4">
        <h2 class="h6 text-uppercase mb-1">BtnAi</h2>
        <p class="small text-muted mb-4">
          Demo component con stati base, hover/focus, disabled e loading.
        </p>

        <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
          <BtnAi size="xs" aria-label="AI xs" />
          <BtnAi size="sm" aria-label="AI sm" />
          <BtnAi size="md" aria-label="AI md" />
          <BtnAi size="lg" aria-label="AI lg" />
          <BtnAi size="xl" aria-label="AI xl" />
        </div>

        <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
          <BtnAi variant="solid" size="md" aria-label="AI solid md" />
          <BtnAi variant="outline" size="md" aria-label="AI outline md" />
          <BtnAi variant="outline" size="lg" disabled aria-label="AI disabled" />
          <BtnAi size="lg" :loading="loadingDemo" aria-label="AI loading demo" @click="triggerLoadingDemo" />
        </div>

        <form class="d-flex flex-wrap align-items-center gap-2" @submit.prevent>
          <BtnAi type="submit" variant="outline" size="sm" aria-label="AI submit" />
          <BtnAi type="button" size="sm" title="Button con attr HTML custom" data-test-id="btn-ai-test-id"
            aria-label="AI attr demo" />
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.test-wrapper {
  max-width: 720px;
}
</style>
