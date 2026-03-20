<script setup lang="ts">
import { cicKitStore } from 'cic-kit'
import { computed, ref } from 'vue'
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { UserPermission } from '../../enums/UserPermission'
import { Auth } from '../../main'
import type { Treatment } from '../../models/Treatment'
import { appConfigStore } from '../../stores/appConfigStore'
import { appointmentStore } from '../../stores/appointmentStore'
import { clientStore } from '../../stores/clientStore'
import { couponStore } from '../../stores/couponStore'
import { productStore } from '../../stores/productStore'
import { treatmentCategoryStore } from '../../stores/treatmentCategoryStore'
import { treatmentStore } from '../../stores/treatmentStore'
import { computeAppointmentDurationMinutes } from '../../utils/calendar'
import { couponDisplayTitle } from '../../utils/couponUtils'

type AppointmentCard = {
  id: string
  time: string
  startsAt: Date
  endsAt: Date
  clientName: string
  clientPhone: string
  total: string
  duration: string
  treatments: string[]
  products: string[]
  couponLabel: string
  requiresLaserSheet: boolean
  hasLaserSheet: boolean
  hasDeposits: boolean
  depositPaid: string
  depositTotal: string
  note: string
  importantNote: string
}

type PdfTimelineEntry =
  | {
    kind: 'appointment'
    card: AppointmentCard
  }
  | {
    kind: 'gap'
    gapMinutes: number
    fromTime: string
    toTime: string
  }

type ColumnIndex = 0 | 1

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const selectedDate = ref(toInputDateValue(new Date()))

const canViewImportantNote = computed(() => {
  const user = Auth?.user as
    | {
      operatore?: boolean
      hasPermission?: (permission: string | string[]) => boolean
    }
    | undefined

  if (!user) return false
  if (user.operatore) return true
  return user.hasPermission?.(UserPermission.OPERATORE) ?? false
})

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

const treatmentDurationMap = computed(() => {
  return new Map(treatmentStore.itemsActiveArray.map((item) => [item.id, item]))
})

const treatmentCategoryMap = computed(() => {
  const map: Record<string, string> = {}
  for (const item of treatmentCategoryStore.itemsActiveArray) {
    map[item.id] = `${normalizeString(item.title)} ${normalizeString(item.subtitle)}`.trim()
  }
  return map
})

const defaultAppointmentDurationMinutes = computed(() => {
  return appConfigStore.getConfigData().defaultAppointmentDurationMinutes
})

const appointmentsForDay = computed(() => {
  return appointmentStore.itemsActiveArray
    .filter((appointment) => {
      const date = appointment.date_time?.toDate?.()
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false
      return toInputDateValue(date) === selectedDate.value
    })
    .sort((a, b) => a.date_time.toDate().getTime() - b.date_time.toDate().getTime())
})

const appointmentCards = computed<AppointmentCard[]>(() => {
  return appointmentsForDay.value.map((appointment) => {
    const date = appointment.date_time.toDate()
    const client = clientStore.findItemsById(appointment.client_id ?? '')
    const clientName = [client?.name, client?.surname].filter(Boolean).join(' ').trim() || 'Cliente non specificato'
    const clientPhone = normalizeString(client?.phone_number)

    const treatments = (appointment.treatment_ids ?? [])
      .map((id) => treatmentMap.value[id])
      .filter((item): item is string => Boolean(item))

    const products = (appointment.product_ids ?? [])
      .map((id) => productMap.value[id])
      .filter((item): item is string => Boolean(item))

    const treatmentItems = (appointment.treatment_ids ?? [])
      .map((id) => treatmentStore.findItemsById(id))
      .filter((item): item is Treatment => Boolean(item))

    const requiresLaserSheet = treatmentItems.some((item) => treatmentNeedsLaserSheet(item))
    const hasLaserSheet = Boolean(client?.schedaLaser && Object.keys(client.schedaLaser).length)

    const couponId = normalizeString(appointment.coupon_id)
    const coupon = couponId ? couponStore.findItemsById(couponId) : undefined
    const couponLabel = couponId ? (couponDisplayTitle(coupon) || couponId) : ''

    const clientDeposits = client?.deposits ?? []
    const depositTotalAmount = clientDeposits.reduce((sum, deposit) => sum + Number(deposit.totalAmount ?? 0), 0)
    const depositPaidAmount = clientDeposits.reduce(
      (sum, deposit) => sum + (deposit.settlements ?? []).reduce((inner, row) => inner + Number(row.paidAmount ?? 0), 0),
      0,
    )

    const durationMinutes = computeAppointmentDurationMinutes(
      appointment,
      treatmentDurationMap.value,
      defaultAppointmentDurationMinutes.value,
    )
    const duration = durationMinutes > 0 ? `${durationMinutes} min` : ''
    const endsAt = new Date(date.getTime() + durationMinutes * 60_000)

    return {
      id: appointment.id,
      time: formatTime(date),
      startsAt: date,
      endsAt,
      clientName,
      clientPhone,
      total: formatMoney(appointment.total),
      duration,
      treatments,
      products,
      couponLabel,
      requiresLaserSheet,
      hasLaserSheet,
      hasDeposits: depositTotalAmount > 0 || depositPaidAmount > 0,
      depositPaid: formatMoney(depositPaidAmount),
      depositTotal: formatMoney(depositTotalAmount),
      note: toPlainText(appointment.notes),
      importantNote: canViewImportantNote.value ? toPlainText(client?.note) : '',
    }
  })
})

