<script setup lang="ts">
import { Btn, cicKitStore, toast, useChangeHeader } from 'cic-kit'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { computed, onBeforeUnmount, ref, type ComponentPublicInstance } from 'vue'
import HeaderApp from '../../components/HeaderApp.vue'

type FieldId = 'firstName' | 'lastName'

type PlacementField = {
  id: FieldId
  label: string
  value: string
  x: number
  y: number
  width: number
  height: number
}

type PagePreview = {
  index: number
  width: number
  height: number
  pdfWidth: number
  pdfHeight: number
  imageDataUrl: string
}

type PointerDragState = {
  fieldId: FieldId
  pageIndex: number
  pointerId: number
  offsetX: number
  offsetY: number
}

GlobalWorkerOptions.workerSrc = workerSrc
useChangeHeader('Demo PDF Placement', { name: 'home' })

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())

const originalPdfBytes = ref<Uint8Array | null>(null)
const uploadedPdfName = ref('')
const isLoadingPdf = ref(false)
const isDownloadingPdf = ref(false)

const firstName = ref('')
const lastName = ref('')
const pagePreviews = ref<PagePreview[]>([])
const fieldsByPage = ref<PlacementField[][]>([])
const pageShellRefs = ref<Array<HTMLElement | null>>([])
const pointerDrag = ref<PointerDragState | null>(null)

const hasPdf = computed(() => pagePreviews.value.length > 0)
const hasPlacedFields = computed(() => fieldsByPage.value.some((page) => page.length > 0))

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function pageFields(pageIndex: number) {
  return fieldsByPage.value[pageIndex] ?? []
}

function pageContextAtClientPoint(clientX: number, clientY: number) {
  for (let pageIndex = 0; pageIndex < pageShellRefs.value.length; pageIndex += 1) {
    const shell = pageShellRefs.value[pageIndex]
    const preview = pagePreviews.value[pageIndex]
    if (!shell || !preview) {
      continue
    }

    const rect = shell.getBoundingClientRect()
    const isInside = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    if (!isInside) {
      continue
    }

    return { pageIndex, shell, preview, rect }
  }

  return null
}

function setPageShellRef(pageIndex: number, element: Element | ComponentPublicInstance | null) {
  const resolvedElement = element instanceof Element
    ? element
    : element?.$el instanceof Element
      ? element.$el
      : null
  pageShellRefs.value[pageIndex] = resolvedElement as HTMLElement | null
}

function resetPlacementState() {
  clearPointerTracking()
  pagePreviews.value = []
  fieldsByPage.value = []
  pageShellRefs.value = []
}

async function buildPagePreviews(pdfBytes: Uint8Array) {
  const loadingTask = getDocument({ data: pdfBytes })
  const pdfJsDocument = await loadingTask.promise
  const previews: PagePreview[] = []

  try {
    for (let pageNumber = 1; pageNumber <= pdfJsDocument.numPages; pageNumber += 1) {
      const pdfPage = await pdfJsDocument.getPage(pageNumber)
      const baseViewport = pdfPage.getViewport({ scale: 1 })
      const maxPreviewWidth = 760
      const scale = Math.min(1.7, maxPreviewWidth / baseViewport.width)
      const viewport = pdfPage.getViewport({ scale })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Canvas 2D non disponibile')
      }

      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)

      await pdfPage.render({
        canvasContext: context,
        viewport,
        canvas,
      }).promise

      previews.push({
        index: pageNumber - 1,
        width: canvas.width,
        height: canvas.height,
        pdfWidth: baseViewport.width,
        pdfHeight: baseViewport.height,
        imageDataUrl: canvas.toDataURL('image/png'),
      })
    }
  } finally {
    pdfJsDocument.cleanup()
    void pdfJsDocument.destroy()
  }

  return previews
}

