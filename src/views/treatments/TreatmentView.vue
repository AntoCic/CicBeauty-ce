<script setup lang="ts">
import {  cicKitStore, toast, useChangeHeader } from "cic-kit";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { treatmentStore } from "../../stores/treatmentStore";
import type { Treatment } from "../../models/Treatment";
import { Auth } from "../../main";
import HeaderApp from "../../components/HeaderApp.vue";

useChangeHeader("Dettaglio trattamento", { name: "TreatmentsView" });

const route = useRoute();
const router = useRouter();
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

function formatDuration(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) return "-";
  return `${Math.round(value)} min`;
}

onMounted(() => {
  loadItem();
});
watch(() => route.params.id, loadItem);

function goPageEdit() {
  router.push({ name: 'TreatmentEditView', params: { id: route.params.id } });
}
</script>

<template>
  <div class="detail-page container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Dettaglio trattamento" :btn-icon="canManage ? 'edit' : undefined" @btn-click="goPageEdit" />

    <section class="detail-shell">

      <div v-if="isLoading" class="detail-state">Caricamento...</div>

      <article v-else-if="item" class="detail-card">
        <div class="row g-4 g-xl-5 align-items-start">
          <div class="col-12 d-flex flex-column">
            <p class="detail-kicker">
              <svg class="g-icon g-icon--kicker" viewBox="0 -960 960 960" aria-hidden="true">
                <path
                  d="M480-80q-82 0-155-31t-127-85q-54-54-85-127T82-478q0-79 29-149t81-124l53 53q-42 43-64.5 99T158-478q0 134 94 228t228 94q134 0 228-94t94-228q0-134-94-228t-228-94q-23 0-45 2.5T392-790l88 88H280v-200l53 53q35-15 72-23t75-8q82 0 155 31t127 85q54 54 85 127t31 155q0 82-31 155T762-196q-54 54-127 85T480-80Zm-40-200q-17 0-28.5-11.5T400-320q0-17 11.5-28.5T440-360h80q17 0 28.5 11.5T560-320q0 17-11.5 28.5T520-280h-80Z" />
              </svg>
              Trattamento
            </p>

            <div class="detail-heading">
              <h2 class="detail-title">{{ item.title }}</h2>
              <p class="detail-price">
                {{ formatPrice(item.price) }}
              </p>
            </div>

            <p v-if="item.subtitle" class="detail-subtitle">{{ item.subtitle }}</p>

            <div class="detail-badges">
              <span class="detail-badge">
                <svg class="g-icon" viewBox="0 -960 960 960" aria-hidden="true">
                  <path
                    d="M480-80q-83 0-156-31.5T197-197Q112-282 80-364.5T48-520q0-83 31.5-156T197-803q85-85 167.5-116T480-950q83 0 156 31.5T763-803q85 85 116.5 167.5T911-520q0 83-31.5 156T763-197q-85 85-167.5 116.5T480-80Zm1-439 167 99 30-50-137-81v-209h-60v241Z" />
                </svg>
                Durata: {{ formatDuration(item.duration) }}
              </span>

              <span v-if="item.storeDisabeld" class="detail-badge detail-badge--warn">
                <svg class="g-icon" viewBox="0 -960 960 960" aria-hidden="true">
                  <path
                    d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-139 0-236.5-97.5T146-414q0-139 97.5-236.5T480-748q139 0 236.5 97.5T814-414q0 139-97.5 236.5T480-80Z" />
                </svg>
                Non disponibile: {{ item.storeDisabeld }}
              </span>
            </div>

            <p v-if="item.description" class="detail-description">{{ item.description }}</p>

            <div class="detail-extra">
              <p v-if="item.tipiDiPelle" class="detail-extra-item">
                <strong class="detail-extra-label">
                  <svg class="g-icon" viewBox="0 -960 960 960" aria-hidden="true">
                    <path
                      d="M480-80q-83 0-156-31.5T197-197Q112-282 80-364.5T48-520q0-83 31.5-156T197-803q85-85 167.5-116T480-950q83 0 156 31.5T763-803q85 85 116.5 167.5T911-520q0 83-31.5 156T763-197q-85 85-167.5 116.5T480-80Zm0-80q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720q-117 0-198.5 81.5T200-440q0 117 81.5 198.5T480-160Zm-80-200h160q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360Zm-40-120q17 0 28.5-11.5T400-520q0-17-11.5-28.5T360-560q-17 0-28.5 11.5T320-520q0 17 11.5 28.5T360-480Zm240 0q17 0 28.5-11.5T640-520q0-17-11.5-28.5T600-560q-17 0-28.5 11.5T560-520q0 17 11.5 28.5T600-480Z" />
                  </svg>
                  Tipi di pelle:
                </strong>
                {{ item.tipiDiPelle }}
              </p>

              <p v-if="item.ingredienti" class="detail-extra-item">
                <strong class="detail-extra-label">
                  <svg class="g-icon" viewBox="0 -960 960 960" aria-hidden="true">
                    <path
                      d="M480-120q-100-92-166-186.5T248-500q0-89 59.5-148.5T456-708q25 0 48.5 7.5T548-678q22-22 47-35t53-13q89 0 148.5 59.5T856-518q0 99-66 193.5T624-138q-27 23-62.5 20.5T480-120Zm0-82q73-71 124.5-149.5T656-500q0-56-36-92t-92-36q-23 0-44.5 9T446-592h-80q-16-18-37.5-27T284-628q-56 0-92 36t-36 92q0 70 51.5 148.5T480-202Zm0-213Z" />
                  </svg>
                  Ingredienti:
                </strong>
                {{ item.ingredienti }}
              </p>
            </div>
          </div>
        </div>
      </article>

      <p v-else class="detail-state">Trattamento non trovato.</p>
    </section>
  </div>
