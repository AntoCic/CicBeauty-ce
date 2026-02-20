<script setup lang="ts">
import { Btn, cicKitStore, toast, useChangeHeader } from "cic-kit";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { productStore } from "../../stores/productStore";
import type { Product } from "../../models/Product";
import { Auth } from "../../main";
import HeaderApp from "../../components/HeaderApp.vue";

useChangeHeader("Dettaglio prodotto", { name: "ProductsView" });
const route = useRoute();
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const item = ref<Product | undefined>(undefined);
const isLoading = ref(false);
const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin);
const priceFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const heroImage = computed(() => primaryImage(item.value?.imgUrls));

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
  <div class="detail-page container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Dettaglio prodotto" />

    <section class="detail-shell">
      <div v-if="canManage" class="detail-toolbar">
        <Btn
          color="secondary"
          icon="edit"
          :to="{ name: 'ProductEditView', params: { id: route.params.id } }"
        >
          Modifica
        </Btn>
      </div>

      <div v-if="isLoading" class="detail-state">Caricamento...</div>

      <article v-else-if="item" class="detail-card">
        <div class="row g-4 g-xl-5 align-items-start">
          <div v-if="heroImage" class="col-12 col-lg-6">
            <div class="detail-media">
              <img :src="heroImage" :alt="item.title" class="detail-image" />
            </div>
          </div>

          <div :class="heroImage ? 'col-12 col-lg-6 d-flex flex-column' : 'col-12 d-flex flex-column'">
            <p class="detail-kicker">
              <svg class="g-icon g-icon--kicker" viewBox="0 -960 960 960" aria-hidden="true">
                <path d="M280-120q-33 0-56.5-23.5T200-200v-520q0-33 23.5-56.5T280-800h400q33 0 56.5 23.5T760-720v520q0 33-23.5 56.5T680-120H280Zm200-280q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm-120-200h240v-80H360v80Z"/>
              </svg>
              Prodotto
            </p>

            <div class="detail-heading">
              <h2 class="detail-title">{{ item.title }}</h2>
              <p class="detail-price">
                {{ formatPrice(item.price) }}
              </p>
            </div>

            <p v-if="item.subtitle" class="detail-subtitle">{{ item.subtitle }}</p>

            <div class="detail-badges">
              <span v-if="item.storeDisabeld" class="detail-badge detail-badge--warn">
                <svg class="g-icon" viewBox="0 -960 960 960" aria-hidden="true">
                  <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-139 0-236.5-97.5T146-414q0-139 97.5-236.5T480-748q139 0 236.5 97.5T814-414q0 139-97.5 236.5T480-80Z"/>
                </svg>
                Non disponibile: {{ item.storeDisabeld }}
              </span>
            </div>

            <p v-if="item.description" class="detail-description">{{ item.description }}</p>

            <div class="detail-extra">
              <p v-if="item.consigliUso" class="detail-extra-item">
                <strong class="detail-extra-label">
                  <svg class="g-icon" viewBox="0 -960 960 960" aria-hidden="true">
                    <path d="M480-80q-83 0-156-31.5T197-197Q112-282 80-364.5T48-520q0-89 34.5-169T180-828q-11-39-2.5-73t33.5-59q25-25 59-33.5t73 2.5q73-63 153-97t169-34q89 0 169 34t153 97q39-11 73 2.5t59 33.5q25 25 33.5 59t-2.5 73q63 73 97 153t34 169q0 83-31.5 156T763-197q-85 85-167.5 116T480-80Zm0-80q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720q-117 0-198.5 81.5T200-440q0 117 81.5 198.5T480-160Zm0-120q50 0 85-35t35-85h-80q0 17-11.5 28.5T480-360q-17 0-28.5-11.5T440-400h-80q0 50 35 85t85 35ZM320-480q17 0 28.5-11.5T360-520q0-17-11.5-28.5T320-560q-17 0-28.5 11.5T280-520q0 17 11.5 28.5T320-480Zm320 0q17 0 28.5-11.5T680-520q0-17-11.5-28.5T640-560q-17 0-28.5 11.5T600-520q0 17 11.5 28.5T640-480Z"/>
                  </svg>
                  Consigli d'uso:
                </strong>
                {{ item.consigliUso }}
              </p>
              <p v-if="item.ingredienti" class="detail-extra-item">
                <strong class="detail-extra-label">
                  <svg class="g-icon" viewBox="0 -960 960 960" aria-hidden="true">
                    <path d="M480-120q-100-92-166-186.5T248-500q0-89 59.5-148.5T456-708q25 0 48.5 7.5T548-678q22-22 47-35t53-13q89 0 148.5 59.5T856-518q0 99-66 193.5T624-138q-27 23-62.5 20.5T480-120Zm0-82q73-71 124.5-149.5T656-500q0-56-36-92t-92-36q-23 0-44.5 9T446-592h-80q-16-18-37.5-27T284-628q-56 0-92 36t-36 92q0 70 51.5 148.5T480-202Zm0-213Z"/>
                  </svg>
                  Ingredienti:
                </strong>
                {{ item.ingredienti }}
              </p>
            </div>
          </div>
        </div>
      </article>

      <p v-else class="detail-state">Prodotto non trovato.</p>
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

.detail-media {
  min-height: min(52vw, 440px);
  display: grid;
  place-items: center;
  padding: clamp(0.8rem, 2vw, 1.2rem);
  border: 1px solid rgba(84, 44, 58, 0.12);
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.46), rgba(255, 255, 255, 0.24));
}

.detail-image {
  width: 100%;
  max-height: min(48vw, 420px);
  object-fit: contain;
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
