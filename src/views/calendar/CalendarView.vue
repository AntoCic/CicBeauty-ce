<script setup lang="ts">
import { Btn, cicKitStore, toast, useStoreWatch } from 'cic-kit'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar } from 'v-calendar'
import HeaderApp from '../../components/HeaderApp.vue'
import { Auth } from '../../main'
import { appConfigStore } from '../../stores/appConfigStore'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { publicUserStore } from '../../stores/publicUser'
import { treatmentStore } from '../../stores/treatmentStore'
import { asDate } from '../../utils/date'
import { monthRangeWithPrefetch, startOfDay } from '../../utils/calendar'
import { hasOperatorAccess } from '../../utils/permissions'

type VCalendarPage = {
  month?: number
  year?: number
}

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const canOperate = computed(() => hasOperatorAccess())
const selectedDate = ref(new Date())
const visibleMonth = ref(new Date())
const selectedOperatorId = ref<'all' | string>('all')
const showOnlyMyPersonal = ref(false)
const isLoadingRange = ref(false)

useStoreWatch(
  canOperate.value
    ? [
        {
          store: appointmentStore,
          getOpts: { orderBy: { fieldPath: 'date_time', directionStr: 'desc' }, forceLocalSet: true },
        },
        {
          store: clientStore,
          getOpts: { orderBy: { fieldPath: 'surname', directionStr: 'asc' }, forceLocalSet: true },
        },
        {
          store: treatmentStore,
          getOpts: { orderBy: { fieldPath: 'title', directionStr: 'asc' }, forceLocalSet: true },
          checkLogin: false,
        },
        {
          store: appConfigStore,
          getOpts: { forceLocalSet: true },
          checkLogin: false,
        },
        {
          store: publicUserStore,
          getOpts: { forceLocalSet: true },
        },
      ]
    : [],
)

const operators = computed(() => {
  return publicUserStore.itemsActiveArray
    .map((user) => ({
      id: user.id,
      label: `${user.name} ${user.surname}`.trim() || user.email || user.id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'it'))
})

function canReadAppointment(appointment: (typeof appointmentStore.itemsActiveArray)[number]) {
  const isPersonal = appointment.isPersonal ?? false
  if (isPersonal) {
    return String(appointment.ownerOperatorId ?? '').trim() === String(Auth.uid ?? '').trim()
  }
  return true
}

function operatorMatch(appointment: (typeof appointmentStore.itemsActiveArray)[number]) {
  const selected = selectedOperatorId.value
  if (selected === 'all') return true

  const normalized = String(selected).trim()
  if (!normalized) return true
  if (appointment.isPersonal) {
    return String(appointment.ownerOperatorId ?? '').trim() === normalized
  }

  const linked = appointment.operator_ids ?? []
  return linked.includes(normalized) || String(appointment.operator_id ?? '').trim() === normalized
}

const visibleAppointments = computed(() => {
  const items = appointmentStore.itemsActiveArray.filter((appointment) => {
    const start = asDate(appointment.date_time)
    if (!start) return false
    if (!canReadAppointment(appointment)) return false
    if (!operatorMatch(appointment)) return false
    if (showOnlyMyPersonal.value && !appointment.isPersonal) return false
    return true
  })

  return items
})

const appointmentsByDay = computed(() => {
  const map = new Map<string, { count: number; personal: number }>()
  for (const appointment of visibleAppointments.value) {
    const start = asDate(appointment.date_time)
    if (!start) continue
    const dayKey = keyForDay(start)
    const current = map.get(dayKey) ?? { count: 0, personal: 0 }
    current.count += 1
    if (appointment.isPersonal) {
      current.personal += 1
    }
    map.set(dayKey, current)
  }
  return map
})

const calendarAttributes = computed(() => {
  const list: Array<Record<string, unknown>> = []
  for (const [dayKey, metrics] of appointmentsByDay.value.entries()) {
    const date = new Date(`${dayKey}T12:00:00`)
    if (Number.isNaN(date.getTime())) continue
    list.push({
      key: dayKey,
      dates: date,
      dot: metrics.personal > 0 ? { color: '#8e44ad' } : { color: '#16a34a' },
      popover: {
        label: `${metrics.count} appuntamenti (${metrics.personal} personali)`,
      },
    })
  }
  return list
})

const monthLabel = computed(() =>
  visibleMonth.value.toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  }),
)
const selectedDateInput = computed({
  get: () => keyForDay(selectedDate.value),
  set: (value: string) => {
    const next = new Date(`${value}T12:00:00`)
    if (!Number.isNaN(next.getTime())) {
      selectedDate.value = next
    }
  },
})

