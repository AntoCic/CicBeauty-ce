<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, type RouteLocationRaw } from 'vue-router'
import { UserPermission } from '../../enums/UserPermission'
import { hasPermissionAccess, type AppPermissionInput } from '../../utils/permissions'

type QuickNavItem = {
  id: string
  label: string
  icon: string
  to: RouteLocationRaw
  permission?: AppPermissionInput
  center?: boolean
}

const route = useRoute()
const operatorPermission: AppPermissionInput = UserPermission.OPERATORE

function keyForDay(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeIsoDay(rawValue: unknown) {
  const raw = String(rawValue ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ''
  const parsed = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return ''
  return keyForDay(parsed)
}

const todayIsoDate = computed(() => {
  return keyForDay(new Date())
})

const createAppointmentDate = computed(() => {
  const isDayView = String(route.name ?? '').trim() === 'CalendarDayView'
  if (!isDayView) return todayIsoDate.value
  return normalizeIsoDay(route.query.date) || todayIsoDate.value
})

const createAppointmentOperatorId = computed(() => {
  const isDayView = String(route.name ?? '').trim() === 'CalendarDayView'
  if (!isDayView) return ''
  return String(route.query.operatorId ?? '').trim()
})

const quickNavItems = computed<QuickNavItem[]>(() => [
  {
    id: 'clients',
    label: 'Clienti',
    icon: 'groups',
    to: { name: 'ClientsView' },
    permission: operatorPermission,
  },
  {
    id: 'today-appointments',
    label: 'Oggi',
    icon: 'today',
    to: { name: 'CalendarDayView', query: { date: todayIsoDate.value } },
    permission: operatorPermission,
  },
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    to: { name: 'home' },
    center: true,
  },
  {
    id: 'appointments',
    label: 'Agenda',
    icon: 'calendar_month',
    to: { name: 'CalendarView' },
    permission: operatorPermission,
  },
  {
    id: 'add-appointment',
    label: 'Nuovo',
    icon: 'add_circle',
    to: {
      name: 'AppointmentEditView',
      params: { id: 'new' },
      query: {
        date: createAppointmentDate.value,
        operatorId: createAppointmentOperatorId.value || undefined,
      },
    },
    permission: operatorPermission,
  },
])

function isEnabled(item: QuickNavItem) {
  return hasPermissionAccess(item.permission)
}

function isItemActive(item: QuickNavItem) {
  const routeName = String(route.name ?? '').trim()
  const routeId = String(route.params.id ?? '').trim()

  if (item.id === 'today-appointments') {
    return routeName === 'CalendarDayView'
  }
  if (item.id === 'clients') {
    return routeName === 'ClientsView' || routeName === 'ClientEditView'
  }
  if (item.id === 'appointments') {
    return routeName === 'CalendarView'
  }
  if (item.id === 'add-appointment') {
    return routeName === 'AppointmentEditView' && routeId === 'new'
  }

  return routeName === 'home'
}
</script>

<template>
  <nav class="quick-toolbar" aria-label="Toolbar rapida">
    <ul class="quick-toolbar__list">
      <li v-for="item in quickNavItems" :key="item.id" class="quick-toolbar__item">
        <RouterLink
          v-if="isEnabled(item)"
          :to="item.to"
          class="quick-toolbar__link text-decoration-none"
          :class="{
            'quick-toolbar__link--active': isItemActive(item),
            'quick-toolbar__link--center': item.center,
          }"
        >
          <span class="material-symbols-outlined quick-toolbar__icon" aria-hidden="true">{{ item.icon }}</span>
          <span class="quick-toolbar__label">{{ item.label }}</span>
        </RouterLink>

        <button
          v-else
          type="button"
          class="quick-toolbar__link quick-toolbar__link--disabled"
          :class="{ 'quick-toolbar__link--center': item.center }"
          :aria-label="`${item.label} disabilitato`"
          :title="`${item.label}: richiede permesso operatore`"
          disabled
        >
          <span class="material-symbols-outlined quick-toolbar__icon" aria-hidden="true">{{ item.icon }}</span>
          <span class="quick-toolbar__label">{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped lang="scss">
.quick-toolbar {
  position: fixed;
  left: 50%;
  bottom: calc(10px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(760px, calc(100vw - 16px));
  z-index: 1110;
  pointer-events: none;
}

.quick-toolbar__list {
  margin: 0;
  padding: 11px 8px;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  border: 1px solid rgba(84, 44, 58, 0.28);
  border-radius: 1.25rem;
  background:
    radial-gradient(circle at 10% 0%, rgba(232, 179, 190, 0.36) 0%, transparent 58%),
    radial-gradient(circle at 92% 100%, rgba(31, 138, 112, 0.22) 0%, transparent 52%),
    linear-gradient(165deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 241, 242, 0.95) 100%);
  box-shadow: 0 14px 34px rgba(36, 21, 28, 0.18);
  pointer-events: auto;
}

.quick-toolbar__item {
  min-width: 0;
}

.quick-toolbar__link {
  width: 100%;
  min-height: 56px;
  border: 0;
  border-radius: 0.95rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: transparent;
  color: #4b2935;
  cursor: pointer;
  transition: transform 0.18s ease, color 0.18s ease, background-color 0.18s ease, box-shadow 0.2s ease;
}

.quick-toolbar__link:hover {
  background: rgba(232, 179, 190, 0.28);
}

.quick-toolbar__link:focus-visible {
  outline: 2px solid rgba(84, 44, 58, 0.65);
  outline-offset: 1px;
}

.quick-toolbar__link--active {
  background: rgba(84, 44, 58, 0.88);
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.quick-toolbar__link--center {
  min-height: 72px;
  margin-top: -22px;
  border-radius: 999px;
  background: linear-gradient(142deg, #542c3a 0%, #7f3f57 65%, #9f586f 100%);
  color: #fff;
  box-shadow: 0 16px 26px rgba(54, 28, 39, 0.3);
}

.quick-toolbar__link--center:hover {
  background: linear-gradient(142deg, #5f3342 0%, #8a4960 65%, #ad627a 100%);
  transform: translateY(-1px);
}

.quick-toolbar__link--disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.quick-toolbar__link--disabled:hover {
  background: transparent;
  transform: none;
}

.quick-toolbar__icon {
  font-size: 1.36rem;
  line-height: 1;
  font-variation-settings: 'FILL' 1, 'wght' 560, 'GRAD' 0, 'opsz' 24;
}

.quick-toolbar__label {
  font-size: 0.68rem;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.02em;
}

@media (max-width: 420px) {
  .quick-toolbar__list {
    padding: 10px 6px;
    gap: 4px;
  }

  .quick-toolbar__link {
    min-height: 52px;
  }

  .quick-toolbar__link--center {
    min-height: 68px;
    margin-top: -19px;
  }

  .quick-toolbar__icon {
    font-size: 1.28rem;
  }

  .quick-toolbar__label {
    font-size: 0.64rem;
  }
}
</style>
