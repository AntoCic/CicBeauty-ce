<script setup lang="ts">
import { Btn, cicKitStore, useStoreWatch } from 'cic-kit'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HeaderApp from '../../components/HeaderApp.vue'
import { Auth } from '../../main'
import { appConfigStore } from '../../stores/appConfigStore'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { treatmentStore } from '../../stores/treatmentStore'
import {
  appointmentEndDate,
  buildAvailabilitySlots,
  endOfDay,
  startOfDay,
} from '../../utils/calendar'
import { asDate } from '../../utils/date'
import { hasOperatorAccess } from '../../utils/permissions'

const route = useRoute()
const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const canOperate = computed(() => hasOperatorAccess())

useStoreWatch(
  canOperate.value
    ? [
        { store: appointmentStore, getOpts: {  } },
        { store: clientStore, getOpts: {  } },
        { store: treatmentStore, getOpts: {  }, checkLogin: false },
        { store: appConfigStore, getOpts: {  }, checkLogin: false },
      ]
    : [],
)

const selectedDate = computed(() => {
  const raw = String(route.query.date ?? '').trim()
  const fallback = new Date()
  if (!raw) return startOfDay(fallback)
  const next = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(next.getTime())) return startOfDay(fallback)
  return startOfDay(next)
})

const selectedOperatorId = computed(() => String(route.query.operatorId ?? '').trim())
const defaultDuration = computed(() => appConfigStore.getConfigData().defaultAppointmentDurationMinutes)

const treatmentsById = computed(() => new Map(treatmentStore.itemsActiveArray.map((item) => [item.id, item])))
const clientsById = computed(() => new Map(clientStore.itemsActiveArray.map((item) => [item.id, item])))

function primaryOperatorId(appointment: (typeof appointmentStore.itemsActiveArray)[number]) {
  return String((appointment.operator_ids ?? [])[0] ?? '').trim()
}

const dayAppointments = computed(() => {
  const dayStart = startOfDay(selectedDate.value)
  const dayEnd = endOfDay(selectedDate.value)

  return appointmentStore.itemsActiveArray
    .filter((appointment) => {
      const start = asDate(appointment.date_time)
      if (!start) return false
      if (start < dayStart || start > dayEnd) return false

      const isPersonal = appointment.isPersonal ?? false
      const primary = primaryOperatorId(appointment)
      const me = String(Auth.uid ?? '').trim()
      if (isPersonal && primary && primary !== me) {
        return false
      }
      if (isPersonal && !primary && !(appointment.operator_ids ?? []).includes(me)) return false

      const selectedOperator = selectedOperatorId.value
      if (!selectedOperator) return true
      if (isPersonal && primary) return primary === selectedOperator
      return (appointment.operator_ids ?? []).includes(selectedOperator)
    })
    .map((appointment) => {
      const start = asDate(appointment.date_time) ?? dayStart
      const end = appointmentEndDate(appointment, treatmentsById.value, defaultDuration.value)
      const clientId = String(appointment.client_id ?? appointment.user_id ?? '').trim()
      const client = clientId ? clientsById.value.get(clientId) : undefined
      const clientLabel = client ? `${client.name} ${client.surname}`.trim() : 'Cliente non associato'
      return {
        appointment,
        start,
        end,
        clientLabel,
      }
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())
})

const freeSlots = computed(() => {
  const appConfig = appConfigStore.getConfigData()
  const occupied = dayAppointments.value.map((item) => ({ start: item.start, end: item.end }))
  return buildAvailabilitySlots(selectedDate.value, occupied, appConfig, defaultDuration.value)
})

const dayLabel = computed(() =>
  selectedDate.value.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
)

function formatHour(date: Date) {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function openAppointment(id: string) {
  router.push({ name: 'AppointmentEditView', params: { id } })
}

function createFromSlot(slotStart: Date) {
  const date = slotStart.toISOString()
  router.push({
    name: 'AppointmentEditView',
    params: { id: 'new' },
    query: {
      dateTime: date,
      operatorId: selectedOperatorId.value || undefined,
    },
  })
}

</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Dettaglio giorno" :to="{ name: 'CalendarView' }" />

    <div class="px-2 pb-4">
      <p v-if="!canOperate" class="text-muted small mt-3">Permesso `OPERATORE` richiesto.</p>

      <template v-else>
        <div class="card border-0 shadow-sm p-3 mb-2">
          <h2 class="h6 mb-1 text-capitalize">{{ dayLabel }}</h2>
          <small class="text-muted">Appuntamenti: {{ dayAppointments.length }} | Slot liberi: {{ freeSlots.length }}</small>
        </div>

        <div class="row g-2">
          <div class="col-12 col-lg-7">
            <div class="card border-0 shadow-sm p-3 h-100">
              <h3 class="h6 mb-2">Appuntamenti del giorno</h3>
              <div class="vstack gap-2">
                <article
                  v-for="item in dayAppointments"
                  :key="item.appointment.id"
                  class="appointment-row"
                  @click="openAppointment(item.appointment.id)"
                >
                  <div class="d-flex justify-content-between align-items-start gap-2">
                    <div class="min-w-0">
                      <p class="fw-semibold mb-0 text-truncate">{{ item.clientLabel }}</p>
                      <p class="small text-muted mb-0">
                        {{ formatHour(item.start) }} - {{ formatHour(item.end) }}
                        <span v-if="item.appointment.isPersonal" class="badge text-bg-secondary ms-1">personale</span>
                      </p>
                      <p class="small text-muted mb-0 text-truncate">{{ item.appointment.notes || 'Nessuna nota' }}</p>
                    </div>
                    <Btn type="button" color="dark" variant="outline" icon="edit" @click.stop="openAppointment(item.appointment.id)">
                      Edit
                    </Btn>
                  </div>
                </article>
                <p v-if="!dayAppointments.length" class="text-muted small mb-0">Nessun appuntamento nel giorno selezionato.</p>
              </div>
            </div>
          </div>

          <div class="col-12 col-lg-5">
            <div class="card border-0 shadow-sm p-3 h-100">
              <h3 class="h6 mb-2">Buchi di disponibilita</h3>
              <div class="vstack gap-2">
                <button
                  v-for="(slot, index) in freeSlots"
                  :key="`${slot.start.toISOString()}-${index}`"
                  type="button"
                  class="slot-btn"
                  @click="createFromSlot(slot.start)"
                >
                  {{ formatHour(slot.start) }} - {{ formatHour(slot.end) }}
                </button>
                <p v-if="!freeSlots.length" class="text-muted small mb-0">
                  Nessuno slot disponibile con la durata di default.
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.appointment-row {
  border: 1px solid rgba(84, 44, 58, 0.14);
  border-radius: 8px;
  padding: 0.65rem;
  cursor: pointer;
  background: #fff;
}

.slot-btn {
  border: 1px solid rgba(31, 105, 56, 0.25);
  background: rgba(28, 157, 73, 0.08);
  color: #16522c;
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
  text-align: left;
}

.min-w-0 {
  min-width: 0;
}
</style>
