import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib'
import type {
  PriceListCategory,
  PriceListData,
  PriceListItem,
  PriceListSection,
  PriceListSectionKey,
} from './priceListData'

type PriceListPdfAudience = 'operator' | 'client'
export type PriceListPdfVariant = 'operator-basic' | 'client-standard' | 'client-large-text'

type GeneratePriceListPdfOptions = {
  logoUrls?: string[]
  variant?: PriceListPdfVariant
  separateSectionsByPage?: boolean
}

type PageTone = 'generic' | 'treatments' | 'products'

type PdfTheme = {
  ink: ReturnType<typeof rgb>
  inkSoft: ReturnType<typeof rgb>
  accent: ReturnType<typeof rgb>
  accentSoft: ReturnType<typeof rgb>
  paper: ReturnType<typeof rgb>
  line: ReturnType<typeof rgb>
  muted: ReturnType<typeof rgb>
  danger: ReturnType<typeof rgb>
}

type PdfContext = {
  pdfDoc: PDFDocument
  regularFont: PDFFont
  boldFont: PDFFont
  italicFont: PDFFont
  logoImage: PDFImage | null
  theme: PdfTheme
  generatedDateLabel: string
  audience: PriceListPdfAudience
  showItemSubtitle: boolean
  showItemDescription: boolean
  showItemAvailabilityNote: boolean
  contentScale: number
}

type PageState = {
  page: PDFPage
  cursorY: number
  tone: PageTone
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const PAGE_MARGIN_X = 44
const HEADER_HEIGHT = 72
const FOOTER_HEIGHT = 34
const CONTENT_TOP = PAGE_HEIGHT - HEADER_HEIGHT - 18
const CONTENT_BOTTOM = FOOTER_HEIGHT + 20
const CONTENT_WIDTH = PAGE_WIDTH - (PAGE_MARGIN_X * 2)
const PRICE_COLUMN_WIDTH = 104
const DEFAULT_LOGO_URLS = ['/img/logo/logo.png', '/img/logo/logo-bk.png']

const THEME: PdfTheme = {
  ink: rgb(0.329, 0.173, 0.227),
  inkSoft: rgb(0.412, 0.25, 0.302),
  accent: rgb(0.91, 0.702, 0.745),
  accentSoft: rgb(0.968, 0.928, 0.937),
  paper: rgb(0.995, 0.989, 0.992),
  line: rgb(0.87, 0.79, 0.822),
  muted: rgb(0.435, 0.355, 0.392),
  danger: rgb(0.63, 0.24, 0.3),
}

const THEME_MONO: PdfTheme = {
  ink: rgb(0.1, 0.1, 0.1),
  inkSoft: rgb(0.23, 0.23, 0.23),
  accent: rgb(0.76, 0.76, 0.76),
  accentSoft: rgb(0.93, 0.93, 0.93),
  paper: rgb(1, 1, 1),
  line: rgb(0.72, 0.72, 0.72),
  muted: rgb(0.36, 0.36, 0.36),
  danger: rgb(0.22, 0.22, 0.22),
}

type PdfVariantConfig = {
  variant: PriceListPdfVariant
  audience: PriceListPdfAudience
  theme: PdfTheme
  showItemSubtitle: boolean
  showItemDescription: boolean
  showItemAvailabilityNote: boolean
  contentScale: number
}

function resolveVariantConfig(variant: PriceListPdfVariant): PdfVariantConfig {
  if (variant === 'operator-basic') {
    return {
      variant,
      audience: 'operator',
      theme: THEME_MONO,
      showItemSubtitle: false,
      showItemDescription: false,
      showItemAvailabilityNote: false,
      contentScale: 1,
    }
  }

  if (variant === 'client-large-text') {
    return {
      variant,
      audience: 'client',
      theme: THEME,
      showItemSubtitle: true,
      showItemDescription: true,
      showItemAvailabilityNote: true,
      contentScale: 1.5,
    }
  }

  return {
    variant,
    audience: 'client',
    theme: THEME,
    showItemSubtitle: true,
    showItemDescription: true,
    showItemAvailabilityNote: true,
    contentScale: 1,
  }
}

function toIsoDateSafe(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString()
  }
  return parsed.toISOString()
}

