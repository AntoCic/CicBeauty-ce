<script setup lang="ts">
import { Accordion, Btn, BtnMoveIcon, PwaUpdateButton, _Auth, cicKitStore, defaultUserPermission, pushMsg } from 'cic-kit'
import { computed, onMounted, ref, watch } from 'vue'
import UserProfileEditForm from './UserProfileEditForm.vue'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const user = computed(() => _Auth?.user)
const firebaseUser = computed(() => _Auth?.firebaseUser)
const isLoggedIn = computed(() => _Auth?.isLoggedIn ?? false)
const displayName = computed(() => user.value?.fullName ?? firebaseUser.value?.displayName ?? 'Utente')
const displayEmail = computed(() => user.value?.email ?? firebaseUser.value?.email ?? 'Email non disponibile')
const avatarUrl = computed(() => user.value?.photoURL ?? firebaseUser.value?.photoURL ?? '')
const userPermissions = computed(() => [...(user.value?.permissions ?? [])].sort((a, b) => a.localeCompare(b)))
const canToggleDebug = computed(() => user.value?.hasPermission(defaultUserPermission.MODAL_DEV_ON) ?? false)

const pushPermission = ref<NotificationPermission>(pushMsg.permission)
const needPushPermission = ref<boolean>(pushMsg.needToAskPermission)
const isRequestingPushPermission = ref(false)

const pushPermissionLabel = computed(() => {
  if (pushPermission.value === 'granted') return 'Permesso concesso'
  if (pushPermission.value === 'denied') return 'Permesso negato'
  return 'Permesso non ancora richiesto'
})

function refreshPushState() {
  pushPermission.value = pushMsg.permission
  needPushPermission.value = pushMsg.needToAskPermission
}

async function enableNotifications() {
  if (!isLoggedIn.value || isRequestingPushPermission.value || pushPermission.value === 'granted') return
  isRequestingPushPermission.value = true
  try {
    await pushMsg.askPermission()
  } finally {
    refreshPushState()
    isRequestingPushPermission.value = false
  }
}

async function logout() {
  if (!_Auth) return
  await _Auth.logout()
  refreshPushState()
}

watch(
  () => _Auth?.isLoggedIn,
  () => {
    refreshPushState()
  },
  { immediate: true },
)

onMounted(() => {
  refreshPushState()
})
</script>

