<script setup lang="ts">
import { cicKitStore } from 'cic-kit'
import { computed } from 'vue'
import HeaderApp from '../../components/headers/HeaderApp.vue'

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
</script>

<template>
  <div class="container-fluid pb-t h-100 d-flex flex-column overflow-hidden" :style="bgStyle">
    <HeaderApp title="Bonifico" :to="{ name: 'homeApp' }" />

    <section class="bonifico-page flex-grow-1 px-2 pb-3">
      <div class="bonifico-frame-wrap">
        <iframe class="bonifico-frame" src="/bonifico/" title="Bonifico QR" loading="lazy"></iframe>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.bonifico-page {
  min-height: 0;
  display: flex;
}

.bonifico-frame-wrap {
  width: 100%;
  min-height: 0;
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 10px 24px rgba(31, 21, 28, 0.12);
}

.bonifico-frame {
  width: 100%;
  height: 100%;
  min-height: 420px;
  border: 0;
  display: block;
}

@media (max-width: 575.98px) {
  .bonifico-frame {
    min-height: 380px;
  }
}
</style>
