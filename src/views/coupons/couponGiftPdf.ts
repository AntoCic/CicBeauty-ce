import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import type { AppConfigData } from '../../models/AppConfig'
import type { Coupon } from '../../models/Coupon'
import { asDate } from '../../utils/date'
import { resolveCouponContactInfo } from '../../utils/couponUtils'

type CouponGiftLike = Pick<Coupon, 'code' | 'from' | 'note' | 'valid_from' | 'valid_to'>

export type CouponGiftPdfInput = {
  coupon: CouponGiftLike
  clientLabel: string
  treatmentLabels: string[]
  appConfig: AppConfigData
}

const PAGE_WIDTH = 842
const PAGE_HEIGHT = 595

async function fetchBytes(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Impossibile caricare asset PDF: ${url}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

async function embedImage(pdfDoc: PDFDocument, urls: string[]) {
  for (const url of urls) {
    try {
      const bytes = await fetchBytes(url)
      if (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')) {
        return await pdfDoc.embedJpg(bytes)
      }
      return await pdfDoc.embedPng(bytes)
    } catch (error) {
      continue
    }
  }
  return null
}

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function formatDate(value: unknown) {
  const date = asDate(value)
  if (!date) return '-'
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function splitByWords(text: string, font: PDFFont, size: number, maxWidth: number) {
  const tokens = text.split(/\s+/).filter(Boolean)
  if (!tokens.length) return []
  const rows: string[] = []
  let current = ''

  for (const token of tokens) {
    const candidate = current ? `${current} ${token}` : token
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
      continue
    }
    if (current) rows.push(current)
    current = token
  }

  if (current) rows.push(current)
  return rows
}

function drawWrapped(
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  maxWidth: number,
  lineHeight: number,
  draw: (line: string, x: number, y: number, size: number, font: PDFFont) => void,
) {
  const lines = splitByWords(text, font, size, maxWidth)
  lines.forEach((line, index) => {
    draw(line, x, y - index * lineHeight, size, font)
  })
  return y - lines.length * lineHeight
}

export async function generateCouponGiftPdf(input: CouponGiftPdfInput) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const bgImage = await embedImage(pdfDoc, ['/img/logo/bg-pattern.png'])
  const logoImage = await embedImage(pdfDoc, ['/img/logo/logo.png', '/img/logo/logo-bk.png'])

  if (bgImage) {
    page.drawImage(bgImage, {
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      opacity: 0.15,
    })
  }

  page.drawRectangle({
    x: 36,
    y: 36,
    width: PAGE_WIDTH - 72,
    height: PAGE_HEIGHT - 72,
    color: rgb(1, 1, 1),
    opacity: 0.92,
    borderColor: rgb(0.75, 0.63, 0.68),
    borderWidth: 2,
  })

  const boxX = 120
  const boxY = 95
  const boxWidth = PAGE_WIDTH - boxX * 2
  const boxHeight = PAGE_HEIGHT - boxY * 2

  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    color: rgb(1, 1, 1),
    opacity: 0.97,
    borderColor: rgb(0.49, 0.27, 0.35),
    borderWidth: 1.5,
  })

  let cursorY = boxY + boxHeight - 40

  if (logoImage) {
    const logoWidth = 120
    const ratio = logoImage.height / logoImage.width
    const logoHeight = logoWidth * ratio
    page.drawImage(logoImage, {
      x: PAGE_WIDTH / 2 - logoWidth / 2,
      y: cursorY - logoHeight,
      width: logoWidth,
      height: logoHeight,
    })
    cursorY -= logoHeight + 20
  }

  page.drawText('BUONO REGALO', {
    x: boxX + 42,
    y: cursorY,
    font: bold,
    size: 24,
    color: rgb(0.36, 0.19, 0.27),
  })

  cursorY -= 26
  page.drawText('Un pensiero speciale, creato con cura.', {
    x: boxX + 42,
    y: cursorY,
    font: italic,
    size: 13,
    color: rgb(0.45, 0.35, 0.39),
  })

  cursorY -= 28
  page.drawRectangle({
    x: boxX + 42,
    y: cursorY,
    width: boxWidth - 84,
    height: 1,
    color: rgb(0.86, 0.78, 0.82),
  })
  cursorY -= 20

  const rowLeft = boxX + 42
  const rowRight = boxX + boxWidth - 42
  const halfWidth = (boxWidth - 84) / 2

  page.drawText(`Codice: ${normalizeString(input.coupon.code)}`, {
    x: rowLeft,
    y: cursorY,
    font: bold,
    size: 12,
    color: rgb(0.2, 0.2, 0.24),
  })
  page.drawText(`Da: ${normalizeString(input.coupon.from)}`, {
    x: rowLeft + halfWidth,
    y: cursorY,
    font: regular,
    size: 12,
    color: rgb(0.2, 0.2, 0.24),
  })

  cursorY -= 18
  page.drawText(`Per: ${normalizeString(input.clientLabel) || 'Cliente CNC Beauty'}`, {
    x: rowLeft,
    y: cursorY,
    font: regular,
    size: 12,
    color: rgb(0.2, 0.2, 0.24),
  })

  page.drawText(`Validita: ${formatDate(input.coupon.valid_from)} - ${formatDate(input.coupon.valid_to)}`, {
    x: rowLeft + halfWidth,
    y: cursorY,
    font: regular,
    size: 12,
    color: rgb(0.2, 0.2, 0.24),
  })

  cursorY -= 24
  page.drawText('Trattamenti inclusi', {
    x: rowLeft,
    y: cursorY,
    font: bold,
    size: 13,
    color: rgb(0.36, 0.19, 0.27),
  })

  const treatmentText = input.treatmentLabels.length
    ? input.treatmentLabels.map((label) => `- ${label}`).join('   ')
    : '- Nessun trattamento selezionato'
  cursorY = drawWrapped(
    treatmentText,
    rowLeft,
    cursorY - 18,
    regular,
    11,
    boxWidth - 84,
    14,
    (line, x, y, size, font) => {
      page.drawText(line, {
        x,
        y,
        font,
        size,
        color: rgb(0.24, 0.24, 0.28),
      })
    },
  )

  const note = normalizeString(input.coupon.note)
  if (note) {
    cursorY -= 10
    page.drawText('Messaggio', {
      x: rowLeft,
      y: cursorY,
      font: bold,
      size: 12,
      color: rgb(0.36, 0.19, 0.27),
    })
    cursorY = drawWrapped(
      note,
      rowLeft,
      cursorY - 16,
      regular,
      10.5,
      boxWidth - 84,
      13.5,
      (line, x, y, size, font) => {
        page.drawText(line, {
          x,
          y,
          font,
          size,
          color: rgb(0.26, 0.26, 0.3),
        })
      },
    )
  }

  const contact = resolveCouponContactInfo(input.appConfig)
  const footerY = boxY + 34
  page.drawRectangle({
    x: rowLeft,
    y: footerY + 22,
    width: rowRight - rowLeft,
    height: 1,
    color: rgb(0.9, 0.85, 0.87),
  })
  page.drawText(contact.ownerName, {
    x: rowLeft,
    y: footerY + 8,
    font: bold,
    size: 11.5,
    color: rgb(0.2, 0.2, 0.24),
  })
  page.drawText(contact.officeAddress, {
    x: rowLeft,
    y: footerY - 6,
    font: regular,
    size: 10,
    color: rgb(0.35, 0.35, 0.39),
  })
  page.drawText(`Tel. ${contact.publicPhone}`, {
    x: rowLeft,
    y: footerY - 20,
    font: regular,
    size: 10,
    color: rgb(0.35, 0.35, 0.39),
  })
  page.drawText('Utilizzabile una sola volta', {
    x: rowRight - bold.widthOfTextAtSize('Utilizzabile una sola volta', 10),
    y: footerY - 20,
    font: bold,
    size: 10,
    color: rgb(0.42, 0.15, 0.24),
  })

  pdfDoc.setTitle(`Coupon regalo ${normalizeString(input.coupon.code)}`)
  pdfDoc.setAuthor(resolveCouponContactInfo(input.appConfig).ownerName)
  pdfDoc.setSubject('Coupon regalo CNC Beauty')
  pdfDoc.setKeywords(['coupon', 'regalo', 'cnc beauty'])

  const bytes = await pdfDoc.save()
  return Uint8Array.from(bytes)
}

export async function downloadCouponGiftPdf(input: CouponGiftPdfInput, filenameBase?: string) {
  const pdfBytes = await generateCouponGiftPdf(input)
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const code = normalizeString(input.coupon.code).toLowerCase().replace(/[^a-z0-9-]+/g, '-')
  const fallbackBase = code || 'coupon-regalo'
  anchor.href = url
  anchor.download = `${filenameBase || fallbackBase}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.setTimeout(() => URL.revokeObjectURL(url), 1200)
}