async function onPdfSelected(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) {
    return
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast.error('Carica un file PDF valido')
    return
  }

  isLoadingPdf.value = true
  try {
    const buffer = await file.arrayBuffer()
    const sourceBytes = new Uint8Array(buffer)
    const bytesForPreview = Uint8Array.from(sourceBytes)
    const bytesForEditing = Uint8Array.from(sourceBytes)
    const previews = await buildPagePreviews(bytesForPreview)
    if (!previews.length) {
      throw new Error('Il PDF non contiene pagine')
    }

    originalPdfBytes.value = bytesForEditing
    uploadedPdfName.value = file.name
    pagePreviews.value = previews
    fieldsByPage.value = Array.from({ length: previews.length }, () => [])
    pageShellRefs.value = Array.from({ length: previews.length }, () => null)
    pointerDrag.value = null
    toast.success(`PDF caricato: ${previews.length} pagine`)
  } catch (error) {
    console.error(error)
    originalPdfBytes.value = null
    uploadedPdfName.value = ''
    resetPlacementState()
    toast.error('Errore durante il caricamento del PDF')
  } finally {
    isLoadingPdf.value = false
  }
}

function upsertField(id: FieldId, label: string, value: string, fallbackTop: number) {
  let existingField: PlacementField | null = null
  let existingPageIndex = -1

  for (let pageIndex = 0; pageIndex < fieldsByPage.value.length; pageIndex += 1) {
    const list = fieldsByPage.value[pageIndex]
    if (!list) {
      continue
    }
    const index = list.findIndex((field) => field.id === id)
    if (index >= 0) {
      const [field] = list.splice(index, 1)
      if (!field) {
        continue
      }
      existingField = field
      existingPageIndex = pageIndex
      break
    }
  }

  const nextField: PlacementField = existingField ?? {
    id,
    label,
    value,
    x: 28,
    y: fallbackTop,
    width: 220,
    height: 58,
  }

  nextField.value = value
  nextField.label = label

  const targetPageIndex = existingPageIndex >= 0 ? existingPageIndex : 0
  if (!fieldsByPage.value[targetPageIndex]) {
    fieldsByPage.value[targetPageIndex] = []
  }
  fieldsByPage.value[targetPageIndex].push(nextField)
}

function applyNameFields() {
  if (!hasPdf.value) {
    toast.warning('Carica prima un PDF')
    return
  }

  const normalizedFirstName = firstName.value.trim()
  const normalizedLastName = lastName.value.trim()

  if (!normalizedFirstName || !normalizedLastName) {
    toast.warning('Inserisci nome e cognome')
    return
  }

  upsertField('firstName', 'Nome', normalizedFirstName, 24)
  upsertField('lastName', 'Cognome', normalizedLastName, 96)
  toast.success('Box nome/cognome aggiunti nel PDF')
}

function fieldStyle(field: PlacementField) {
  return {
    left: `${field.x}px`,
    top: `${field.y}px`,
    width: `${field.width}px`,
    minHeight: `${field.height}px`,
  }
}

function findField(pageIndex: number, fieldId: FieldId) {
  return fieldsByPage.value[pageIndex]?.find((field) => field.id === fieldId) ?? null
}

function onFieldPointerDown(event: PointerEvent, pageIndex: number, field: PlacementField) {
  if (event.button !== 0) {
    return
  }
  const shell = pageShellRefs.value[pageIndex]
  if (!shell) {
    return
  }

  event.preventDefault()
  const shellRect = shell.getBoundingClientRect()
  pointerDrag.value = {
    fieldId: field.id,
    pageIndex,
    pointerId: event.pointerId,
    offsetX: event.clientX - shellRect.left - field.x,
    offsetY: event.clientY - shellRect.top - field.y,
  }

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerEnd)
  window.addEventListener('pointercancel', onPointerEnd)
}

function clearPointerTracking() {
  pointerDrag.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerEnd)
  window.removeEventListener('pointercancel', onPointerEnd)
}