</template>

<style scoped>
.detail-page {
  color: #2f2f2f;
}

.detail-shell {
  width: min(1080px, 100%);
  margin: 0 auto;
  padding: 0 12px 1.6rem;
}

.detail-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}

.detail-state {
  text-align: center;
  font-size: 0.86rem;
  color: rgba(75, 41, 53, 0.7);
}

.detail-card {
  position: relative;
  overflow: hidden;
  padding: clamp(1rem, 2vw, 1.4rem);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 2px;
  background: linear-gradient(152deg, rgba(255, 255, 255, 0.6), rgba(247, 241, 242, 0.4));
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  box-shadow: 0 12px 24px rgba(45, 23, 31, 0.13);
}

.detail-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.3), transparent 50%);
}

.detail-kicker {
  margin: 0 0 0.35rem;
  color: rgba(84, 44, 58, 0.64);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.detail-title {
  margin: 0;
  color: #4b2935;
  font-size: clamp(1.35rem, 2.5vw, 2.15rem);
  font-weight: 700;
  line-height: 1.14;
}

.detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.detail-subtitle {
  margin: 0.45rem 0 0;
  color: rgba(75, 41, 53, 0.78);
  font-size: 1rem;
  font-weight: 500;
}

.detail-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0.95rem 0 0;
}

.detail-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 28px;
  padding: 0 0.65rem;
  border: 1px solid rgba(84, 44, 58, 0.24);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.45);
  color: #542c3a;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.detail-badge--warn {
  border-color: rgba(138, 26, 26, 0.28);
  color: #7d1d1d;
  background: rgba(255, 240, 240, 0.56);
}

.detail-description {
  margin: 1rem 0 0;
  color: rgba(47, 47, 47, 0.86);
  font-size: 0.94rem;
  line-height: 1.65;
}

.detail-extra {
  margin-top: 0.75rem;
}

.detail-extra-item {
  margin: 0.35rem 0 0;
  font-size: 0.86rem;
  line-height: 1.55;
  color: rgba(47, 47, 47, 0.78);
}

.detail-extra-label {
  color: #542c3a;
  font-weight: 600;
  margin-right: 0.3rem;
}

.detail-price {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.1rem;
  margin-bottom: 0;
  color: #2f2f2f;
  font-size: clamp(1.06rem, 2.1vw, 1.55rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.g-icon {
  width: 1.06rem;
  height: 1.06rem;
  fill: currentColor;
  flex: 0 0 auto;
}

.g-icon--kicker {
  width: 0.95rem;
  height: 0.95rem;
}

:deep(.detail-toolbar .btn) {
  border-radius: 2px;
}

:deep(.detail-toolbar .btn:focus-visible) {
  box-shadow: none;
}

@media (max-width: 575.98px) {
  .detail-shell {
    padding: 0 10px 1.25rem;
  }

  .detail-toolbar {
    margin-bottom: 0.5rem;
  }

  .detail-subtitle {
    font-size: 0.9rem;
  }

  .detail-heading {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .detail-price {
    font-size: 1.1rem;
  }

  .detail-description {
    font-size: 0.86rem;
  }
}
</style>
