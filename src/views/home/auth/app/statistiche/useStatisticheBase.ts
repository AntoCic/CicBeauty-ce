import { computed } from 'vue'
import { appointmentStore } from '../../../../../stores/appointmentStore'
import { appConfigStore } from '../../../../../stores/appConfigStore'
import { clientStore } from '../../../../../stores/clientStore'
import { treatmentStore } from '../../../../../stores/treatmentStore'
import { computeAppointmentDurationMinutes } from '../../../../../utils/calendar'
import { asDate } from '../../../../../utils/date'
import {
  buildOpenRangeSummary,
  filterByRange,
  normalizeRevenue,
  sumRevenue,
  type AppuntamentoStat,
  type OpenRangeSummaryMetrics,
} from './statisticheUtils'
import { statisticheSharedState } from './statisticheSharedState'

export type StatisticheSummary = {
  filteredAppointments: number
  filteredRevenue: number
  openRangeMetrics?: OpenRangeSummaryMetrics
}

export function useStatisticheBase() {
  const range = computed(() => ({
    from: statisticheSharedState.from,
    to: statisticheSharedState.to,
  }))

  const fallbackDuration = computed(() => {
    const value = Number(appConfigStore.getConfigData().defaultAppointmentDurationMinutes)
    return Number.isFinite(value) && value > 0 ? value : 60
  })

  const treatmentDurationById = computed(() => {
    return new Map(
      treatmentStore.itemsActiveArray.map((treatment) => [
        treatment.id,
        {
          title: String(treatment.title ?? '').trim() || 'Trattamento',
          duration: Number(treatment.duration ?? 0),
        },
      ]),
    )
  })

  const clientLabelById = computed(() => {
    return new Map(
      clientStore.itemsActiveArray.map((client) => [
        client.id,
        `${String(client.name ?? '').trim()} ${String(client.surname ?? '').trim()}`.trim() || client.id,
      ]),
    )
  })

  const appuntamentiCompleti = computed<AppuntamentoStat[]>(() => {
    const mapTreatments = treatmentDurationById.value
    const fallback = fallbackDuration.value

    return appointmentStore.itemsActiveArray
      .map((appointment) => {
        const start = asDate(appointment.date_time)
        if (!start) return undefined

        const treatmentIds = Array.isArray(appointment.treatment_ids)
          ? appointment.treatment_ids.map((id) => String(id ?? '').trim()).filter(Boolean)
          : []

        const minutes = computeAppointmentDurationMinutes(
          {
            fix_duration: appointment.fix_duration,
            treatment_ids: treatmentIds,
          },
          mapTreatments,
          fallback,
        )

        return {
          id: appointment.id,
          start,
          revenue: normalizeRevenue(appointment.total),
          clientId: String(appointment.client_id ?? appointment.user_id ?? '').trim(),
          treatmentIds,
          minutes,
        }
      })
      .filter((item): item is AppuntamentoStat => Boolean(item))
  })

  const appuntamentiFiltrati = computed(() => {
    return filterByRange(appuntamentiCompleti.value, range.value)
  })

  const isOpenRange = computed(() => !range.value.to)

  const summary = computed<StatisticheSummary>(() => {
    const filtered = appuntamentiFiltrati.value
    return {
      filteredAppointments: filtered.length,
      filteredRevenue: sumRevenue(filtered),
      openRangeMetrics: isOpenRange.value ? buildOpenRangeSummary(filtered, new Date()) : undefined,
    }
  })

  return {
    range,
    isOpenRange,
    summary,
    clientLabelById,
    treatmentDurationById,
    appuntamentiCompleti,
    appuntamentiFiltrati,
  }
}
