<script setup lang="ts">
import { cicKitStore } from 'cic-kit'
import { computed, ref } from 'vue'
import { Auth } from '../../main'
import { AUTH_HOME_APPS, type HomeAppShortcut } from './homeApps'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const isQrModalOpen = ref(false)

function canOpenApp(app: HomeAppShortcut) {
  return !app.permission || (Auth?.user?.hasPermission(app.permission) ?? false)
}

function openQrModal() {
  isQrModalOpen.value = true
}

function closeQrModal() {
  isQrModalOpen.value = false
}

function onQrKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  openQrModal()
}

const SETTINGS_APP_ORDER = [
  'user-profile',
  'app-config',
  'agent-prompts',
  'product-categories-manage',
  'treatment-categories-manage',
  'type-expenses',
  'type-coupons',
  'relations',
  'test-playground',
  'catalog-backup',
  'migration-import',
]

const isSettingsFolderOpen = ref(false)
const visibleApps = computed(() => AUTH_HOME_APPS.filter(canOpenApp))
const visibleMainApps = computed(() => visibleApps.value.filter((app) => app.group !== 'settings'))
const visibleSettingsApps = computed(() => {
  const source = visibleApps.value.filter((app) => app.group === 'settings')
  const byId = new Map(source.map((app) => [app.id, app]))
  const ordered = SETTINGS_APP_ORDER.map((id) => byId.get(id)).filter(Boolean) as HomeAppShortcut[]
  const extras = source.filter((app) => !SETTINGS_APP_ORDER.includes(app.id))
  return [...ordered, ...extras]
})
const hasSettingsApps = computed(() => visibleSettingsApps.value.length > 0)

function toggleSettingsFolder() {
  isSettingsFolderOpen.value = !isSettingsFolderOpen.value
}

function closeSettingsFolder() {
  isSettingsFolderOpen.value = false
}
</script>

<template>
  <div class="home-page pb-t" :style="bgStyle">
    <section class="home-main">
      <div class="apps-grid">
        <RouterLink v-for="app in visibleMainApps" :key="app.id" :to="app.to" class="app-shortcut text-decoration-none">
          <div class="app-tile">
            <div class="app-icon" :class="app.iconClass">
              <span class="material-symbols-outlined app-icon-symbol">{{ app.icon }}</span>
            </div>
            <span class="app-title">{{ app.title }}</span>
          </div>
        </RouterLink>

        <button v-if="hasSettingsApps" type="button" class="app-shortcut app-shortcut-btn"
          :aria-expanded="isSettingsFolderOpen" aria-controls="settings-folder-panel" @click="toggleSettingsFolder">
          <div class="app-tile">
            <div class="app-icon app-icon-night">
              <span class="material-symbols-outlined app-icon-symbol">{{ isSettingsFolderOpen ? 'folder_open' : 'folder'
                }}</span>
            </div>
            <span class="app-title">Conf. App</span>
          </div>
        </button>
      </div>

      <Transition name="settings-folder">
        <section v-if="hasSettingsApps && isSettingsFolderOpen" id="settings-folder-panel" class="settings-folder"
          role="region" aria-label="Cartella impostazioni">
          <div class="settings-folder__header">
            <h2 class="settings-folder__title">Impostazioni</h2>
            <button type="button" class="btn-close settings-folder__close" aria-label="Chiudi cartella impostazioni"
              @click="closeSettingsFolder"></button>
          </div>

          <div class="settings-grid">
            <RouterLink v-for="app in visibleSettingsApps" :key="app.id" :to="app.to"
              class="app-shortcut text-decoration-none" @click="closeSettingsFolder">
              <div class="app-tile">
                <div class="app-icon" :class="app.iconClass">
                  <span class="material-symbols-outlined app-icon-symbol">{{ app.icon }}</span>
                </div>
                <span class="app-title">{{ app.title }}</span>
              </div>
            </RouterLink>
          </div>
        </section>
      </Transition>

      <img class="home-qr" src="/img/qr.png" alt="QR Cic Beauty" role="button" tabindex="0"
        aria-label="Apri QR ingrandito" @click="openQrModal" @keydown="onQrKeydown" />
    </section>

    <div v-if="isQrModalOpen" class="home-qr-modal" role="dialog" aria-modal="true"
      aria-label="QR Cic Beauty ingrandito">
      <div class="home-qr-modal__backdrop" @click="closeQrModal"></div>
      <div class="home-qr-modal__content">
        <button type="button" class="btn-close home-qr-modal__close" aria-label="Chiudi QR ingrandito"
          @click="closeQrModal"></button>
        <img class="home-qr-modal__image" src="/img/qr.png" alt="QR Cic Beauty ingrandito" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.home-page {
  position: relative;
  height: 100%;
  width: 100%;
  display: grid;
  place-items: center;
  padding: clamp(20px, 3vw, 36px);
  overflow-x: hidden;
  overflow-y: auto;
  isolation: isolate;
}