<template>
  <div class="user-view pb-t" :style="bgStyle">
    <div class="user-shell">
      <section class="profile-card">
        <header class="profile-card__header">
          <div class="profile-avatar" aria-hidden="true">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar utente" />
            <span v-else class="material-symbols-outlined">person</span>
          </div>
          <div class="profile-identity">
            <h1 class="profile-title">{{ displayName }}</h1>
            <p class="profile-subtitle">{{ displayEmail }}</p>
          </div>
        </header>

        <template v-if="isLoggedIn">
          <Accordion id="user-profile-edit" title="Modifica profilo" :default-open="false" class="profile-accordion">
            <template #header>
              <div class="accordion-header-content">
                <span class="material-symbols-outlined">edit_square</span>
                <span>Modifica profilo</span>
              </div>
            </template>
            <UserProfileEditForm />
          </Accordion>

          <div class="status-grid">

            <article class="status-item">
              <p class="status-item__label">Permessi</p>
              <strong class="status-item__value">
                {{ userPermissions.length ? `${userPermissions.length} assegnati` : 'Base' }}
              </strong>
              <div class="permission-list">
                <span v-if="!userPermissions.length" class="permission-chip permission-chip--base">BASE</span>
                <span v-for="permission in userPermissions" :key="permission" class="permission-chip">
                  {{ permission }}
                </span>
              </div>
            </article>

            <article class="status-item">
              <p class="status-item__label">Notifiche browser</p>
              <strong class="status-item__value">{{ pushPermissionLabel }}</strong>
              <Btn
                block
                icon="notifications_active"
                color="primary"
                :loading="isRequestingPushPermission"
                :disabled="pushPermission === 'granted' || isRequestingPushPermission"
                class="status-item__action"
                @click="enableNotifications"
              >
                {{ pushPermission === 'denied' ? 'Riprova richiesta' : (needPushPermission ? 'Attiva notifiche' : 'Notifiche attive') }}
              </Btn>
              <p v-if="pushPermission === 'denied'" class="status-item__hint">
                Permesso negato: riabilita dalle impostazioni del browser per questo sito.
              </p>
            </article>

            <article v-if="canToggleDebug" class="status-item">
              <p class="status-item__label">Debug tools</p>
              <div class="debug-switch">
                <label for="debug-switch-input">Modal debug</label>
                <input id="debug-switch-input" v-model="cicKitStore.debugMod" type="checkbox" />
              </div>
            </article>
          </div>

          <div class="profile-actions">
            <Btn icon="logout" color="dark" @click="logout">Logout</Btn>
            <BtnMoveIcon icon="home" color="inherited" :to="{ name: 'home' }" block>
              Torna alla home
            </BtnMoveIcon>
          </div>
        </template>

        <div v-else class="profile-empty">
          <span class="material-symbols-outlined">person_off</span>
          <p>Non sei autenticato. Accedi per gestire profilo e notifiche.</p>
          <Btn icon="login" color="dark" :to="{ name: 'login' }">Vai al login</Btn>
        </div>
      </section>

      <section class="update-card">
        <h2 class="update-card__title">Aggiornamento App</h2>
        <PwaUpdateButton />
        <p class="update-card__version">Versione attuale: {{ cicKitStore.packageJson?.version ?? '-' }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.user-view {
  min-height: 100%;
  width: 100%;
  padding: clamp(18px, 2.6vw, 34px);
  display: grid;
  justify-items: center;
  align-content: start;
  overflow-y: auto;
}

.user-shell {
  width: min(920px, 100%);
  display: grid;
  gap: 18px;
}

.profile-card,
.update-card {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 20px;
  background:
    radial-gradient(circle at 8% 0%, rgba(232, 179, 190, 0.28) 0%, transparent 56%),
    linear-gradient(170deg, rgba(255, 255, 255, 0.97) 0%, rgba(247, 241, 242, 0.95) 100%);
  box-shadow: 0 16px 30px rgba(36, 21, 28, 0.14);
}

.profile-card {
  padding: clamp(16px, 2.5vw, 28px);
  display: grid;
  gap: 16px;
}

.profile-card__header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile-avatar {
  width: clamp(62px, 10vw, 78px);
  height: clamp(62px, 10vw, 78px);
  border-radius: 22px;
  background: linear-gradient(145deg, #542c3a 0%, #7f3f57 100%);
  color: #fff;
  box-shadow: 0 12px 22px rgba(61, 30, 43, 0.24);
  display: grid;
  place-items: center;
  overflow: hidden;
  flex: 0 0 auto;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar .material-symbols-outlined {
  font-size: 2rem;
}

.profile-title {
  margin: 0;
  font-size: clamp(1.15rem, 1.8vw, 1.55rem);
  color: #3f2330;
}

.profile-subtitle {
  margin: 4px 0 0;
  color: #6a4756;
  font-size: 0.95rem;
}

.profile-accordion {
  border-radius: 14px;
  overflow: hidden;
}

.accordion-header-content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4b2935;
  font-weight: 600;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.status-item {
  border: 1px solid rgba(84, 44, 58, 0.16);
  border-radius: 14px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.66);
}

.status-item__label {
  margin: 0;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8a6574;
}

.status-item__value {
  display: block;
  margin-top: 4px;
  color: #3b222d;
  font-size: 1rem;
}

.permission-list {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.permission-chip {
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #4b2935;
  background: rgba(232, 179, 190, 0.38);
  border: 1px solid rgba(84, 44, 58, 0.2);
}

.permission-chip--base {
  background: rgba(47, 82, 51, 0.18);
  color: #2f5233;
  border-color: rgba(47, 82, 51, 0.35);
}

.status-item__action {
  margin-top: 10px;
}

.status-item__hint {
  margin: 8px 0 0;
  font-size: 0.78rem;
  color: #8b4a50;
}

.debug-switch {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.debug-switch label {
  color: #5e3948;
  font-weight: 600;
}

.debug-switch input {
  width: 44px;
  height: 22px;
  accent-color: #542c3a;
  cursor: pointer;
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.profile-empty {
  border: 1px dashed rgba(84, 44, 58, 0.35);
  border-radius: 14px;
  padding: 18px;
  display: grid;
  justify-items: center;
  gap: 10px;
  text-align: center;
  color: #4b2935;
  background: rgba(255, 255, 255, 0.56);
}

.profile-empty .material-symbols-outlined {
  font-size: 2.1rem;
}

.update-card {
  padding: 16px;
  display: grid;
  justify-items: center;
  gap: 9px;
}

.update-card__title {
  margin: 0;
  color: #4b2935;
  font-size: 0.86rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.update-card__version {
  margin: 0;
  color: #6b4d59;
  font-size: 0.9rem;
}

@media (max-width: 900px) {
  .status-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 576px) {
  .user-view {
    padding: 12px;
  }

  .profile-card {
    padding: 14px;
  }

  .profile-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