const pdfTimelineEntries = computed<PdfTimelineEntry[]>(() => {
  const entries: PdfTimelineEntry[] = []
  const cards = appointmentCards.value

  for (let index = 0; index < cards.length; index += 1) {
    const current = cards[index]
    if (!current) continue

    entries.push({ kind: 'appointment', card: current })

    const next = cards[index + 1]
    if (!next) continue

    const gapMinutesRaw = (next.startsAt.getTime() - current.endsAt.getTime()) / 60_000
    if (!Number.isFinite(gapMinutesRaw) || gapMinutesRaw <= 5) continue

    entries.push({
      kind: 'gap',
      gapMinutes: Math.ceil(gapMinutesRaw),
      fromTime: formatTime(current.endsAt),
      toTime: formatTime(next.startsAt),
    })
  }

  return entries
})

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function toInputDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toInputDateByOffset(offsetDays: number) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return toInputDateValue(date)
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatMoney(value: number | undefined) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return ''
  return `${amount.toFixed(2)} EUR`
}

function toPlainText(value: unknown) {
  const raw = normalizeString(value)
  if (!raw) return ''

  if (typeof document === 'undefined') {
    return normalizeString(raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '))
  }

  const node = document.createElement('div')
  node.innerHTML = raw
  const plainText = normalizeString((node.textContent ?? node.innerText ?? '').replace(/\s+/g, ' '))
  return plainText
}

function toPdfSafeText(value: unknown, font: PDFFont) {
  const text = normalizeString(value)
  if (!text) return ''

  let safe = ''
  for (const char of text) {
    try {
      font.encodeText(char)
      safe += char
    } catch {
      safe += ' '
    }
  }

  return normalizeString(safe.replace(/\s+/g, ' '))
}

function isLaserLikeText(value: unknown) {
  const text = normalizeString(value).toLocaleLowerCase()
  if (!text) return false
  return (
    text.includes('laser') ||
    text.includes('fotobiostimolazione') ||
    text.includes('foto biostimolazione') ||
    text.includes('luce pulsata')
  )
}

function treatmentNeedsLaserSheet(treatment: Pick<Treatment, 'title' | 'subtitle' | 'tag' | 'categoryIds'>) {
  const categoryText = (treatment.categoryIds ?? [])
    .map((id) => treatmentCategoryMap.value[id] ?? '')
    .join(' ')

  const searchText = [
    treatment.title,
    treatment.subtitle,
    ...(treatment.tag ?? []),
    categoryText,
  ]
    .map((item) => normalizeString(item))
    .join(' ')

  return isLaserLikeText(searchText)
}

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number) {
  const normalized = normalizeString(text)
  if (!normalized) return []

  const words = normalized.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate
      continue
    }

    if (current) {
      lines.push(current)
    }

    if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
      current = word
      continue
    }

    let fragment = ''
    for (const char of word) {
      const fragmentCandidate = `${fragment}${char}`
      if (font.widthOfTextAtSize(fragmentCandidate, fontSize) <= maxWidth) {
        fragment = fragmentCandidate
      } else {
        if (fragment) lines.push(fragment)
        fragment = char
      }
    }

    current = fragment
  }

  if (current) lines.push(current)
  return lines
}

