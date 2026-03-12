<script setup lang="ts">
import { useRouter, type RouteLocationRaw } from 'vue-router'

const props = defineProps<{
  title?: string
  to?: RouteLocationRaw
}>()

const router = useRouter()

function goBack() {
  if (props.to) {
    router.push(props.to)
    return
  }
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  router.push({ name: 'home' })
}
</script>

<template>
  <header class="app-header" :class="{ 'app-header--with-title': Boolean(title) }">
    <div class="app-header__row row align-items-center">
      <div class="col-auto">
        <button type="button" class="app-header__logo-btn" aria-label="Torna indietro" @click="goBack">
          <img class="app-header__logo" src="/img/logo/logo-bk.png" alt="Cnc Beauty logo" />
        </button>
      </div>

      <h1 v-if="title" class="col app-header__title">{{ title }}</h1>
      <div v-if="title" class="col-12 d-md-none"></div>
      <div v-if="$slots.default" class="col app-header__slot">
        <slot />
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  --logo-ink: #4b2935;
  position: sticky;
  top: 0;
  z-index: 1011;
  width: 100%;
  padding: 8px 12px;
}

.app-header__row {
  min-height: 52px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.56);
  backdrop-filter: blur(12px) saturate(145%);
  -webkit-backdrop-filter: blur(12px) saturate(145%);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 2px;
  box-shadow: 0 4px 12px rgba(27, 16, 21, 0.12);
}

.app-header__logo-btn {
  width: 88px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.app-header__logo {
  width: 88px;
  height: 44px;
  object-fit: contain;
}

.app-header__title {
  margin: 0;
  text-align: left;
  color: var(--logo-ink);
  font-size: clamp(1rem, 2.3vw, 1.3rem);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-family: 'Cormorant Garamond', 'Times New Roman', Georgia, serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-header__slot {
  min-width: 0;
}

.app-header__slot :deep(.app-header__tools) {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.app-header__slot :deep(.app-header__tools > *) {
  flex-shrink: 0;
}

.app-header__slot :deep(.app-header__tools .app-header__search) {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
  flex-shrink: 1;
}

.app-header__slot :deep(.app-header__search) {
  width: min(100%, 440px);
  min-width: 220px;
  height: 34px;
  border: 1px solid rgba(84, 44, 58, 0.36);
  border-radius: 2px;
  padding: 0 10px;
  color: var(--logo-ink);
  background: rgba(255, 255, 255, 0.58);
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.app-header__slot :deep(.app-header__search)::placeholder {
  color: rgba(75, 41, 53, 0.52);
}

.app-header__slot :deep(.app-header__search):focus {
  border-color: rgba(84, 44, 58, 0.72);
  box-shadow: 0 0 0 2px rgba(232, 179, 190, 0.22);
}

/* Da md in giu: con titolo lo slot va a capo */
@media (max-width: 991.98px) {
  .app-header--with-title :deep(.col:last-child) {
    width: 100%;
    flex: 0 0 100%;
    max-width: 100%;
    margin-top: 0.35rem;
  }
}

@media (max-width: 575.98px) {
  .app-header {
    padding-left: 10px;
    padding-right: 10px;
  }

  .app-header__row {
    min-height: 44px;
    padding: 4px 8px;
  }

  .app-header__logo-btn,
  .app-header__logo {
    width: 44px;
    height: 44px;
  }

  .app-header__title {
    font-size: 0.95rem;
    letter-spacing: 0.04em;
    max-width: 100%;
  }

  .app-header__slot :deep(.app-header__search) {
    width: 100%;
    min-width: 0;
    height: 32px;
    font-size: 0.74rem;
  }

  .app-header__slot :deep(.app-header__tools) {
    gap: 0.34rem;
  }

  .app-header__slot :deep(.app-header__tools .app-header__search) {
    width: auto;
  }
}
</style>