function formatDisplayDate(isoValue: string): string {
  const date = new Date(toIsoDateSafe(isoValue))
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

function sanitizePdfText(value: unknown, font: PDFFont): string {
  const normalized = String(value ?? '')
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')

  let output = ''
  for (const char of normalized) {
    if (char === '\n' || char === '\r' || char === '\t') {
      output += ' '
      continue
    }

    try {
      font.widthOfTextAtSize(char, 12)
      output += char
    } catch {
      const codePoint = char.codePointAt(0) ?? 0
      const isCombiningMark = codePoint >= 0x0300 && codePoint <= 0x036F
      output += isCombiningMark ? '' : ' '
    }
  }

  return output.replace(/\s+/g, ' ').trim()
}

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const normalized = sanitizePdfText(text, font)
  if (!normalized) {
    return []
  }

  const lines: string[] = []
  const words = normalized.split(' ')
  let currentLine = ''

  function flushCurrentLine() {
    if (currentLine.trim()) {
      lines.push(currentLine.trim())
      currentLine = ''
    }
  }

  for (const word of words) {
    const candidateLine = currentLine ? `${currentLine} ${word}` : word
    if (font.widthOfTextAtSize(candidateLine, fontSize) <= maxWidth) {
      currentLine = candidateLine
      continue
    }

    if (currentLine) {
      flushCurrentLine()
    }

    if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
      currentLine = word
      continue
    }

    let chunk = ''
    for (const char of word) {
      const candidateChunk = `${chunk}${char}`
      if (font.widthOfTextAtSize(candidateChunk, fontSize) <= maxWidth) {
        chunk = candidateChunk
        continue
      }

      if (chunk) {
        lines.push(chunk)
      }
      chunk = char
    }
    currentLine = chunk
  }

  flushCurrentLine()
  return lines
}

function scaleValue(context: PdfContext, baseSize: number): number {
  return baseSize * context.contentScale
}

function resolveToneFromSectionKey(sectionKey: PriceListSectionKey): PageTone {
  if (sectionKey === 'treatments') return 'treatments'
  if (sectionKey === 'products') return 'products'
  return 'generic'
}

function resolveClientPageSubtitle(tone: PageTone): string {
  if (tone === 'treatments') {
    return 'Trattamenti personalizzati per il tuo percorso di benessere'
  }
  if (tone === 'products') {
    return 'Prodotti selezionati per prenderti cura della pelle ogni giorno'
  }
  return 'Beauty experience firmata CNC Beauty'
}

async function loadLogoBytes(urls: readonly string[]): Promise<Uint8Array | null> {
  for (const url of urls) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        continue
      }
      const buffer = await response.arrayBuffer()
      if (buffer.byteLength > 0) {
        return new Uint8Array(buffer)
      }
    } catch {
      continue
    }
  }
  return null
}

async function embedLogo(pdfDoc: PDFDocument, logoUrls: readonly string[]): Promise<PDFImage | null> {
  const logoBytes = await loadLogoBytes(logoUrls)
  if (!logoBytes) {
    return null
  }

  try {
    return await pdfDoc.embedPng(logoBytes)
  } catch {
    try {
      return await pdfDoc.embedJpg(logoBytes)
    } catch {
      return null
    }
  }
}

function drawLogo(page: PDFPage, logoImage: PDFImage | null, x: number, yTop: number, maxWidth: number, maxHeight: number) {
  if (!logoImage) {
    return
  }

  const scale = Math.min(maxWidth / logoImage.width, maxHeight / logoImage.height)
  const drawWidth = logoImage.width * scale
  const drawHeight = logoImage.height * scale
  const drawX = x + ((maxWidth - drawWidth) / 2)
  const drawY = yTop - drawHeight

  page.drawImage(logoImage, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
    opacity: 0.98,
  })
}

