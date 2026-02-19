<script setup lang="ts">
import { cicKitStore, useHideHeader } from "cic-kit";
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { Auth } from "../main";

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());

useHideHeader();
</script>

<template>
    <div class="home-page container-fluid overflow-auto h-100 d-flex flex-column" :style="bgStyle">
        <section class="home-main">
            <img class="home-logo" src="/img/logo/logo.png" alt="Cic Beauty logo" />
            <p class="home-soon fs-6 mb-4">coming soon...</p>

            <RouterLink :to="{ name: 'TreatmentsView' }"
                class="col-10 col-md-6 col-lg-4 text-center my-2 home-link main-btn">
                Treatments Catalog
            </RouterLink>
            <RouterLink :to="{ name: 'ProductsView' }"
                class="col-10 col-md-6 col-lg-4 text-center my-2 home-link main-btn">
                Products Catalog
            </RouterLink>

            <footer class="home-footer fs-8">
                <RouterLink v-if="!Auth.isLoggedIn" :to="{ name: 'login' }" class="home-link">
                    <span>login</span>
                </RouterLink>
            </footer>
        </section>
    </div>
</template>

<style scoped>
.home-main {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    padding-bottom: 64px;
    border-bottom: 1px solid currentColor;
    text-align: center;
    position: relative;
}

.home-logo {
    width: min(280px, 62vw);
    height: auto;
    filter: drop-shadow(0 10px 24px rgba(84, 44, 58, 0.14));
}

.home-soon {
    width: 100%;
    margin: 0;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-size: 0.75rem;
    color: #542c3a;
    opacity: 0.82;
}

.home-link {
    display: inline-block;
    color: #2f2f2f;
    text-decoration: none;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: color 0.2s ease;
    cursor: pointer;
}

.home-link.main-btn {
    border: 1px solid currentColor;
    padding: 16px 8px;
}

.home-link:hover {
    color: #e8b3be;
}

.home-footer {
    position: absolute;
    bottom: 8px;
}
</style>
