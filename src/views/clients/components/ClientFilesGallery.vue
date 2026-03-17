<script setup lang="ts">
import { FieldFile, toFileArray, type FieldFileValue } from 'cic-kit'
import { computed, ref, watch } from 'vue'

type FileEntry = {
  url: string
  displayName: string
  isImage: boolean
  dateLabel: string
  sortTime: number
}

const props = withDefaults(defineProps<{
  sectionTitle: string
  fieldName: string
  urls: string[]
  emptyText?: string
  isUploading?: boolean
  isDeleting?: boolean
  uploadFiles: (files: File[]) => Promise<void> | void
  downloadFile: (url: string) => void
  deleteFile: (url: string) => void
}>(), {
  emptyText: 'Nessun file disponibile.',
  isUploading: false,
  isDeleting: false,
})

const selectedFiles = ref<FieldFileValue>([])
const isAutoUploading = ref(false)
const expandedImage = ref<FileEntry | null>(null)

const isBusy = computed(() => props.isUploading || props.isDeleting || isAutoUploading.value)

const fileEntries = computed<FileEntry[]>(() => {
  const list = Array.isArray(props.urls) ? props.urls : []
  const uniqueUrls = [...new Set(list.map((url) => String(url ?? '').trim()).filter(Boolean))]

  return uniqueUrls
    .map((url) => {
      const rawName = decodeFileNameFromUrl(url)
      const displayName = normalizeDisplayName(rawName)
      const uploadDate = extractUploadDate(rawName)
      return {
        url,
        displayName,
        isImage: isImageFile(rawName),
        dateLabel: formatFileDate(uploadDate),
        sortTime: uploadDate?.getTime() ?? 0,
      }
    })
    .sort((a, b) => {
      if (a.sortTime !== b.sortTime) return b.sortTime - a.sortTime
      return a.displayName.localeCompare(b.displayName, 'it-IT')
    })
})

watch(
  selectedFiles,
  async (nextValue) => {
    if (isAutoUploading.value || props.isUploading || props.isDeleting) return
    const files = toFileArray(nextValue)
    if (!files.length) return

    isAutoUploading.value = true
    try {
      await props.uploadFiles(files)
    } finally {
      selectedFiles.value = []
      isAutoUploading.value = false
    }
  },
  { deep: true },
)

function decodeFileNameFromUrl(url: string) {
  const normalized = String(url ?? '')
  const withoutQuery = normalized.split('?')[0] ?? ''
  const rawTail = withoutQuery.split('/').pop() ?? 'file'
  const decodedTail = safeDecodeURIComponent(rawTail)
  const decodedSegments = decodedTail.split('/').filter(Boolean)
  if (decodedSegments.length) {
    return decodedSegments[decodedSegments.length - 1] ?? 'file'
  }

  const rawSegments = rawTail.split(/%2f/i).filter(Boolean)
  const candidate = rawSegments[rawSegments.length - 1] ?? rawTail
  const decodedCandidate = safeDecodeURIComponent(candidate)
  return decodedCandidate || 'file'
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value)
  } catch (error) {
    return value
  }
}

function normalizeDisplayName(fileName: string) {
  const normalized = String(fileName ?? '').trim()
  if (!normalized) return 'file'
  const withoutPrefix = normalized
    .replace(/^\d{10,13}[_-]\d+[_-]+/, '')
    .replace(/^\d{10,13}[_-]+/, '')
    .replace(/^[_-]+/, '')
  return withoutPrefix || normalized
}