function drawPageScaffold(page: PDFPage, context: PdfContext, pageNumber: number, tone: PageTone) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: context.theme.paper,
  })

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - HEADER_HEIGHT,
    width: PAGE_WIDTH,
    height: HEADER_HEIGHT,
    color: context.theme.accentSoft,
  })

  page.drawRectangle({
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - HEADER_HEIGHT + 14,
    width: CONTENT_WIDTH,
    height: 1,
    color: context.theme.line,
  })

  drawLogo(page, context.logoImage, PAGE_MARGIN_X, PAGE_HEIGHT - 16, 98, 42)

  if (context.audience === 'client') {
    page.drawText('CNC BEAUTY', {
      x: PAGE_MARGIN_X + 108,
      y: PAGE_HEIGHT - 37,
      size: 11,
      font: context.boldFont,
      color: context.theme.ink,
    })

    page.drawText(resolveClientPageSubtitle(tone), {
      x: PAGE_MARGIN_X + 108,
      y: PAGE_HEIGHT - 51,
      size: 8.5,
      font: context.regularFont,
      color: context.theme.muted,
    })
  } else {
    page.drawText('LISTINO UFFICIALE CNC BEAUTY', {
      x: PAGE_MARGIN_X + 108,
      y: PAGE_HEIGHT - 37,
      size: 10,
      font: context.boldFont,
      color: context.theme.ink,
    })

    page.drawText('Trattamenti e prodotti professionali', {
      x: PAGE_MARGIN_X + 108,
      y: PAGE_HEIGHT - 51,
      size: 8.5,
      font: context.regularFont,
      color: context.theme.muted,
    })
  }

  const pageLabel = `Pag. ${pageNumber}`
  const pageLabelWidth = context.boldFont.widthOfTextAtSize(pageLabel, 9)
  page.drawText(pageLabel, {
    x: PAGE_MARGIN_X + CONTENT_WIDTH - pageLabelWidth,
    y: PAGE_HEIGHT - 38,
    size: 9,
    font: context.boldFont,
    color: context.theme.inkSoft,
  })

  page.drawRectangle({
    x: PAGE_MARGIN_X,
    y: FOOTER_HEIGHT + 8,
    width: CONTENT_WIDTH,
    height: 0.9,
    color: context.theme.line,
  })

  page.drawText(`Documento generato il ${context.generatedDateLabel}`, {
    x: PAGE_MARGIN_X,
    y: 20,
    size: 8,
    font: context.regularFont,
    color: context.theme.muted,
  })
}

function drawOperatorCoverPage(
  page: PDFPage,
  context: PdfContext,
  data: PriceListData,
  treatmentSection: PriceListSection | undefined,
  productSection: PriceListSection | undefined,
) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: context.theme.paper,
  })

  page.drawEllipse({
    x: PAGE_WIDTH - 68,
    y: PAGE_HEIGHT - 108,
    xScale: 170,
    yScale: 118,
    color: context.theme.accent,
    opacity: 0.26,
  })

  page.drawEllipse({
    x: 56,
    y: 112,
    xScale: 148,
    yScale: 94,
    color: context.theme.accent,
    opacity: 0.2,
  })

  page.drawRectangle({
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 270,
    width: CONTENT_WIDTH,
    height: 2,
    color: context.theme.line,
  })

  drawLogo(page, context.logoImage, PAGE_MARGIN_X, PAGE_HEIGHT - 54, CONTENT_WIDTH, 90)

  page.drawText('Listino Prezzi', {
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 328,
    size: 34,
    font: context.boldFont,
    color: context.theme.ink,
  })

  page.drawText('Trattamenti e prodotti', {
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 362,
    size: 20,
    font: context.regularFont,
    color: context.theme.inkSoft,
  })

  page.drawText('Documento commerciale ufficiale', {
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 388,
    size: 11,
    font: context.regularFont,
    color: context.theme.muted,
  })

  const generatedLine = `Aggiornato il ${context.generatedDateLabel}`
  page.drawText(generatedLine, {
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 415,
    size: 10,
    font: context.boldFont,
    color: context.theme.inkSoft,
  })

  const cardsTop = PAGE_HEIGHT - 500
  const cardGap = 12
  const cardWidth = (CONTENT_WIDTH - (cardGap * 2)) / 3
  const cardHeight = 94

  const summaryCards = [
    { label: 'Trattamenti', value: String(treatmentSection?.totalItems ?? 0) },
    { label: 'Prodotti', value: String(productSection?.totalItems ?? 0) },
    { label: 'Totale voci', value: String(data.totalItems) },
  ]

  summaryCards.forEach((card, index) => {
    const x = PAGE_MARGIN_X + (index * (cardWidth + cardGap))
    page.drawRectangle({
      x,
      y: cardsTop,
      width: cardWidth,
      height: cardHeight,
      color: rgb(1, 1, 1),
      borderColor: context.theme.line,
      borderWidth: 1,
    })

    page.drawText(card.label.toUpperCase(), {
      x: x + 12,
      y: cardsTop + cardHeight - 24,
      size: 8,
      font: context.boldFont,
      color: context.theme.muted,
    })

    page.drawText(card.value, {
      x: x + 12,
      y: cardsTop + 28,
      size: 26,
      font: context.boldFont,
      color: context.theme.ink,
    })
  })

  const noteText = 'Listino indicativo per uso interno/consulenziale. I prezzi possono essere aggiornati in base a promozioni e personalizzazioni.'
  const noteLines = wrapText(noteText, CONTENT_WIDTH, context.regularFont, 9)
  let noteY = 198
  for (const line of noteLines) {
    page.drawText(line, {
      x: PAGE_MARGIN_X,
      y: noteY,
      size: 9,
      font: context.regularFont,
      color: context.theme.muted,
    })
    noteY -= 12
  }

  page.drawText('CNC Beauty', {
    x: PAGE_MARGIN_X,
    y: 64,
    size: 13,
    font: context.boldFont,
    color: context.theme.ink,
  })

  page.drawText('Benessere avanzato, cura personalizzata', {
    x: PAGE_MARGIN_X,
    y: 48,
    size: 9,
    font: context.regularFont,
    color: context.theme.muted,
  })
}

