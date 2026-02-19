<script setup lang="ts">
import { computed, ref } from "vue";
import { Form } from "vee-validate";
import {
  Btn,
  FieldFile,
  ObjectViewer,
  toFileArray,
  type FieldFileValue,
  toast,
  uploadFilesToUrls,
} from "cic-kit";
import { Auth } from "@src/main";

const fileValue = ref<FieldFileValue>([]);
const uploadedUrls = ref<string[]>([]);
const uploadRunning = ref(false);
const eventLog = ref<string[]>([]);

const isLoggedIn = computed(() => Auth.isLoggedIn);
const canUpload = computed(() => isLoggedIn.value && !!Auth.publicUserFolder && !uploadRunning.value);
const authAlertClass = computed(() => (canUpload.value ? "alert-success" : "alert-warning"));

function addLog(message: string) {
  const hhmmss = new Date().toLocaleTimeString("it-IT");
  eventLog.value = [`${hhmmss} - ${message}`, ...eventLog.value].slice(0, 8);
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function clearUploadedUrls() {
  uploadedUrls.value = [];
  addLog("Lista URL caricati svuotata");
}

function onChange(files: File[]) {
  addLog(`Selezionati ${files.length} file`);
}

function onRemove(file: File, index: number) {
  addLog(`Rimosso ${file.name} (#${index + 1})`);
}

function onOpen() {
  addLog("Apertura picker file");
}

function onClear() {
  addLog("Campo file svuotato");
}

async function onSubmit() {
  const files = toFileArray(fileValue.value);
  if (!files.length) {
    toast.warning("Seleziona almeno un file prima dell'upload");
    return;
  }

  if (!Auth.isLoggedIn) {
    toast.error("Devi essere loggato per caricare file");
    return;
  }

  const folder = Auth.publicUserFolder;
  if (!folder) {
    toast.error("Cartella utente non disponibile. Ricarica la pagina dopo il login.");
    return;
  }

  uploadRunning.value = true;
  try {
    const batchId = Date.now();
    const urls = await uploadFilesToUrls(files, async (file, index) => {
      const safeName = sanitizeFileName(file.name);
      const path = `field-file-demo/${batchId}-${index}-${safeName}`;
      const uploaded = await folder.update(path, file);
      return uploaded.url;
    });

    uploadedUrls.value = urls;
    fileValue.value = [];

    toast.success(`Upload completato: ${urls.length} file`);
    addLog(`Upload completato su public/user/${Auth.uid ?? "-"}/field-file-demo`);
  } catch (error) {
    console.error(error);
    toast.error("Errore durante il caricamento su Storage");
    addLog("Errore upload su Storage");
  } finally {
    uploadRunning.value = false;
  }
}
</script>

<template>
  <div class="container py-4 pb-t overflow-auto h-100">
    <h2 class="f-calSans mb-2">Demo FieldFile + Firebase Storage</h2>
    <p class="text-muted mb-3">
      Drag&drop, upload multiplo e URL finali. Il caricamento e consentito solo agli utenti autenticati.
    </p>

    <div class="alert d-flex flex-wrap gap-2 align-items-center" :class="authAlertClass">
      <div class="me-auto">
        <strong>Stato auth:</strong>
        {{ isLoggedIn ? "loggato" : "non loggato" }}
        <span v-if="isLoggedIn"> (uid: {{ Auth.uid }})</span>
      </div>
      <Btn v-if="!isLoggedIn" icon="login" :to="{ name: 'View: Login' }">Vai al login</Btn>
    </div>

    <Form @submit="onSubmit" v-slot="{ values }">
      <div class="card p-3 mb-3">
        <h5 class="mb-2">Selezione file</h5>

        <FieldFile
          name="files"
          v-model="fileValue"
          multiple
          accept="image/*,.pdf"
          :disabled="!canUpload"
          :rules="(value) => toFileArray(value).length > 0 || 'Seleziona almeno un file'"
          @change="onChange"
          @remove="onRemove"
          @clear="onClear"
          @open="onOpen"
        >
          <template #dropzone="{ open, clear, files, disabled, dragging, errorMessage }">
            <div class="dropzone-demo" :class="{ dragging, disabled }">
              <div class="fw-semibold mb-1">
                {{ dragging ? "Rilascia i file qui" : "Trascina immagini/PDF o clicca per selezionare" }}
              </div>
              <div class="small text-muted mb-2">
                Destinazione upload: <code>public/user/{{ Auth.uid ?? "{uid}" }}/field-file-demo</code>
              </div>
              <div class="d-flex gap-2 flex-wrap">
                <Btn type="button" icon="upload_file" color="dark" :disabled="disabled" @click="open">
                  Scegli file
                </Btn>
                <Btn
                  type="button"
                  icon="delete"
                  variant="outline"
                  color="danger"
                  :disabled="disabled || !files.length"
                  @click="clear"
                >
                  Svuota
                </Btn>
              </div>
              <div class="small mt-2">File selezionati: <strong>{{ files.length }}</strong></div>
              <div v-if="errorMessage" class="text-danger small mt-1">{{ errorMessage }}</div>
            </div>
          </template>
        </FieldFile>

        <div class="d-flex gap-2 flex-wrap mt-3">
          <Btn
            type="submit"
            icon="cloud_upload"
            color="dark"
            :loading="uploadRunning"
            :disabled="!canUpload"
          >
            Carica su Storage
          </Btn>
          <Btn type="button" icon="restart_alt" variant="outline" color="dark" @click="clearUploadedUrls">
            Reset URL
          </Btn>
        </div>

        <div class="mt-3">
          <h6 class="mb-2">Valori live del form</h6>
          <ObjectViewer :obj="values" />
        </div>
      </div>
    </Form>

    <div class="card p-3 mb-3">
      <h5 class="mb-2">URL caricati</h5>
      <div v-if="!uploadedUrls.length" class="text-muted">Nessun upload completato.</div>
      <ul v-else class="list-group">
        <li v-for="(url, index) in uploadedUrls" :key="url + index" class="list-group-item">
          <a :href="url" target="_blank" rel="noopener noreferrer">{{ url }}</a>
        </li>
      </ul>
    </div>

    <div class="card p-3">
      <h5 class="mb-2">Event log</h5>
      <div v-if="!eventLog.length" class="text-muted">Nessun evento registrato.</div>
      <ul v-else class="list-group">
        <li v-for="(line, index) in eventLog" :key="line + index" class="list-group-item py-2">
          {{ line }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="scss">
.card {
  border: 1px solid rgba(48, 71, 94, 0.16);
  border-radius: 12px;
}

.dropzone-demo {
  border: 1px dashed #cbd5e1;
  border-radius: 0.75rem;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.02);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.dropzone-demo.dragging {
  border-color: #30475e;
  background: rgba(48, 71, 94, 0.08);
}

.dropzone-demo.disabled {
  opacity: 0.65;
}

.list-group-item {
  word-break: break-word;
}
</style>