function onPointerMove(event: PointerEvent) {
  const state = pointerDrag.value
  if (!state || event.pointerId !== state.pointerId) {
    return
  }

  const field = findField(state.pageIndex, state.fieldId)
  if (!field) {
    return
  }

  const hoveredPageContext = pageContextAtClientPoint(event.clientX, event.clientY)
  if (hoveredPageContext && hoveredPageContext.pageIndex !== state.pageIndex) {
    const sourceList = fieldsByPage.value[state.pageIndex] ?? []
    const sourceIndex = sourceList.findIndex((item) => item.id === state.fieldId)
    if (sourceIndex >= 0) {
      const [movedField] = sourceList.splice(sourceIndex, 1)
      if (movedField) {
        const targetList = fieldsByPage.value[hoveredPageContext.pageIndex] ?? []
        if (!fieldsByPage.value[hoveredPageContext.pageIndex]) {
          fieldsByPage.value[hoveredPageContext.pageIndex] = targetList
        }
        targetList.push(movedField)
        state.pageIndex = hoveredPageContext.pageIndex
      }
    }
  }

  const targetContext = pageContextAtClientPoint(event.clientX, event.clientY)
  const shell = targetContext?.shell ?? pageShellRefs.value[state.pageIndex]
  const preview = targetContext?.preview ?? pagePreviews.value[state.pageIndex]
  const activeField = findField(state.pageIndex, state.fieldId)
  if (!shell || !preview || !activeField) {
    return
  }

  const shellRect = shell.getBoundingClientRect()
  const nextX = event.clientX - shellRect.left - state.offsetX
  const nextY = event.clientY - shellRect.top - state.offsetY
  activeField.x = clamp(nextX, 0, Math.max(0, preview.width - activeField.width))
  activeField.y = clamp(nextY, 0, Math.max(0, preview.height - activeField.height))
}

function onPointerEnd(event: PointerEvent) {
  const state = pointerDrag.value
  if (!state || event.pointerId !== state.pointerId) {
    return
  }
  clearPointerTracking()
}

async function downloadPdf() {
  if (!originalPdfBytes.value || originalPdfBytes.value.length < 5) {
    toast.warning('Carica prima un PDF')
    return
  }
  if (!hasPlacedFields.value) {
    toast.warning('Aggiungi prima i box nel PDF')
    return
  }

  isDownloadingPdf.value = true
  try {
    const pdfDoc = await PDFDocument.load(originalPdfBytes.value)
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pages = pdfDoc.getPages()

    for (const preview of pagePreviews.value) {
      const page = pages[preview.index]
      if (!page) {
        continue
      }

      const scaleX = page.getWidth() / preview.width
      const scaleY = page.getHeight() / preview.height
      const labelPaddingX = 8 * scaleX
      const valuePaddingY = 8 * scaleY

      for (const field of pageFields(preview.index)) {
        const boxWidth = field.width * scaleX
        const boxHeight = field.height * scaleY
        const boxX = field.x * scaleX
        const boxY = page.getHeight() - (field.y * scaleY) - boxHeight

        page.drawRectangle({
          x: boxX,
          y: boxY,
          width: boxWidth,
          height: boxHeight,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.3, 0.3, 0.3),
          borderWidth: 1,
          opacity: 0.96,
        })

        const labelSize = Math.max(7, 9 * Math.min(scaleX, scaleY))
        const valueSize = Math.max(9, 13 * Math.min(scaleX, scaleY))

        page.drawText(field.label.toUpperCase(), {
          x: boxX + labelPaddingX,
          y: boxY + boxHeight - labelSize - (6 * scaleY),
          size: labelSize,
          font: helveticaFont,
          color: rgb(0.38, 0.38, 0.38),
          maxWidth: boxWidth - (labelPaddingX * 2),
        })

        page.drawText(field.value, {
          x: boxX + labelPaddingX,
          y: boxY + valuePaddingY,
          size: valueSize,
          font: helveticaFont,
          color: rgb(0.08, 0.08, 0.08),
          maxWidth: boxWidth - (labelPaddingX * 2),
        })
      }
    }

    const output = await pdfDoc.save()
    const safeOutput = Uint8Array.from(output)
    const blob = new Blob([safeOutput], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const baseName = uploadedPdfName.value.replace(/\.pdf$/i, '') || 'documento'
    anchor.href = url
    anchor.download = `${baseName}-compilato.pdf`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success('PDF scaricato')
  } catch (error) {
    console.error(error)
    toast.error('Errore durante la generazione del PDF')
  } finally {
    isDownloadingPdf.value = false
  }
}