function drawClientCoverPage(page: PDFPage, context: PdfContext) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: context.theme.paper,
  })

  page.drawEllipse({
    x: PAGE_WIDTH - 68,
    y: PAGE_HEIGHT - 108,
    xScale: 170,
    yScale: 118,
    color: context.theme.accent,
    opacity: 0.26,
  })

  page.drawEllipse({
    x: 56,
    y: 112,
    xScale: 148,
    yScale: 94,
    color: context.theme.accent,
    opacity: 0.2,
  })

  page.drawRectangle({
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 270,
    width: CONTENT_WIDTH,
    height: 2,
    color: context.theme.line,
  })

  drawLogo(page, context.logoImage, PAGE_MARGIN_X, PAGE_HEIGHT - 54, CONTENT_WIDTH, 90)

  page.drawText('Trattamenti e prodotti', {
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 332,
    size: 37,
    font: context.boldFont,
    color: context.theme.ink,
  })

  const subtitleOne = 'Benessere professionale pensato su misura per te'
  const subtitleTwo = 'Scopri percorsi e soluzioni selezionate firmate CNC Beauty'

  page.drawText(subtitleOne, {
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 372,
    size: 13,
    font: context.regularFont,
    color: context.theme.inkSoft,
  })

  page.drawText(subtitleTwo, {
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 392,
    size: 11,
    font: context.regularFont,
    color: context.theme.muted,
  })

  page.drawText('CNC Beauty', {
    x: PAGE_MARGIN_X,
    y: 66,
    size: 14,
    font: context.boldFont,
    color: context.theme.ink,
  })

  page.drawText('La tua esperienza beauty inizia da qui', {
    x: PAGE_MARGIN_X,
    y: 48,
    size: 9,
    font: context.regularFont,
    color: context.theme.muted,
  })
}

function createContentPage(context: PdfContext, pageNumber: number, tone: PageTone): PageState {
  const page = context.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawPageScaffold(page, context, pageNumber, tone)
  return {
    page,
    cursorY: CONTENT_TOP,
    tone,
  }
}

function ensureSpace(
  state: PageState,
  requiredHeight: number,
  context: PdfContext,
  pageCounter: { value: number },
): PageState {
  if ((state.cursorY - requiredHeight) >= CONTENT_BOTTOM) {
    return state
  }

  pageCounter.value += 1
  return createContentPage(context, pageCounter.value, state.tone)
}