function measureTextBlockHeight(lineCount: number, lineHeight: number, fontSize: number) {
  if (lineCount <= 0) return 0
  return fontSize + (lineCount - 1) * lineHeight
}

function buildPdfDetailRows(card: AppointmentCard) {
  const rows: string[] = []

  if (card.clientPhone) rows.push(`Telefono cliente: ${card.clientPhone}`)

  const priceDuration = [
    card.total ? `Prezzo: ${card.total}` : '',
    card.duration ? `Durata: ${card.duration}` : '',
  ]
    .filter(Boolean)
    .join(' | ')

  if (priceDuration) rows.push(priceDuration)
  if (card.treatments.length) rows.push(`Trattamenti: ${card.treatments.join(', ')}`)
  if (card.requiresLaserSheet && !card.hasLaserSheet) {
    rows.push('ATTENZIONE: trattamento laser/fotobiostimolazione senza scheda laser cliente.')
  }
  if (card.products.length) rows.push(`Prodotti: ${card.products.join(', ')}`)
  if (card.couponLabel) rows.push(`Coupon usato: ${card.couponLabel}`)
  if (card.hasDeposits) rows.push(`Acconti cliente: ${card.depositPaid} / ${card.depositTotal}`)
  if (card.note) rows.push(`Note appuntamento: ${card.note}`)
  if (canViewImportantNote.value && card.importantNote) rows.push(`Nota importante cliente: ${card.importantNote}`)

  return rows
}

