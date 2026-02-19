<script setup lang="ts">
import { Btn, cicKitStore, toast, useChangeHeader } from "cic-kit";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { treatmentStore } from "../../stores/treatmentStore";
import type { Treatment } from "../../models/Treatment";
import { Auth } from "../../main";

useChangeHeader("Dettaglio trattamento", { name: "TreatmentsView" });

const route = useRoute();
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const item = ref<Treatment | undefined>(undefined);
const isLoading = ref(false);
const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin);
const priceFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

async function loadItem() {
  const id = String(route.params.id ?? "");
  if (!id) return;

  isLoading.value = true;
  try {
    item.value = await treatmentStore.ensureOne(id);
    if (!item.value) {
      toast.warning("Trattamento non trovato");
    }
  } catch (error) {
    console.error(error);
    toast.error("Errore caricamento trattamento");
  } finally {
    isLoading.value = false;
  }
}

function formatPrice(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return priceFormatter.format(value);
}

onMounted(() => {
  loadItem();
});
watch(() => route.params.id, loadItem);
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h5 mb-0">Dettaglio trattamento</h1>
      <Btn
        v-if="canManage"
        color="dark"
        icon="edit"
        :to="{ name: 'TreatmentEditView', params: { id: route.params.id } }"
      >
        Modifica
      </Btn>
    </div>

    <div v-if="isLoading" class="text-muted small">Caricamento...</div>

    <article v-else-if="item" class="detail-card">
      <h2 class="detail-title">{{ item.title }}</h2>
      <p v-if="item.subtitle" class="detail-subtitle">{{ item.subtitle }}</p>
      <p v-if="item.description" class="detail-description">{{ item.description }}</p>
      <p class="detail-price">{{ formatPrice(item.price) }}</p>
    </article>

    <p v-else class="text-muted small mb-0">Trattamento non trovato.</p>
  </div>
</template>

<style scoped>
.detail-card {
  padding: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.65);
}

.detail-title {
  margin-bottom: 0.4rem;
  font-size: clamp(1.45rem, 2.6vw, 2.25rem);
  font-weight: 700;
}

.detail-subtitle {
  margin-bottom: 1rem;
  font-size: 1.05rem;
  color: rgba(0, 0, 0, 0.66);
}

.detail-description {
  margin-bottom: 1.5rem;
  font-size: 1rem;
  line-height: 1.7;
}

.detail-price {
  margin-bottom: 0;
  font-size: clamp(1.35rem, 2.8vw, 2rem);
  font-weight: 700;
}
</style>
