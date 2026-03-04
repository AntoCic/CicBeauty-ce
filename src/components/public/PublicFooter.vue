<script setup lang="ts">
import LegalLinks from '../LegalLinks.vue'
</script>

<template>
  <footer class="public-footer">
    <div class="public-footer__top">
      <div class="public-footer__brand">
        <img src="/img/logo/logo-bk.png" alt="Logo CNC Beauty" class="public-footer__logo" />
        <p class="public-footer__text">
          Esperienza beauty premium, chiara e personalizzata.
        </p>
      </div>

      <nav class="public-footer__nav" aria-label="Link rapidi">
        <RouterLink v-motion-tap-scale :to="{ name: 'home' }" class="public-footer__link text-decoration-none">Home</RouterLink>
        <RouterLink v-motion-tap-scale :to="{ name: 'TreatmentCategoriesView' }" class="public-footer__link text-decoration-none">Trattamenti</RouterLink>
        <RouterLink v-motion-tap-scale :to="{ name: 'ProductCategoriesView' }" class="public-footer__link text-decoration-none">Prodotti</RouterLink>
        <RouterLink v-motion-tap-scale :to="{ name: 'TreatmentsView' }" class="public-footer__link text-decoration-none">Catalogo</RouterLink>
      </nav>
    </div>

    <div class="public-footer__social" aria-label="Social">
      <a v-motion-tap-scale href="#" class="public-footer__social-link text-decoration-none" aria-label="Instagram">
        Instagram
      </a>
      <a v-motion-tap-scale href="#" class="public-footer__social-link text-decoration-none" aria-label="Facebook">
        Facebook
      </a>
      <a v-motion-tap-scale href="#" class="public-footer__social-link text-decoration-none" aria-label="WhatsApp">
        WhatsApp
      </a>
    </div>

    <div class="public-footer__bottom">
      <LegalLinks />
      <p class="public-footer__copy">(c) CNC Beauty</p>
    </div>
  </footer>
</template>

<style scoped>
.public-footer {
  margin-top: 1.15rem;
  padding: clamp(0.9rem, 2.3vw, 1.4rem);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 2px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.74), rgba(247, 241, 242, 0.6));
  box-shadow: 0 10px 24px rgba(35, 20, 25, 0.1);
}

.public-footer__top {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.7rem;
  align-items: center;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid rgba(84, 44, 58, 0.15);
}

.public-footer__brand {
  display: grid;
  gap: 0.26rem;
}

.public-footer__logo {
  width: 120px;
  height: auto;
}

.public-footer__text {
  margin: 0;
  color: rgba(58, 36, 44, 0.82);
  font-size: 0.8rem;
}

.public-footer__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.36rem 0.52rem;
  justify-content: flex-end;
}

.public-footer__link {
  color: #432632;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
}

.public-footer__bottom {
  margin-top: 0.7rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.public-footer__social {
  margin-top: 0.58rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
}

.public-footer__social-link {
  min-height: 28px;
  padding: 0 0.52rem;
  border: 1px solid rgba(84, 44, 58, 0.2);
  border-radius: 2px;
  color: #452733;
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.public-footer__copy {
  margin: 0;
  color: rgba(58, 36, 44, 0.66);
  font-size: 0.72rem;
}

@media (max-width: 767.98px) {
  .public-footer__top {
    grid-template-columns: 1fr;
  }

  .public-footer__nav {
    justify-content: flex-start;
  }
}
</style>
