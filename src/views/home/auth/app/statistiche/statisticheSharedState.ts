import { reactive } from 'vue'
import { buildDefaultAppointmentWatchRange } from '../../../../../composables/useAppointmentWatchManager'

export type StatisticheSharedRange = {
  from: Date
  to?: Date
}

const defaultRange = buildDefaultAppointmentWatchRange(new Date())

export const statisticheSharedState = reactive<StatisticheSharedRange>({
  from: cloneDate(defaultRange.from),
  to: defaultRange.to ? cloneDate(defaultRange.to) : undefined,
})

export function setStatisticheSharedRange(nextRange: StatisticheSharedRange) {
  statisticheSharedState.from = cloneDate(nextRange.from)
  statisticheSharedState.to = nextRange.to ? cloneDate(nextRange.to) : undefined
}

function cloneDate(date: Date) {
  return new Date(date.getTime())
}