function drawSectionHeader(
  state: PageState,
  section: PriceListSection,
  context: PdfContext,
  pageCounter: { value: number },
): PageState {
  const titleSize = scaleValue(context, 14)
  const descriptionSize = scaleValue(context, 9.5)
  const descriptionLineHeight = scaleValue(context, 12)
  const panelHeight = Math.max(56, scaleValue(context, 56))
  const headerNeededHeight = panelHeight + scaleValue(context, 30)
  let nextState = ensureSpace(state, headerNeededHeight, context, pageCounter)

  nextState.page.drawRectangle({
    x: PAGE_MARGIN_X,
    y: nextState.cursorY - panelHeight,
    width: CONTENT_WIDTH,
    height: panelHeight,
    color: context.theme.accentSoft,
    borderColor: context.theme.line,
    borderWidth: 1,
  })

  nextState.page.drawText(section.title.toUpperCase(), {
    x: PAGE_MARGIN_X + 14,
    y: nextState.cursorY - scaleValue(context, 22),
    size: titleSize,
    font: context.boldFont,
    color: context.theme.ink,
  })

  const descriptionLines = wrapText(section.description, CONTENT_WIDTH - 28, context.regularFont, descriptionSize).slice(0, 2)
  let descriptionY = nextState.cursorY - scaleValue(context, 38)
  for (const line of descriptionLines) {
    nextState.page.drawText(line, {
      x: PAGE_MARGIN_X + 14,
      y: descriptionY,
      size: descriptionSize,
      font: context.regularFont,
      color: context.theme.muted,
    })
    descriptionY -= descriptionLineHeight
  }

  nextState.cursorY -= panelHeight + scaleValue(context, 14)
  return nextState
}

function drawCategoryHeader(
  state: PageState,
  category: PriceListCategory,
  context: PdfContext,
  pageCounter: { value: number },
): PageState {
  const titleSize = scaleValue(context, 10.5)
  const metaSize = scaleValue(context, 8.5)
  const barHeight = Math.max(22, scaleValue(context, 22))
  const requiredHeight = barHeight + scaleValue(context, 22)
  let nextState = ensureSpace(state, requiredHeight, context, pageCounter)

  nextState.page.drawRectangle({
    x: PAGE_MARGIN_X,
    y: nextState.cursorY - barHeight,
    width: CONTENT_WIDTH,
    height: barHeight,
    color: context.theme.accent,
    opacity: 0.45,
  })

  const categoryTitle = sanitizePdfText(category.title, context.boldFont) || 'Categoria'
  nextState.page.drawText(categoryTitle, {
    x: PAGE_MARGIN_X + 12,
    y: nextState.cursorY - (barHeight - scaleValue(context, 7)),
    size: titleSize,
    font: context.boldFont,
    color: context.theme.ink,
  })

  const countLabel = `${category.items.length} voci`
  const countLabelWidth = context.regularFont.widthOfTextAtSize(countLabel, metaSize)
  nextState.page.drawText(countLabel, {
    x: PAGE_MARGIN_X + CONTENT_WIDTH - 12 - countLabelWidth,
    y: nextState.cursorY - (barHeight - scaleValue(context, 7)),
    size: metaSize,
    font: context.regularFont,
    color: context.theme.inkSoft,
  })

  nextState.cursorY -= barHeight + scaleValue(context, 8)
  return nextState
}

