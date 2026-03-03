<script setup lang="ts">
import { Btn, cicKitStore, defaultUserPermission, toast, useChangeHeader } from 'cic-kit'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AiPromptLauncherCard from '../../components/ai/AiPromptLauncherCard.vue'
import BtnAi from '../../components/BtnAi.vue'
import HeaderApp from '../../components/HeaderApp.vue'
import { callTestFillMissingCategoryEmojis, type TestFillMissingCategoryEmojisResponse } from '../../call/callTestFillMissingCategoryEmojis'
import { parseAiError } from '../../call/_utilityApi'
import { Auth } from '../../main'

useChangeHeader('Test Playground', { name: 'home' })

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const demoSizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const
const isFillingCategoryEmojis = ref(false)
const fillCategoryEmojiResult = ref<TestFillMissingCategoryEmojisResponse | undefined>(undefined)
const fillCategoryEmojiError = ref('')

const hasBetaFeatures = computed(() => Auth?.user?.hasPermission(defaultUserPermission.BETA_FEATURES) ?? false)

watch(
  hasBetaFeatures,
  (isAllowed) => {
    if (isAllowed) return
    void router.replace({ name: 'home' })
  },
  { immediate: true },
)

async function fillMissingCategoryEmojis() {
  if (isFillingCategoryEmojis.value) return

  isFillingCategoryEmojis.value = true
  fillCategoryEmojiError.value = ''
  try {
    const result = await callTestFillMissingCategoryEmojis({ limit: 120 })
    fillCategoryEmojiResult.value = result
    toast.success(`:white_check_mark: Emoji aggiornate: ${result.updated}/${result.attempted}`)
  } catch (error) {
    const message = parseAiError(error)
    fillCategoryEmojiError.value = message
    toast.error(`:warning: ${message}`)
  } finally {
    isFillingCategoryEmojis.value = false
  }
}
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

      <section class="card border-0 shadow-sm p-3 p-md-4 mt-3">
        <h2 class="h6 text-uppercase mb-1">Test Emoji Categorie</h2>
        <p class="small text-muted mb-3">
          Chiamata API di test: prende tutte le categorie e aggiunge emoji solo a quelle che non la hanno.
        </p>

        <div class="d-flex flex-wrap align-items-center gap-2">
          <Btn
            type="button"
            color="dark"
            icon="auto_awesome"
            :loading="isFillingCategoryEmojis"
            :disabled="isFillingCategoryEmojis"
            @click="fillMissingCategoryEmojis"
          >
            Genera emoji mancanti
          </Btn>
          <small v-if="fillCategoryEmojiResult" class="text-muted">
            Modello: {{ fillCategoryEmojiResult.model }} | Aggiornate: {{ fillCategoryEmojiResult.updated }}/{{ fillCategoryEmojiResult.attempted }}
          </small>
        </div>

        <p v-if="fillCategoryEmojiError" class="text-danger small mt-2 mb-0">
          {{ fillCategoryEmojiError }}
        </p>

        <div v-if="fillCategoryEmojiResult" class="small mt-3">
          <p class="mb-2 text-muted">
            Scansionate: {{ fillCategoryEmojiResult.scanned }} | Mancanti prima: {{ fillCategoryEmojiResult.missingBefore }}
          </p>
          <div class="emoji-results-list">
            <div v-for="item in fillCategoryEmojiResult.items" :key="`${item.collection}-${item.id}`" class="emoji-result-row">
              [{{ item.collection }}] {{ item.title }} -> {{ item.emoji || '-' }} ({{ item.status }})
            </div>
          </div>
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

.emoji-results-list {
  max-height: 260px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.emoji-result-row {
  border: 1px solid rgba(84, 44, 58, 0.12);
  border-radius: 0.35rem;
  padding: 0.2rem 0.4rem;
  background: rgba(255, 255, 255, 0.75);
}
</style>
