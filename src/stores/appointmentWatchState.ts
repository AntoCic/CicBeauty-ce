import { reactive } from 'vue'

export type AppointmentWatchMode =
  | 'idle'
  | 'default'
  | 'calendar-month'
  | 'day'
  | 'range'
  | 'suspended'

export const appointmentWatchState = reactive({
  activeMode: 'idle' as AppointmentWatchMode,
  activeReason: '',
  activeRangeKey: '',
  currentFromIso: '',
  currentToIso: '',
  activeReasons: [] as string[],
  suspendedReasons: [] as string[],
  activeMonths: [] as string[],
  loadedMonths: [] as string[],
  restartCount: 0,
})