function measureRowHeight(item: PriceListItem, context: PdfContext) {
  const textMaxWidth = CONTENT_WIDTH - 24 - PRICE_COLUMN_WIDTH
  const titleSize = scaleValue(context, 10.5)
  const subtitleSize = scaleValue(context, 8.5)
  const descriptionSize = scaleValue(context, 7.6)
  const noteSize = scaleValue(context, 8)
  const titleLineHeight = scaleValue(context, 12)
  const subtitleLineHeight = scaleValue(context, 10)
  const descriptionLineHeight = scaleValue(context, 9)
  const noteLineHeight = scaleValue(context, 9)
  const titleLines = wrapText(item.title, textMaxWidth, context.boldFont, titleSize).slice(0, 2)
  const subtitleLines = context.showItemSubtitle && item.subtitle
    ? wrapText(item.subtitle, textMaxWidth, context.regularFont, subtitleSize).slice(0, 2)
    : []
  const descriptionLines = context.showItemDescription && item.description
    ? wrapText(item.description, textMaxWidth, context.regularFont, descriptionSize).slice(0, 2)
    : []
  const disabledLines = context.showItemAvailabilityNote && item.storeDisabledReason
    ? wrapText(`Non disponibile: ${item.storeDisabledReason}`, textMaxWidth, context.italicFont, noteSize)
    : []

  const titleHeight = titleLines.length * titleLineHeight
  const subtitleHeight = subtitleLines.length * subtitleLineHeight
  const descriptionHeight = descriptionLines.length * descriptionLineHeight
  const disabledHeight = disabledLines.length * noteLineHeight
  const innerHeight = titleHeight + subtitleHeight + descriptionHeight + disabledHeight

  return {
    height: Math.max(scaleValue(context, 36), innerHeight + scaleValue(context, 16)),
    titleSize,
    subtitleSize,
    descriptionSize,
    noteSize,
    titleLineHeight,
    subtitleLineHeight,
    descriptionLineHeight,
    noteLineHeight,
    titleLines,
    subtitleLines,
    descriptionLines,
    disabledLines,
  }
}

function drawItemRow(
  state: PageState,
  item: PriceListItem,
  context: PdfContext,
  pageCounter: { value: number },
): PageState {
  const rowMeta = measureRowHeight(item, context)
  let nextState = ensureSpace(state, rowMeta.height + scaleValue(context, 8), context, pageCounter)
  const rowTop = nextState.cursorY
  const rowBottom = rowTop - rowMeta.height
  const rowX = PAGE_MARGIN_X
  const rowInnerX = rowX + 10
  const dividerX = rowX + CONTENT_WIDTH - PRICE_COLUMN_WIDTH

  nextState.page.drawRectangle({
    x: rowX,
    y: rowBottom,
    width: CONTENT_WIDTH,
    height: rowMeta.height,
    color: rgb(1, 1, 1),
    borderColor: context.theme.line,
    borderWidth: 0.9,
  })

  nextState.page.drawRectangle({
    x: dividerX,
    y: rowBottom,
    width: 0.8,
    height: rowMeta.height,
    color: context.theme.line,
  })

  let textY = rowTop - scaleValue(context, 14)
  for (const line of rowMeta.titleLines) {
    nextState.page.drawText(line, {
      x: rowInnerX,
      y: textY,
      size: rowMeta.titleSize,
      font: context.boldFont,
      color: context.theme.ink,
    })
    textY -= rowMeta.titleLineHeight
  }

  for (const line of rowMeta.subtitleLines) {
    nextState.page.drawText(line, {
      x: rowInnerX,
      y: textY,
      size: rowMeta.subtitleSize,
      font: context.regularFont,
      color: context.theme.muted,
    })
    textY -= rowMeta.subtitleLineHeight
  }

  for (const line of rowMeta.descriptionLines) {
    nextState.page.drawText(line, {
      x: rowInnerX,
      y: textY,
      size: rowMeta.descriptionSize,
      font: context.regularFont,
      color: context.theme.muted,
    })
    textY -= rowMeta.descriptionLineHeight
  }

  for (const line of rowMeta.disabledLines) {
    nextState.page.drawText(line, {
      x: rowInnerX,
      y: textY,
      size: rowMeta.noteSize,
      font: context.italicFont,
      color: context.theme.danger,
    })
    textY -= rowMeta.noteLineHeight
  }

  const priceSize = scaleValue(context, 11)
  const priceWidth = context.boldFont.widthOfTextAtSize(item.formattedPrice, priceSize)
  nextState.page.drawText(item.formattedPrice, {
    x: rowX + CONTENT_WIDTH - 12 - priceWidth,
    y: rowTop - scaleValue(context, 16),
    size: priceSize,
    font: context.boldFont,
    color: context.theme.ink,
  })

  nextState.cursorY = rowBottom - scaleValue(context, 8)
  return nextState
}