async function downloadDailyPdf() {
  const pdfDoc = await PDFDocument.create()
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageSize: [number, number] = [595, 842]
  const marginX = 38
  const bottomY = 44
  const columnGap = 10
  const cardWidth = (pageSize[0] - (marginX * 2) - columnGap) / 2
  const columnX: [number, number] = [marginX, marginX + cardWidth + columnGap]
  const cardInnerWidth = cardWidth - 20
  const titleFontSize = 9.2
  const detailFontSize = 7.6
  const titleLineHeight = 10
  const detailLineHeight = 8.3
  const cardPaddingY = 4.8
  const sectionGap = 1.4
  const cardTextInsetX = 10
  const appointmentEntrySpacing = 8

  const title = toPdfSafeText(`Riepilogo PDF ${selectedDate.value}`, bold)
  const headerMeta = toPdfSafeText(
    `Appuntamenti: ${appointmentCards.value.length} | Generato: ${new Date().toLocaleString('it-IT')}`,
    regular,
  )

  let page = pdfDoc.addPage(pageSize)

  const drawHeader = (targetPage: typeof page, isFirstPage: boolean) => {
    let headerY = 808

    targetPage.drawText(title, { x: marginX, y: headerY, size: 11.5, font: bold, color: rgb(0.17, 0.17, 0.17) })
    headerY -= 14

    targetPage.drawText(headerMeta, { x: marginX, y: headerY, size: 7.8, font: regular, color: rgb(0.38, 0.38, 0.38) })
    headerY -= 10

    if (!isFirstPage) {
      targetPage.drawText('Continua', { x: pageSize[0] - 72, y: 808, size: 7.5, font: regular, color: rgb(0.42, 0.42, 0.42) })
    }

    targetPage.drawLine({
      start: { x: marginX, y: headerY },
      end: { x: pageSize[0] - marginX, y: headerY },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    })

    return headerY - 10
  }

  const firstColumnsStartY = drawHeader(page, true)
  let columnYs: [number, number] = [firstColumnsStartY, firstColumnsStartY]
  let currentColumnIndex: ColumnIndex = 0

  const startNewPage = () => {
    page = pdfDoc.addPage(pageSize)
    const columnsStartY = drawHeader(page, false)
    columnYs = [columnsStartY, columnsStartY]
    currentColumnIndex = 0
  }

  const resolveColumnForHeight = (requiredHeight: number): ColumnIndex => {
    if (columnYs[currentColumnIndex] - requiredHeight >= bottomY) return currentColumnIndex

    const nextColumn: ColumnIndex = currentColumnIndex === 0 ? 1 : 0
    if (columnYs[nextColumn] - requiredHeight >= bottomY) {
      currentColumnIndex = nextColumn
      return currentColumnIndex
    }

    startNewPage()
    return currentColumnIndex
  }

  if (!appointmentCards.value.length) {
    page.drawText(toPdfSafeText('Nessun appuntamento trovato per la data selezionata.', regular), {
      x: marginX,
      y: firstColumnsStartY,
      size: 9,
      font: regular,
      color: rgb(0.24, 0.24, 0.24),
    })
  }

  for (const entry of pdfTimelineEntries.value) {
    if (entry.kind === 'gap') {
      const gapHeight = 14
      const columnIndex = resolveColumnForHeight(gapHeight)
      const columnTopY = columnYs[columnIndex]

      const gapLabel = toPdfSafeText(
        `${entry.gapMinutes} min liberi | ${entry.fromTime} - ${entry.toTime}`,
        bold,
      )
      page.drawText(gapLabel, {
        x: columnX[columnIndex] + 2,
        y: columnTopY - 6,
        size: 7.8,
        font: bold,
        color: rgb(0.45, 0.29, 0.34),
      })

      columnYs[columnIndex] -= gapHeight
      continue
    }

    const card = entry.card
    const titleLines = wrapText(
      toPdfSafeText(`${card.time} - ${card.clientName}`, bold),
      cardInnerWidth,
      bold,
      titleFontSize,
    )

    const detailLines = buildPdfDetailRows(card)
      .map((row) => toPdfSafeText(row, regular))
      .filter(Boolean)
      .flatMap((row) => wrapText(row, cardInnerWidth, regular, detailFontSize))

    const titleBlockHeight = measureTextBlockHeight(titleLines.length, titleLineHeight, titleFontSize)
    const detailBlockHeight = measureTextBlockHeight(detailLines.length, detailLineHeight, detailFontSize)
    const innerGap = titleBlockHeight && detailBlockHeight ? sectionGap : 0
    const cardHeight = (cardPaddingY * 2) + titleBlockHeight + innerGap + detailBlockHeight

    const columnIndex = resolveColumnForHeight(cardHeight)
    const columnTopY = columnYs[columnIndex]
    const cardX = columnX[columnIndex]
    const cardTextX = cardX + cardTextInsetX

    page.drawRectangle({
      x: cardX,
      y: columnTopY - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: rgb(0.99, 0.98, 0.98),
      borderColor: rgb(0.87, 0.82, 0.84),
      borderWidth: 1,
    })

    const titleStartY = columnTopY - cardPaddingY - titleFontSize

    let textY = titleStartY
    for (const line of titleLines) {
      page.drawText(line, { x: cardTextX, y: textY, size: titleFontSize, font: bold, color: rgb(0.12, 0.12, 0.12) })
      textY -= titleLineHeight
    }

    const detailStartY = columnTopY - cardPaddingY - titleBlockHeight - innerGap - detailFontSize
    textY = detailStartY
    for (const line of detailLines) {
      page.drawText(line, { x: cardTextX, y: textY, size: detailFontSize, font: regular, color: rgb(0.24, 0.24, 0.24) })
      textY -= detailLineHeight
    }

    columnYs[columnIndex] -= cardHeight + appointmentEntrySpacing
  }

  const bytes = await pdfDoc.save()
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `riepilogo-giornata-${selectedDate.value}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

async function downloadRelativeDailyPdf(offsetDays: number) {
  selectedDate.value = toInputDateByOffset(offsetDays)
  await downloadDailyPdf()
}
</script>

<template>
  <div class="container-fluid pb-t pt-3 pt-md-4 overflow-auto vh-100" :style="bgStyle">
    <HeaderApp :to="{ name: 'homeApp' }" />

    <article class="daily-notes mx-auto">
      <section class="daily-notes__panel">
        <header class="daily-notes__header">
          <h1 class="daily-notes__title">Riepilogo giornata</h1>
          <p class="daily-notes__subtitle mb-0">Scegli una data e scarica un PDF semplice con le informazioni utili.</p>
        </header>

        <div class="daily-notes__controls">
          <input
            v-model="selectedDate"
            type="date"
            class="form-control form-control-sm"
            style="max-width: 220px;"
          />
          <button type="button" class="btn btn-dark btn-sm" @click="downloadDailyPdf">
            Scarica PDF riepilogo
          </button>
        </div>

        <div class="daily-notes__quick-actions">
          <button type="button" class="btn btn-outline-dark btn-sm" @click="downloadRelativeDailyPdf(0)">
            Scarica riepilogo di oggi
          </button>
          <button type="button" class="btn btn-outline-dark btn-sm" @click="downloadRelativeDailyPdf(1)">
            Scarica riepilogo di domani
          </button>
        </div>

        <p class="daily-notes__counter mb-0">Appuntamenti trovati: <strong>{{ appointmentCards.length }}</strong></p>
      </section>

      <section class="daily-list pb-4">
        <article v-for="card in appointmentCards" :key="card.id" class="daily-card">
          <div class="daily-card__top">
            <span class="daily-card__time">{{ card.time }}</span>
            <h2 class="daily-card__name mb-0">{{ card.clientName }}</h2>
          </div>

          <p v-if="card.total || card.duration" class="daily-card__line">
            <span v-if="card.total"><strong>Prezzo:</strong> {{ card.total }}</span>
            <span v-if="card.total && card.duration"> | </span>
            <span v-if="card.duration"><strong>Durata:</strong> {{ card.duration }}</span>
          </p>

          <p v-if="card.treatments.length" class="daily-card__line">
            <strong>Trattamenti:</strong> {{ card.treatments.join(', ') }}
          </p>

          <p v-if="card.products.length" class="daily-card__line">
            <strong>Prodotti:</strong> {{ card.products.join(', ') }}
          </p>

          <p v-if="card.hasDeposits" class="daily-card__line">
            <strong>Acconti cliente:</strong> {{ card.depositPaid }} / {{ card.depositTotal }}
          </p>

          <p v-if="card.note" class="daily-card__line">
            <strong>Note appuntamento:</strong> {{ card.note }}
          </p>

          <p v-if="canViewImportantNote && card.importantNote" class="daily-card__important mb-0">
            <strong>Nota importante cliente:</strong> {{ card.importantNote }}
          </p>
        </article>

        <p v-if="!appointmentCards.length" class="daily-list__empty mb-0">
          Nessun appuntamento trovato per la data selezionata.
        </p>
      </section>
    </article>
  </div>
</template>

<style scoped lang="scss">
.daily-notes {
  max-width: 980px;
}

.daily-notes__panel {
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 16px;
  padding: 14px;
  background:
    radial-gradient(circle at 8% 0%, rgba(232, 179, 190, 0.2) 0%, transparent 54%),
    linear-gradient(170deg, rgba(255, 255, 255, 0.96), rgba(249, 244, 245, 0.98));
  box-shadow: 0 8px 20px rgba(31, 21, 28, 0.08);
  margin-bottom: 14px;
}

.daily-notes__header {
  margin-bottom: 12px;
}

.daily-notes__title {
  margin: 0;
  font-size: clamp(1.05rem, 1.6vw, 1.35rem);
  font-weight: 700;
  color: #2f2227;
}

.daily-notes__subtitle {
  color: #6c5961;
  font-size: 0.9rem;
}

.daily-notes__controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.daily-notes__counter {
  font-size: 0.85rem;
  color: #5f4d55;
}

.daily-notes__quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.daily-list {
  display: grid;
  gap: 10px;
}

.daily-card {
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 14px;
  padding: 12px;
  background: linear-gradient(165deg, #ffffff, #fcf8f9);
}

.daily-card__top {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.daily-card__time {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.74rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  background: #f1e5e9;
  color: #4f2f3a;
  font-weight: 600;
}

.daily-card__name {
  font-size: 1rem;
  color: #2f2227;
}

.daily-card__line {
  margin: 0 0 6px;
  color: #43343b;
  font-size: 0.92rem;
  overflow-wrap: anywhere;
}

.daily-card__important {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(160, 33, 50, 0.2);
  background: linear-gradient(170deg, rgba(253, 239, 242, 0.95), rgba(255, 247, 248, 0.95));
  color: #662331;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.daily-list__empty {
  border: 1px dashed rgba(84, 44, 58, 0.28);
  border-radius: 12px;
  padding: 10px;
  font-size: 0.9rem;
  color: #5f4d55;
  background: rgba(255, 255, 255, 0.66);
}

@media (max-width: 575.98px) {
  .daily-notes__panel {
    padding: 12px;
  }

  .daily-card {
    padding: 10px;
  }

  .daily-card__name {
    font-size: 0.96rem;
  }
}
</style>