.home-main {
  width: min(760px, 100%);
  padding: clamp(20px, 3vw, 30px) clamp(14px, 2.5vw, 24px);
  text-align: center;
  padding-bottom: 0;
}

.apps-grid {
  display: grid;
  gap: 1.1rem 0.7rem;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  padding-bottom: 32px;
  border-bottom: 1px solid rgba(84, 44, 58, 0.24);
}

.app-shortcut {
  color: inherit;
}

.app-shortcut-btn {
  border: 0;
  background: transparent;
  padding: 0;
}

.app-shortcut:focus-visible {
  outline: 2px solid #1f5eff;
  outline-offset: 4px;
  border-radius: 6px;
}

.app-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}

.app-icon {
  width: 62px;
  height: 62px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: 0 8px 18px rgba(35, 46, 58, 0.16);
}

.app-icon-symbol {
  font-size: 1.9rem;
  line-height: 1;
  font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;
}

.app-title {
  color: #222831;
  font-size: 0.78rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
}

.settings-folder {
  margin-top: 18px;
  border: 1px solid rgba(84, 44, 58, 0.22);
  border-radius: 16px;
  background:
    radial-gradient(circle at 15% 0%, rgba(232, 179, 190, 0.24) 0%, transparent 55%),
    linear-gradient(170deg, rgba(255, 255, 255, 0.94), rgba(247, 241, 242, 0.96));
  box-shadow: 0 10px 24px rgba(31, 21, 28, 0.12);
  padding: 12px 12px 10px;
}

.settings-folder__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.settings-folder__title {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #4b2935;
}

.settings-folder__close {
  transform: scale(0.9);
}

.settings-grid {
  display: grid;
  gap: 1rem 0.65rem;
  grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
}

.settings-folder-enter-active,
.settings-folder-leave-active {
  transition: opacity 210ms ease, transform 210ms ease;
}

.settings-folder-enter-from,
.settings-folder-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.home-qr {
  width: min(150px, 68vw);
  height: auto;
  margin-top: 2rem;
  cursor: zoom-in;
}

.home-qr:focus-visible {
  outline: 2px solid #1f5eff;
  outline-offset: 4px;
  border-radius: 6px;
}

.home-qr-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.home-qr-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
}

.home-qr-modal__content {
  position: relative;
  width: min(calc(100vw - 2rem), 400px);
  max-height: calc(100vh - 2rem);
}

.home-qr-modal__close {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
}

.home-qr-modal__image {
  width: 100%;
  height: auto;
  max-height: calc(100vh - 2rem);
  object-fit: contain;
}

.home-footer {
  margin-top: 14px;
  display: grid;
  gap: 8px;
  justify-items: center;
}

.app-icon-rose {
  background: linear-gradient(135deg, #7f3f57 0%, #542c3a 100%);
}

.app-icon-ocean {
  background: linear-gradient(135deg, #30475e 0%, #1f8a70 100%);
}

.app-icon-amber {
  background: linear-gradient(135deg, #efb036 0%, #f07a45 100%);
}

.app-icon-calm {
  background: linear-gradient(135deg, #1f8a70 0%, #2f5233 100%);
}

.app-icon-sky {
  background: linear-gradient(135deg, #1f5eff 0%, #2d9cff 100%);
}

.app-icon-night {
  background: linear-gradient(135deg, #30475e 0%, #222831 100%);
}

.app-icon-soft {
  background: linear-gradient(135deg, #6d597a 0%, #355070 100%);
}

.app-icon-warm {
  background: linear-gradient(135deg, #efb036 0%, #f05454 100%);
}

@media (max-width: 575.98px) {
  .home-main {
    padding: 18px 12px 22px;
  }

  .apps-grid {
    gap: 0.95rem 0.55rem;
    grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
  }

  .settings-folder {
    margin-top: 14px;
    padding: 10px 10px 8px;
  }

  .settings-grid {
    gap: 0.9rem 0.55rem;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  }
}
</style>
