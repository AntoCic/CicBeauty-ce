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

function drawCenteredText(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  font: PDFFont,
  size: number,
  centerX: number,
  y: number,
  color: { r: number; g: number; b: number },
) {
  const width = font.widthOfTextAtSize(text, size)
  page.drawText(text, {
    x: centerX - width / 2,
    y,
    font,
    size,
    color: rgb(color.r, color.g, color.b),
  })
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
    const bgBleed = 120
    const bgScale = Math.max((PAGE_WIDTH + bgBleed * 2) / bgImage.width, (PAGE_HEIGHT + bgBleed * 2) / bgImage.height)
    const bgWidth = bgImage.width * bgScale
    const bgHeight = bgImage.height * bgScale
    const bgX = (PAGE_WIDTH - bgWidth) / 2
    const bgY = (PAGE_HEIGHT - bgHeight) / 2
    page.drawImage(bgImage, {
      x: bgX,
      y: bgY,
      width: bgWidth,
      height: bgHeight,
      opacity: 1,
    })
  }

  const cardWidth = 620
  const cardHeight = 430
  const cardX = (PAGE_WIDTH - cardWidth) / 2
  const cardY = (PAGE_HEIGHT - cardHeight) / 2

  page.drawRectangle({
    x: cardX + 8,
    y: cardY - 8,
    width: cardWidth,
    height: cardHeight,
    color: rgb(0.22, 0.15, 0.19),
    opacity: 0.1,
  })

  page.drawRectangle({
    x: cardX + 3,
    y: cardY - 3,
    width: cardWidth,
    height: cardHeight,
    color: rgb(0.22, 0.15, 0.19),
    opacity: 0.06,
  })

  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    color: rgb(1, 1, 1),
    opacity: 0.95,
  })

  const normalizedCode = normalizeString(input.coupon.code) || '-'
  const contentX = cardX + 56
  const contentWidth = cardWidth - 112
  const contentCenterX = contentX + contentWidth / 2
  let cursorY = cardY + cardHeight - 52

  if (logoImage) {
    const logoWidth = 112
    const ratio = logoImage.height / logoImage.width
    const logoHeight = logoWidth * ratio
    page.drawImage(logoImage, {
      x: contentCenterX - logoWidth / 2,
      y: cursorY - logoHeight,
      width: logoWidth,
      height: logoHeight,
    })
    cursorY -= logoHeight + 22
  }

  drawCenteredText(page, 'Buono regalo', bold, 34, contentCenterX, cursorY, { r: 0.34, g: 0.2, b: 0.26 })
  cursorY -= 40

  const recipient = normalizeString(input.clientLabel) || 'persona speciale'
  drawCenteredText(page, `Per ${recipient}`, bold, 17, contentCenterX, cursorY, { r: 0.29, g: 0.2, b: 0.24 })
  cursorY -= 34

  const fromLabel = normalizeString(input.coupon.from) || 'una persona speciale'
  cursorY = drawWrapped(
    `${fromLabel} ha dedicato questo regalo di benessere.`,
    contentX,
    cursorY,
    regular,
    12.6,
    contentWidth,
    18,
    (line, x, y, size, font) => {
      void x
      drawCenteredText(page, line, font, size, contentCenterX, y, { r: 0.36, g: 0.28, b: 0.32 })
    },
  )

  cursorY -= 18
  const treatmentText = input.treatmentLabels.length
    ? input.treatmentLabels.join(', ')
    : 'Percorso personalizzato da definire in sede'
  cursorY = drawWrapped(
    treatmentText,
    contentX,
    cursorY,
    regular,
    12.8,
    contentWidth,
    18.2,
    (line, x, y, size, font) => {
      void x
      drawCenteredText(page, line, font, size, contentCenterX, y, { r: 0.2, g: 0.2, b: 0.24 })
    },
  )

  cursorY -= 16
  drawCenteredText(
    page,
    `Valido dal ${formatDate(input.coupon.valid_from)} al ${formatDate(input.coupon.valid_to)}`,
    regular,
    11.8,
    contentCenterX,
    cursorY,
    { r: 0.4, g: 0.31, b: 0.35 },
  )
  cursorY -= 30

  const note = normalizeString(input.coupon.note)
  if (note) {
    cursorY = drawWrapped(
      `"${note}"`,
      contentX,
      cursorY,
      italic,
      12,
      contentWidth,
      16.2,
      (line, x, y, size, font) => {
        void x
        drawCenteredText(page, line, font, size, contentCenterX, y, { r: 0.44, g: 0.29, b: 0.35 })
      },
    )
    cursorY -= 10
  }

  const contact = resolveCouponContactInfo(input.appConfig)
  const footerY = cardY + 44
  page.drawRectangle({
    x: contentX,
    y: footerY + 20,
    width: contentWidth,
    height: 1,
    color: rgb(0.86, 0.78, 0.82),
  })
  drawCenteredText(page, contact.ownerName, bold, 11.4, contentCenterX, footerY + 6, { r: 0.21, g: 0.2, b: 0.24 })
  drawCenteredText(page, `${contact.officeAddress}  |  ${contact.publicPhone}`, regular, 10.3, contentCenterX, footerY - 10, {
    r: 0.34,
    g: 0.33,
    b: 0.38,
  })

  const codeFooterText = `cod. ${normalizedCode}`
  const codeFooterSize = 8.8
  const codeFooterWidth = regular.widthOfTextAtSize(codeFooterText, codeFooterSize)
  page.drawText(codeFooterText, {
    x: cardX + cardWidth - 24 - codeFooterWidth,
    y: cardY + 18,
    font: regular,
    size: codeFooterSize,
    color: rgb(0.42, 0.3, 0.35),
  })

  pdfDoc.setTitle(`Coupon regalo ${normalizeString(input.coupon.code)}`)
  pdfDoc.setAuthor(contact.ownerName)
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
