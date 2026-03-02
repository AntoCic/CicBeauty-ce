<script setup lang="ts">
import { cicKitStore, defaultUserPermission, useChangeHeader } from 'cic-kit'
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AiPromptLauncherCard from '../../components/ai/AiPromptLauncherCard.vue'
import BtnAi from '../../components/BtnAi.vue'
import HeaderApp from '../../components/HeaderApp.vue'
import { Auth } from '../../main'

useChangeHeader('Test Playground', { name: 'home' })

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const demoSizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

const hasBetaFeatures = computed(() => Auth?.user?.hasPermission(defaultUserPermission.BETA_FEATURES) ?? false)

watch(
  hasBetaFeatures,
  (isAllowed) => {
    if (isAllowed) return
    void router.replace({ name: 'home' })
  },
  { immediate: true },
)
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Test Playground" :to="{ name: 'home' }" />

    <div class="test-wrapper mx-auto py-3 py-md-4">
      <section class="card border-0 shadow-sm p-3 p-md-4">
        <h2 class="h6 text-uppercase mb-1">BtnAi</h2>
        <p class="small text-muted mb-4">
          Demo component con tutte le size (`xs/sm/md/lg/xl`) nei tre stati principali.
        </p>

        <h3 class="h6 mb-2">Default</h3>
        <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
          <BtnAi
            v-for="size in demoSizes"
            :key="`default-${size}`"
            :size="size"
            :aria-label="`AI default ${size}`"
          />
        </div>

        <h3 class="h6 mb-2">Disabled</h3>
        <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
          <BtnAi
            v-for="size in demoSizes"
            :key="`disabled-${size}`"
            :size="size"
            disabled
            :aria-label="`AI disabled ${size}`"
          />
        </div>

        <h3 class="h6 mb-2">Loading</h3>
        <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
          <BtnAi
            v-for="size in demoSizes"
            :key="`loading-${size}`"
            :size="size"
            :loading="true"
            :aria-label="`AI loading ${size}`"
          />
        </div>

        <h3 class="h6 mb-2">HTML Attr Demo</h3>
        <form class="d-flex flex-wrap align-items-center gap-2" @submit.prevent>
          <BtnAi type="submit" size="sm" aria-label="AI submit sm" />
          <BtnAi
            type="button"
            size="sm"
            title="Button con attr HTML custom"
            data-test-id="btn-ai-test-id"
            aria-label="AI attr demo sm"
          />
        </form>

        <h3 class="h6 mt-4 mb-2">Variant</h3>
        <div class="d-flex flex-wrap align-items-center gap-2">
          <BtnAi size="md" variant="default" aria-label="AI variant default md" />
          <BtnAi size="md" variant="ghost" aria-label="AI variant ghost md" />
        </div>
      </section>

      <AiPromptLauncherCard class="mt-3" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.test-wrapper {
  max-width: 720px;
}
</style>