onBeforeUnmount(() => {
  clearPointerTracking()
})
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="PDF Placement Demo" :to="{ name: 'home' }" />

    <div class="container py-3 py-md-4">
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body d-flex flex-column gap-3">
          <div>
            <h2 class="h5 mb-1">Upload PDF</h2>
            <p class="text-muted small mb-0">Carica un PDF, compila nome/cognome, trascina i box e scarica il file finale.</p>
          </div>

          <div>
            <label for="pdfInput" class="form-label">File PDF</label>
            <input
              id="pdfInput"
              type="file"
              class="form-control"
              accept=".pdf,application/pdf"
              :disabled="isLoadingPdf"
              @change="onPdfSelected"
            />
            <small v-if="uploadedPdfName" class="text-muted d-block mt-2">
              File: {{ uploadedPdfName }} ({{ pagePreviews.length }} pagine)
            </small>
          </div>
        </div>
      </div>

      <div v-if="hasPdf" class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <form class="row g-3 align-items-end" @submit.prevent="applyNameFields">
            <div class="col-12 col-md-5">
              <label for="firstName" class="form-label">Nome</label>
              <input id="firstName" v-model="firstName" class="form-control" type="text" placeholder="Es. Mario" />
            </div>

            <div class="col-12 col-md-5">
              <label for="lastName" class="form-label">Cognome</label>
              <input id="lastName" v-model="lastName" class="form-control" type="text" placeholder="Es. Rossi" />
            </div>

            <div class="col-12 col-md-2 d-grid">
              <Btn type="submit" color="dark" icon="add_box">
                Applica
              </Btn>
            </div>
          </form>
        </div>
      </div>

      <div v-if="hasPdf" class="card border-0 shadow-sm">
        <div class="card-body d-flex flex-column gap-3">
          <h3 class="h6 mb-0">Visualizzazione PDF</h3>
          <p v-if="hasPlacedFields" class="small text-muted mb-0">
            Trascina i box direttamente nel PDF: puoi spostarli anche da una pagina all'altra.
          </p>

          <div class="pdf-pages">
            <article v-for="page in pagePreviews" :key="`page-${page.index}`" class="pdf-page-card">
              <header class="pdf-page-card__header">Pagina {{ page.index + 1 }}</header>
              <div
                :ref="(element) => setPageShellRef(page.index, element)"
                class="pdf-page-shell"
                :style="{ width: `${page.width}px`, height: `${page.height}px` }"
              >
                <img class="pdf-page-image" :src="page.imageDataUrl" :alt="`Anteprima pagina ${page.index + 1}`" />
                <div class="pdf-page-overlay">
                  <button
                    v-for="field in pageFields(page.index)"
                    :key="`field-${page.index}-${field.id}`"
                    type="button"
                    class="pdf-field-box"
                    :style="fieldStyle(field)"
                    @pointerdown="(event) => onFieldPointerDown(event, page.index, field)"
                  >
                    <span class="pdf-field-box__label">{{ field.label }}</span>
                    <span class="pdf-field-box__value">{{ field.value }}</span>
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div class="d-flex justify-content-end">
            <Btn
              color="dark"
              icon="download"
              :loading="isDownloadingPdf"
              :disabled="!hasPlacedFields || isDownloadingPdf"
              @click="downloadPdf"
            >
              Scarica PDF
            </Btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pdf-pages {
  display: grid;
  gap: 1rem;
}

.pdf-page-card {
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.68);
  overflow: hidden;
}

.pdf-page-card__header {
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid rgba(84, 44, 58, 0.14);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4b2935;
}

.pdf-page-shell {
  position: relative;
  max-width: 100%;
  overflow: hidden;
}

.pdf-page-image {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.pdf-page-overlay {
  position: absolute;
  inset: 0;
}

.pdf-field-box {
  position: absolute;
  border: 1px solid rgba(48, 48, 48, 0.9);
  background: rgba(255, 255, 255, 0.94);
  border-radius: 2px;
  text-align: left;
  cursor: move;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.28rem 0.42rem;
  user-select: none;
  touch-action: none;
}

.pdf-field-box__label {
  font-size: 0.64rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(53, 53, 53, 0.85);
}

.pdf-field-box__value {
  font-size: 0.9rem;
  font-weight: 500;
  color: #1f1f1f;
  line-height: 1.1;
}

@media (max-width: 767.98px) {
  .pdf-field-box {
    width: 180px !important;
    min-height: 52px !important;
  }
}
</style>
