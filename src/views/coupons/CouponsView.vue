<script setup lang="ts">
import { Btn, cicKitStore } from 'cic-kit'
import { computed } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Coupon" :to="{ name: 'home' }" />

    <div class="coupon-types-wrap px-2 pb-4">
      <section class="card border-0 shadow-sm p-3 p-md-4">
        <p class="small text-muted mb-2">Scegli il tipo di coupon da creare</p>

        <article class="gift-type-card">
          <p class="gift-type-card__kicker mb-1">Tipo disponibile ora</p>
          <h2 class="gift-type-card__title">Coupon regalo personale</h2>
          <p class="gift-type-card__subtitle mb-3">
            Un coupon creato da una persona per un cliente, valido una sola volta, dedicato a uno o piu trattamenti.
          </p>
          <div class="d-flex gap-2 flex-wrap">
            <RouterLink :to="{ name: 'CouponGiftCreateView' }" class="text-decoration-none">
              <Btn type="button" color="dark" icon="add">Crea coupon regalo</Btn>
            </RouterLink>
            <RouterLink :to="{ name: 'CouponsListView' }" class="text-decoration-none">
              <Btn type="button" color="secondary" variant="outline" icon="view_list">Vedi tutti i coupon</Btn>
            </RouterLink>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.coupon-types-wrap {
  max-width: 920px;
  margin-inline: auto;
}

.gift-type-card {
  border: 1px solid rgba(84, 44, 58, 0.22);
  border-radius: 0.9rem;
  padding: 1rem;
  background:
    radial-gradient(circle at 92% 8%, rgba(232, 179, 190, 0.35) 0%, transparent 42%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.96), rgba(247, 241, 242, 0.92));
}

.gift-type-card__kicker {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #674453;
  font-weight: 700;
}

.gift-type-card__title {
  margin: 0;
  font-size: 1.25rem;
  color: #4b2d3a;
}

.gift-type-card__subtitle {
  font-size: 0.86rem;
  line-height: 1.35;
  color: #5f4450;
}
</style>

