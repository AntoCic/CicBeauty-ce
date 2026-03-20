<script setup lang="ts">
import { computed, ref } from 'vue'
import { cicKitStore } from 'cic-kit'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { productStore } from '../../stores/productStore'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const selectedDate = ref(new Date().toISOString().slice(0, 10))

const treatmentMap = computed(() => {
  const map: Record<string, string> = {}
  for (const item of treatmentStore.itemsActiveArray) {
    map[item.id] = item.title
  }
  return map
})

const productMap = computed(() => {
  const map: Record<string, string> = {}
  for (const item of productStore.itemsActiveArray) {
    map[item.id] = item.title
  }
  return map
})

const appointmentsForDay = computed(() => {
  return appointmentStore.itemsActiveArray
    .filter((appointment) => {
      const date = appointment.date_time?.toDate?.()
      if (!date) return false
      return date.toISOString().slice(0, 10) === selectedDate.value
    })
    .sort((a, b) => a.date_time.toDate().getTime() - b.date_time.toDate().getTime())
})

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatMoney(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return `${value.toFixed(2)} €`
}

const appointmentCards = computed(() => appointmentsForDay.value.map((appointment) => {
  const date = appointment.date_time.toDate()
  const client = clientStore.findItemsById(appointment.client_id ?? '')
  const clientName = [client?.name, client?.surname].filter(Boolean).join(' ').trim() || 'Cliente non specificato'

  const treatments = (appointment.treatment_ids ?? [])
    .map((id) => treatmentMap.value[id])
    .filter(Boolean)

  const products = (appointment.product_ids ?? [])
    .map((id) => productMap.value[id])
    .filter(Boolean)

  const clientDeposits = client?.deposits ?? []
  const depositTotal = clientDeposits.reduce((sum, deposit) => sum + Number(deposit.totalAmount ?? 0), 0)
  const depositPaid = clientDeposits.reduce(
    (sum, deposit) => sum + (deposit.settlements ?? []).reduce((inner, row) => inner + Number(row.paidAmount ?? 0), 0),
    0,
  )

  const duration = typeof appointment.fix_duration === 'number' && appointment.fix_duration > 0
    ? `${Math.round(appointment.fix_duration)} min`
    : '-'

  return {
    id: appointment.id,
    time: formatTime(date),
    clientName,
    note: String(appointment.notes ?? '').trim() || '-',
    total: formatMoney(appointment.total),
    duration,
    treatments,
    products,
    depositTotal: formatMoney(depositTotal),
    depositPaid: formatMoney(depositPaid),
  }
}))

async function downloadDailyPdf() {
  const pdfDoc = await PDFDocument.create()
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([595, 842])
  let y = 810

  page.drawText(`Appunti giornata ${selectedDate.value}`, { x: 40, y, size: 18, font: bold, color: rgb(0.18, 0.18, 0.18) })
  y -= 28
  page.drawText(`Totale appuntamenti: ${appointmentCards.value.length}`, { x: 40, y, size: 10, font: regular, color: rgb(0.25, 0.25, 0.25) })
  y -= 22

  for (const card of appointmentCards.value) {
    const blockHeight = 110
    if (y - blockHeight < 40) {
      page = pdfDoc.addPage([595, 842])
      y = 810
    }

    page.drawRectangle({ x: 36, y: y - 98, width: 523, height: 96, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 1 })

    page.drawText(`🕒 ${card.time}  👤 ${card.clientName}`, { x: 46, y: y - 16, size: 11, font: bold, color: rgb(0.12, 0.12, 0.12) })
    page.drawText(`💶 Prezzo: ${card.total}   ⏱️ Tempo: ${card.duration}`, { x: 46, y: y - 33, size: 10, font: regular, color: rgb(0.15, 0.15, 0.15) })
    page.drawText(`💳 Acconti cliente: ${card.depositPaid} / ${card.depositTotal}`, { x: 46, y: y - 48, size: 10, font: regular, color: rgb(0.15, 0.15, 0.15) })

    const treatmentLabel = card.treatments.length ? card.treatments.join(', ') : '-'
    const productLabel = card.products.length ? card.products.join(', ') : '-'
    page.drawText(`✨ Trattamenti: ${treatmentLabel}`, { x: 46, y: y - 63, size: 9, font: regular, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(`🧴 Prodotti: ${productLabel}`, { x: 46, y: y - 76, size: 9, font: regular, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(`📝 Note: ${card.note}`, { x: 46, y: y - 89, size: 9, font: regular, color: rgb(0.2, 0.2, 0.2) })

    y -= blockHeight
  }

  const bytes = await pdfDoc.save()
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `appunti-giornata-${selectedDate.value}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="container-fluid pb-t pt-3 pt-md-4 overflow-auto vh-100" :style="bgStyle">
    <HeaderApp :to="{ name: 'homeApp' }" />

    <article class="mx-auto" style="max-width: 980px;">
      <h1 class="h4">📒 Appunti giornata + PDF</h1>
      <p class="text-muted small mb-2">Seleziona la data e scarica il PDF con tutte le info operative essenziali.</p>

      <div class="d-flex gap-2 align-items-center mb-3 flex-wrap">
        <input v-model="selectedDate" type="date" class="form-control form-control-sm" style="max-width: 220px;" />
        <button type="button" class="btn btn-dark btn-sm" @click="downloadDailyPdf">
          ⬇️ Scarica PDF appunti giornata
        </button>
      </div>

      <p class="small text-muted">Appuntamenti trovati: <strong>{{ appointmentCards.length }}</strong></p>

      <section class="vstack gap-2 pb-4">
        <article v-for="card in appointmentCards" :key="card.id" class="border rounded p-2 bg-white">
          <h2 class="h6 mb-1">🕒 {{ card.time }} · 👤 {{ card.clientName }}</h2>
          <p class="mb-1">💶 <strong>Prezzo:</strong> {{ card.total }} · ⏱️ <strong>Tempo:</strong> {{ card.duration }}</p>
          <p class="mb-1">💳 <strong>Acconti cliente:</strong> {{ card.depositPaid }} / {{ card.depositTotal }}</p>
          <p class="mb-1">✨ <strong>Trattamenti:</strong> {{ card.treatments.length ? card.treatments.join(', ') : '-' }}</p>
          <p class="mb-1">🧴 <strong>Prodotti:</strong> {{ card.products.length ? card.products.join(', ') : '-' }}</p>
          <p class="mb-0">📝 <strong>Note:</strong> {{ card.note }}</p>
        </article>

        <p v-if="!appointmentCards.length" class="text-muted small mb-0">Nessun appuntamento trovato per la data selezionata.</p>
      </section>
    </article>
  </div>
</template>
