<script setup lang="ts">
import { Btn, cicKitStore, normalizeGender, toast, useStoreWatch } from 'cic-kit'
import { Timestamp } from 'firebase/firestore'
import { computed, ref } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { Auth } from '../../main'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { asDate } from '../../utils/date'

type ImportSummary = {
  created: number
  updated: number
  skipped: number
}

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())

const clientsJson = ref('')
const appointmentsJson = ref('')
const isImporting = ref(false)
const clientsSummary = ref<ImportSummary | null>(null)
const appointmentsSummary = ref<ImportSummary | null>(null)

useStoreWatch([
  { store: clientStore, getOpts: {  } },
  { store: treatmentStore, getOpts: {  }, checkLogin: false },
  { store: appointmentStore, getOpts: {  } },
])

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function parseJsonArray(raw: string, label: string) {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new Error(`${label}: il JSON deve essere un array`)
    }
    return parsed as Array<Record<string, unknown>>
  } catch (error) {
    throw new Error(`${label}: JSON non valido (${(error as Error).message})`)
  }
}

function updateBy() {
  return normalizeString(Auth.user?.email ?? Auth.uid ?? 'admin')
}

async function importClients() {
  const input = parseJsonArray(clientsJson.value, 'Clienti')
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0 }
  const byOldId = new Map(
    clientStore.itemsActiveArray
      .filter((item) => item.old_id)
      .map((item) => [normalizeString(item.old_id), item]),
  )

  for (const row of input) {
    const name = normalizeString(row.name ?? row.nome)
    const surname = normalizeString(row.surname ?? row.cognome)
    if (!name || !surname) {
      summary.skipped += 1
      continue
    }

    const oldId = normalizeString(row.old_id ?? row._id ?? row.id)
    const payload = {
      name,
      surname,
      phone_number: normalizeString(row.phone_number ?? row.telefono),
      gender: normalizeGender(row.gender) || 'f',
      email: normalizeString(row.email),
      birthdate: normalizeString(row.birthdate),
      note: normalizeString(row.note ?? row.notes),
      old_id: oldId,
      updateBy: updateBy(),
    }

    const existing = oldId ? byOldId.get(oldId) : undefined
    if (existing) {
      await existing.update(payload)
      summary.updated += 1
      continue
    }

    await clientStore.add(payload)
    summary.created += 1
  }
  clientsSummary.value = summary
}

async function importAppointments() {
  const input = parseJsonArray(appointmentsJson.value, 'Appuntamenti')
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0 }

  const treatmentByOldId = new Map(
    treatmentStore.itemsActiveArray
      .filter((item) => item.old_id)
      .map((item) => [normalizeString(item.old_id), item.id]),
  )
  const clientByOldId = new Map(
    clientStore.itemsActiveArray
      .filter((item) => item.old_id)
      .map((item) => [normalizeString(item.old_id), item.id]),
  )
  const appointmentByOldId = new Map(
    appointmentStore.itemsActiveArray
      .filter((item) => item.old_id)
      .map((item) => [normalizeString(item.old_id), item]),
  )

  for (const row of input) {
    const start = asDate(row.date_time ?? row.date ?? row.start)
    if (!start) {
      summary.skipped += 1
      continue
    }

    const oldId = normalizeString(row.old_id ?? row._id ?? row.id)
    const oldClientId = normalizeString(row.user_id ?? row.client_id)
    const clientId = oldClientId ? clientByOldId.get(oldClientId) : undefined

    const legacyTreatmentIds = Array.isArray(row.treatment_ids) ? row.treatment_ids : []
    const mappedTreatments = legacyTreatmentIds
      .map((id) => treatmentByOldId.get(normalizeString(id)) ?? normalizeString(id))
      .filter(Boolean)
    const productIds = Array.isArray(row.product_ids) ? row.product_ids.map((id) => normalizeString(id)).filter(Boolean) : []
    const legacyOperatorIds = Array.isArray(row.operator_ids) ? row.operator_ids : [row.operator_id ?? Auth.uid]
    const operatorIds = legacyOperatorIds.map((id) => normalizeString(id)).filter(Boolean)
    const normalizedOperatorIds = operatorIds.length
      ? operatorIds
      : [normalizeString(Auth.uid)].filter(Boolean)
    const googleCalendarSyncedAt = asDate(row.googleCalendarSyncedAt)

    const payload = {
      date_time: Timestamp.fromDate(start),
      user_id: clientId,
      client_id: clientId,
      treatment_ids: mappedTreatments,
      product_ids: productIds,
      operator_ids: normalizedOperatorIds,
      isPersonal: Boolean(row.isPersonal),
      discount: Number(row.discount ?? 0),
      extra: Number(row.extra ?? 0),
      fix_duration: Number(row.fix_duration ?? 0),
      coupon_id: normalizeString(row.coupon_id) || undefined,
      old_id: oldId || undefined,
      notes: normalizeString(row.notes ?? row.note),
      reminded: Boolean(row.reminded),
      googleCalendarEventId: normalizeString(row.googleCalendarEventId) || undefined,
      googleCalendarSyncedAt: googleCalendarSyncedAt ? Timestamp.fromDate(googleCalendarSyncedAt) : undefined,
      updateBy: updateBy(),
    }

    const existing = oldId ? appointmentByOldId.get(oldId) : undefined
    if (existing) {
      await existing.update(payload)
      summary.updated += 1
      continue
    }

    await appointmentStore.add(payload)
    summary.created += 1
  }

  appointmentsSummary.value = summary
}

async function runImport() {
  isImporting.value = true
  try {
    if (clientsJson.value.trim()) {
      await importClients()
    }
    if (appointmentsJson.value.trim()) {
      await importAppointments()
    }
    toast.success('Import completato')
  } catch (error) {
    console.error(error)
    toast.error((error as Error).message || 'Errore import JSON')
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Import Migrazione JSON" :to="{ name: 'home' }" />

    <div class="px-2 pb-4">
      <div class="card border-0 shadow-sm p-3 mb-3">
        <h3 class="h6">Clienti JSON</h3>
        <textarea
          v-model="clientsJson"
          class="form-control"
          rows="8"
          placeholder='[{"old_id":"123","name":"Mario","surname":"Rossi","phone_number":"+39..."}]'
        />
      </div>

      <div class="card border-0 shadow-sm p-3 mb-3">
        <h3 class="h6">Appuntamenti JSON</h3>
        <textarea
          v-model="appointmentsJson"
          class="form-control"
          rows="8"
          placeholder='[{"old_id":"a1","date_time":"2026-03-01T10:00:00.000Z","user_id":"123","treatment_ids":["t1"]}]'
        />
      </div>

      <Btn color="dark" icon="upload_file" :loading="isImporting" @click="runImport">
        Avvia import
      </Btn>

      <div class="row g-2 mt-1">
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm p-3 h-100">
            <h4 class="h6">Esito clienti</h4>
            <p v-if="clientsSummary" class="small mb-0">
              Creati: {{ clientsSummary.created }} | Aggiornati: {{ clientsSummary.updated }} | Saltati: {{ clientsSummary.skipped }}
            </p>
            <p v-else class="small text-muted mb-0">Nessun import eseguito.</p>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm p-3 h-100">
            <h4 class="h6">Esito appuntamenti</h4>
            <p v-if="appointmentsSummary" class="small mb-0">
              Creati: {{ appointmentsSummary.created }} | Aggiornati: {{ appointmentsSummary.updated }} | Saltati: {{ appointmentsSummary.skipped }}
            </p>
            <p v-else class="small text-muted mb-0">Nessun import eseguito.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

