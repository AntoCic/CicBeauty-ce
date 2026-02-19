<script setup lang="ts">
import { Btn, cicKitStore, toast, useChangeHeader } from "cic-kit";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { productStore } from "../../stores/productStore";
import type { Product } from "../../models/Product";
import { Auth } from "../../main";

useChangeHeader("Dettaglio prodotto", { name: "ProductsView" });
const route = useRoute();
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const item = ref<Product | undefined>(undefined);
const isLoading = ref(false);
const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin);
const priceFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

async function loadItem() {
  const id = String(route.params.id ?? "");
  if (!id) return;

  isLoading.value = true;
  try {
    item.value = await productStore.ensureOne(id);
    if (!item.value) {
      toast.warning("Prodotto non trovato");
    }
  } catch (error) {
    console.error(error);
    toast.error("Errore caricamento prodotto");
  } finally {
    isLoading.value = false;
  }
}

function formatPrice(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return priceFormatter.format(value);
}

function primaryImage(urls: string[] | undefined) {
  return urls?.find((url) => !!url) ?? "";
}

onMounted(() => {
  loadItem();
});
watch(() => route.params.id, loadItem);
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <Btn
        v-if="canManage"
        color="dark"
        icon="edit"
        :to="{ name: 'ProductEditView', params: { id: route.params.id } }"
      >
        Modifica
      </Btn>
    </div>

    <div v-if="isLoading" class="text-muted small">Caricamento...</div>

    <article v-else-if="item" class="detail-card">
      <div class="row g-4 align-items-start">
        <div v-if="primaryImage(item.imgUrls)" class="col-12 col-lg-6">
          <div class="detail-media">
            <img :src="primaryImage(item.imgUrls)" :alt="item.title" class="detail-image" />
          </div>
        </div>
        <div :class="primaryImage(item.imgUrls) ? 'col-12 col-lg-6' : 'col-12'">
          <h2 class="detail-title">{{ item.title }}</h2>
          <p v-if="item.subtitle" class="detail-subtitle">{{ item.subtitle }}</p>
          <p v-if="item.description" class="detail-description">{{ item.description }}</p>
          <p class="detail-price">{{ formatPrice(item.price) }}</p>
        </div>
      </div>
    </article>

    <p v-else class="text-muted small mb-0">Prodotto non trovato.</p>
  </div>
</template>

<style scoped>
.detail-card {
  padding: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.65);
}

.detail-media {
  background: rgba(0, 0, 0, 0.03);
  min-height: 220px;
  display: grid;
  place-items: center;
}

.detail-image {
  width: 100%;
  max-height: 420px;
  object-fit: contain;
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