function extractUploadDate(fileName: string) {
  const normalized = String(fileName ?? '').trim()
  if (!normalized) return null

  const match = normalized.match(/^(\d{10,13})[_-]\d+[_-]/) ?? normalized.match(/^(\d{10,13})[_-]/)
  const rawTimestamp = match?.[1]
  if (!rawTimestamp) return null

  const timestamp = Number(rawTimestamp)
  if (!Number.isFinite(timestamp)) return null
  const millis = rawTimestamp.length === 10 ? timestamp * 1000 : timestamp
  const date = new Date(millis)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatFileDate(value: Date | null) {
  if (!value) return 'Data non disponibile'
  return value.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isImageFile(fileName: string) {
  return /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/i.test(String(fileName ?? ''))
}

function openImagePreview(entry: FileEntry) {
  if (!entry.isImage) return
  expandedImage.value = entry
}

function closeImagePreview() {
  expandedImage.value = null
}

function triggerDownload(url: string) {
  props.downloadFile(url)
}

function triggerDelete(url: string) {
  props.deleteFile(url)
}
</script>

<template>
  <article class="file-gallery">
    <div class="file-gallery__header">
      <h3 class="h6 mb-0">{{ sectionTitle }}</h3>
      <small class="text-muted">File: {{ fileEntries.length }}</small>
    </div>

    <FieldFile
      :name="fieldName"
      v-model="selectedFiles"
      multiple
      :show-errors="false"
      :disabled="isBusy"
      @clear="selectedFiles = []"
    >
      <template #dropzone="{ open, clear, files, disabled, dragging }">
        <button
          type="button"
          class="file-gallery__dropzone"
          :class="{ disabled, dragging }"
          :disabled="disabled"
          @click="open"
        >
          <span class="material-symbols-outlined file-gallery__dropzone-icon" aria-hidden="true">upload_file</span>
          <span class="file-gallery__dropzone-title">
            {{ isUploading ? 'Caricamento in corso...' : 'Aggiungi file (upload automatico)' }}
          </span>
          <small class="file-gallery__dropzone-subtitle">
            Trascina i file qui o clicca per selezionarli.
          </small>
        </button>

        <div v-if="files.length && !isUploading" class="file-gallery__selected-info">
          <small class="text-muted">{{ files.length }} file selezionati</small>
          <button type="button" class="file-gallery__clear-selection" :disabled="disabled" @click="clear">
            Annulla selezione
          </button>
        </div>
      </template>
    </FieldFile>

    <div v-if="fileEntries.length" class="file-gallery__grid">
      <article v-for="entry in fileEntries" :key="entry.url" class="file-gallery__card" :class="{ 'is-image': entry.isImage }">
        <button
          v-if="entry.isImage"
          type="button"
          class="file-gallery__image-trigger"
          :title="`Apri ${entry.displayName}`"
          @click="openImagePreview(entry)"
        >
          <img :src="entry.url" :alt="entry.displayName" class="file-gallery__image" loading="lazy" />
        </button>
        <div v-else class="file-gallery__file-icon-box">
          <span class="material-symbols-outlined" aria-hidden="true">description</span>
        </div>

        <div class="file-gallery__meta">
          <p class="file-gallery__name" :title="entry.displayName">{{ entry.displayName }}</p>
          <small class="file-gallery__date">{{ entry.dateLabel }}</small>
        </div>

        <div class="file-gallery__actions">
          <button
            type="button"
            class="file-gallery__action-btn"
            :disabled="isBusy"
            title="Scarica file"
            aria-label="Scarica file"
            @click="triggerDownload(entry.url)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">download</span>
          </button>
          <button
            type="button"
            class="file-gallery__action-btn file-gallery__action-btn--danger"
            :disabled="isBusy"
            title="Elimina file"
            aria-label="Elimina file"
            @click="triggerDelete(entry.url)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
        </div>
      </article>
    </div>
    <p v-else class="small text-muted mt-2 mb-0">{{ emptyText }}</p>
  </article>

  <div
    v-if="expandedImage"
    class="file-gallery__modal"
    role="dialog"
    aria-modal="true"
    :aria-label="`Anteprima ${expandedImage.displayName}`"
  >
    <button
      type="button"
      class="file-gallery__modal-backdrop"
      aria-label="Chiudi anteprima"
      @click="closeImagePreview"
    ></button>

    <div class="file-gallery__modal-content">
      <img :src="expandedImage.url" :alt="expandedImage.displayName" class="file-gallery__modal-image" />
      <button type="button" class="file-gallery__modal-close" aria-label="Chiudi anteprima" @click="closeImagePreview">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
      <p class="file-gallery__modal-caption">{{ expandedImage.displayName }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.file-gallery {
  display: grid;
  gap: 0.7rem;
}

.file-gallery__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
}

.file-gallery__dropzone {
  width: 100%;
  border: 1px dashed rgba(84, 44, 58, 0.34);
  border-radius: 0.78rem;
  background:
    radial-gradient(circle at 0% 0%, rgba(232, 179, 190, 0.26) 0%, transparent 50%),
    rgba(255, 255, 255, 0.78);
  padding: 0.75rem;
  display: grid;
  justify-items: start;
  gap: 0.12rem;
  text-align: left;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.file-gallery__dropzone:hover,
.file-gallery__dropzone:focus-visible {
  border-color: rgba(84, 44, 58, 0.56);
  transform: translateY(-1px);
}

.file-gallery__dropzone.dragging {
  border-color: rgba(84, 44, 58, 0.7);
  background-color: rgba(245, 232, 236, 0.95);
}

.file-gallery__dropzone.disabled {
  opacity: 0.66;
}

.file-gallery__dropzone-icon {
  font-size: 1.2rem;
  color: #5b3342;
}

.file-gallery__dropzone-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #5c3543;
}

.file-gallery__dropzone-subtitle {
  font-size: 0.72rem;
  color: #73515f;
}

.file-gallery__selected-info {
  margin-top: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.file-gallery__clear-selection {
  border: 1px solid rgba(84, 44, 58, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #5c3543;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.52rem;
}

.file-gallery__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 0.65rem;
}

.file-gallery__card {
  position: relative;
  border: 1px solid rgba(84, 44, 58, 0.18);
  border-radius: 0.8rem;
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0%, rgba(232, 179, 190, 0.24) 0%, transparent 48%),
    rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 20px rgba(45, 27, 35, 0.06);
}

.file-gallery__image-trigger {
  width: 100%;
  border: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  aspect-ratio: 1;
  cursor: zoom-in;
  display: block;
}

.file-gallery__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.file-gallery__image-trigger:hover .file-gallery__image {
  transform: scale(1.03);
}

.file-gallery__file-icon-box {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  background:
    linear-gradient(160deg, rgba(250, 244, 246, 0.9), rgba(239, 224, 229, 0.75));
}

.file-gallery__file-icon-box .material-symbols-outlined {
  font-size: 2.25rem;
  color: #5b3342;
}

.file-gallery__meta {
  padding: 0.48rem 0.56rem 0.58rem;
  display: grid;
  gap: 0.15rem;
}

.file-gallery__name {
  margin: 0;
  font-size: 0.77rem;
  font-weight: 700;
  line-height: 1.28;
  color: #41232e;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.file-gallery__date {
  font-size: 0.69rem;
  color: #785867;
  line-height: 1.2;
}

.file-gallery__actions {
  position: absolute;
  top: 0.42rem;
  right: 0.42rem;
  display: flex;
  gap: 0.24rem;
}

.file-gallery__action-btn {
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid rgba(84, 44, 58, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  color: #5b3342;
  display: grid;
  place-items: center;
  line-height: 1;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.file-gallery__action-btn:hover,
.file-gallery__action-btn:focus-visible {
  border-color: rgba(84, 44, 58, 0.48);
  background: rgba(248, 236, 240, 0.94);
  transform: translateY(-1px);
}

.file-gallery__action-btn .material-symbols-outlined {
  font-size: 1rem;
}

.file-gallery__action-btn--danger {
  color: #9f2844;
  border-color: rgba(159, 40, 68, 0.34);
}

.file-gallery__action-btn--danger:hover,
.file-gallery__action-btn--danger:focus-visible {
  background: rgba(255, 233, 239, 0.94);
  border-color: rgba(159, 40, 68, 0.56);
}

.file-gallery__modal {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.file-gallery__modal-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(255, 255, 255, 0.88);
}

.file-gallery__modal-content {
  position: relative;
  max-width: min(95vw, 980px);
  max-height: 90vh;
  border-radius: 0.9rem;
  overflow: hidden;
  box-shadow: 0 20px 44px rgba(29, 20, 24, 0.3);
  background: rgba(255, 255, 255, 0.98);
}

.file-gallery__modal-image {
  display: block;
  max-width: 100%;
  max-height: calc(90vh - 2.5rem);
  width: auto;
  height: auto;
  object-fit: contain;
}

.file-gallery__modal-caption {
  margin: 0;
  padding: 0.45rem 2.4rem 0.5rem 0.7rem;
  font-size: 0.77rem;
  color: #4e2f3a;
  word-break: break-word;
}

.file-gallery__modal-close {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  width: 1.95rem;
  height: 1.95rem;
  border: 1px solid rgba(84, 44, 58, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #5b3342;
  display: grid;
  place-items: center;
}

.file-gallery__modal-close .material-symbols-outlined {
  font-size: 1.05rem;
}

@media (max-width: 767.98px) {
  .file-gallery__grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.55rem;
  }

  .file-gallery__dropzone {
    padding: 0.68rem;
  }
}
</style>