async function loadMonthRange(referenceMonth: Date) {
  if (!canOperate.value) return
  const config = appConfigStore.getConfigData()
  const prefetchMonths = Math.max(0, Number(config.calendarPrefetchMonths ?? 1))
  const range = monthRangeWithPrefetch(referenceMonth, prefetchMonths)
  isLoadingRange.value = true
  try {
    await appointmentStore.getRange(range.start, range.end, true)
  } catch (error) {
    console.error(error)
    toast.error('Errore caricamento calendario')
  } finally {
    isLoadingRange.value = false
  }
}

function onDidMove(pages: VCalendarPage[] | undefined) {
  const page = Array.isArray(pages) ? pages[0] : undefined
  if (!page?.year || !page?.month) return
  const moved = new Date(page.year, page.month - 1, 1, 0, 0, 0, 0)
  visibleMonth.value = moved
}

function onDayClick(day: { date?: Date }) {
  const date = day?.date ? startOfDay(day.date) : startOfDay(selectedDate.value)
  const dayKey = keyForDay(date)
  router.push({
    name: 'CalendarDayView',
    query: {
      date: dayKey,
      operatorId: selectedOperatorId.value === 'all' ? undefined : selectedOperatorId.value,
    },
  })
}

function openNewAppointment() {
  router.push({
    name: 'AppointmentEditView',
    params: { id: 'new' },
    query: { date: keyForDay(selectedDate.value) },
  })
}

function keyForDay(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

onMounted(() => {
  visibleMonth.value = new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), 1)
  void loadMonthRange(visibleMonth.value)
})

watch(
  () => visibleMonth.value.getTime(),
  () => {
    void loadMonthRange(visibleMonth.value)
  },
)
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp
      title="Calendario"
      :to="{ name: 'home' }"
      :btn2-icon="canOperate ? 'add' : undefined"
      @btn2-click="openNewAppointment"
    />

    <div class="px-2 pb-4">
      <p v-if="!canOperate" class="text-muted small mt-3">
        Permesso `OPERATORE` richiesto per accedere al calendario.
      </p>

      <template v-else>
        <div class="card border-0 shadow-sm p-3 mb-2">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <strong class="month-label">{{ monthLabel }}</strong>
            <span class="small text-muted" v-if="isLoadingRange">Caricamento range calendario...</span>
            <span v-else class="small text-muted">
              {{ visibleAppointments.length }} appuntamenti nel range caricato
            </span>
          </div>

          <div class="row g-2 mt-1">
            <div class="col-12 col-md-4">
              <label class="form-label small mb-1">Operatore</label>
              <select v-model="selectedOperatorId" class="form-select">
                <option value="all">Tutti</option>
                <option v-for="operator in operators" :key="operator.id" :value="operator.id">
                  {{ operator.label }}
                </option>
              </select>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label small mb-1">Data selezionata</label>
              <input v-model="selectedDateInput" type="date" class="form-control" />
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label small mb-1">Filtri</label>
              <div class="form-check">
                <input id="myPersonalOnly" v-model="showOnlyMyPersonal" class="form-check-input" type="checkbox" />
                <label for="myPersonalOnly" class="form-check-label">Solo miei appuntamenti personali</label>
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm p-2">
          <Calendar
            v-model="selectedDate"
            is-expanded
            locale="it-IT"
            :attributes="calendarAttributes"
            @dayclick="onDayClick"
            @did-move="onDidMove"
          />
        </div>

        <div class="d-flex gap-3 mt-2 small text-muted">
          <span class="legend-item"><i class="dot dot--work"></i> appuntamenti operativi</span>
          <span class="legend-item"><i class="dot dot--personal"></i> personali (solo tuoi)</span>
        </div>

        <Btn class="mt-3" color="dark" icon="calendar_month" @click="onDayClick({ date: selectedDate })">
          Apri dettaglio giorno
        </Btn>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.month-label {
  text-transform: capitalize;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.dot--work {
  background: #16a34a;
}

.dot--personal {
  background: #8e44ad;
}

:deep(.vc-pane-container) {
  border-radius: 6px;
}

:deep(.vc-day-content:hover) {
  background: rgba(84, 44, 58, 0.12);
}
</style>