function drawEmptyCategoryState(
  state: PageState,
  context: PdfContext,
  pageCounter: { value: number },
): PageState {
  const boxHeight = Math.max(28, scaleValue(context, 28))
  const messageSize = scaleValue(context, 9)
  const nextState = ensureSpace(state, boxHeight + scaleValue(context, 8), context, pageCounter)
  nextState.page.drawRectangle({
    x: PAGE_MARGIN_X,
    y: nextState.cursorY - boxHeight,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: rgb(1, 1, 1),
    borderColor: context.theme.line,
    borderWidth: 0.9,
  })

  nextState.page.drawText('Nessuna voce disponibile al momento.', {
    x: PAGE_MARGIN_X + 12,
    y: nextState.cursorY - (boxHeight - scaleValue(context, 10)),
    size: messageSize,
    font: context.regularFont,
    color: context.theme.muted,
  })

  nextState.cursorY -= boxHeight + scaleValue(context, 8)
  return nextState
}

function drawSection(
  state: PageState,
  section: PriceListSection,
  context: PdfContext,
  pageCounter: { value: number },
): PageState {
  let nextState = drawSectionHeader(state, section, context, pageCounter)
  if (!section.categories.length) {
    nextState = drawEmptyCategoryState(nextState, context, pageCounter)
    nextState.cursorY -= 10
    return nextState
  }

  for (const category of section.categories) {
    nextState = drawCategoryHeader(nextState, category, context, pageCounter)
    for (const item of category.items) {
      nextState = drawItemRow(nextState, item, context, pageCounter)
    }
    nextState.cursorY -= 8
  }

  return nextState
}

export async function generatePriceListPdf(data: PriceListData, options?: GeneratePriceListPdfOptions): Promise<Uint8Array> {
  const variant = options?.variant ?? 'client-standard'
  const variantConfig = resolveVariantConfig(variant)
  const separateSectionsByPage = options?.separateSectionsByPage ?? true

  const pdfDoc = await PDFDocument.create()
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  const generatedDateLabel = formatDisplayDate(data.generatedAtIso)
  const logoImage = await embedLogo(pdfDoc, options?.logoUrls ?? DEFAULT_LOGO_URLS)
  const context: PdfContext = {
    pdfDoc,
    regularFont,
    boldFont,
    italicFont,
    logoImage,
    theme: variantConfig.theme,
    generatedDateLabel,
    audience: variantConfig.audience,
    showItemSubtitle: variantConfig.showItemSubtitle,
    showItemDescription: variantConfig.showItemDescription,
    showItemAvailabilityNote: variantConfig.showItemAvailabilityNote,
    contentScale: variantConfig.contentScale,
  }

  const creationDate = new Date(toIsoDateSafe(data.generatedAtIso))
  const title = variantConfig.audience === 'client'
    ? 'Trattamenti e prodotti CNC Beauty'
    : 'Listino Prezzi Operatore CNC Beauty'
  pdfDoc.setTitle(title)
  pdfDoc.setAuthor('CNC Beauty')
  pdfDoc.setSubject('Listino trattamenti e prodotti')
  pdfDoc.setKeywords(['listino', 'prezzi', 'trattamenti', 'prodotti', 'cnc beauty'])
  pdfDoc.setCreationDate(creationDate)
  pdfDoc.setModificationDate(new Date())
  pdfDoc.setProducer('CNC Beauty App')
  pdfDoc.setCreator('CNC Beauty App')

  const treatmentSection = data.sections.find((section) => section.key === 'treatments')
  const productSection = data.sections.find((section) => section.key === 'products')

  const coverPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  if (variantConfig.audience === 'client') {
    drawClientCoverPage(coverPage, context)
  } else {
    drawOperatorCoverPage(coverPage, context, data, treatmentSection, productSection)
  }

  const pageCounter = { value: 1 }
  let state: PageState | null = null

  for (const [index, section] of data.sections.entries()) {
    const sectionTone = resolveToneFromSectionKey(section.key)
    const mustStartNewPage = !state || (index > 0 && separateSectionsByPage) || state.tone !== sectionTone
    if (mustStartNewPage) {
      pageCounter.value += 1
      state = createContentPage(context, pageCounter.value, sectionTone)
    }

    if (!state) {
      continue
    }

    state = drawSection(state, section, context, pageCounter)
  }

  const bytes = await pdfDoc.save()
  return Uint8Array.from(bytes)
}
