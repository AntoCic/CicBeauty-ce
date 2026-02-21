<script setup lang="ts">
import { Btn } from "cic-kit";
import { computed, getCurrentInstance } from "vue";
import { useRouter } from "vue-router";

const props = withDefaults(
  defineProps<{
    title: string;
    modelValue?: string;
    searchPlaceholder?: string;
    btnIcon?: string;
    btn2Icon?: string;
  }>(),
  {
    searchPlaceholder: "Search...",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "btnClick", ev?: MouseEvent): void;
  (e: "btn2Click", ev?: MouseEvent): void;
}>();


function btnClick(ev: MouseEvent) {
  emit("btnClick", ev);
}
function btn2Click(ev: MouseEvent) {
  emit("btn2Click", ev);
}

const router = useRouter();
const instance = getCurrentInstance();

const showSearch = computed(() => {
  const vnodeProps = instance?.vnode.props;
  if (!vnodeProps) {
    return false;
  }
  return (
    Object.prototype.hasOwnProperty.call(vnodeProps, "modelValue")
    || Object.prototype.hasOwnProperty.call(vnodeProps, "onUpdate:modelValue")
  );
});

const searchValue = computed({
  get: () => props.modelValue ?? "",
  set: (value: string) => emit("update:modelValue", value),
});

function goBack() {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
    return;
  }
  router.push({ name: "home" });
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <div class="app-header__left">
        <button type="button" class="app-header__logo-btn" aria-label="Torna indietro" @click="goBack">
          <img class="app-header__logo" src="/img/logo/logo.svg" alt="Cnc Beauty logo" />
        </button>
      </div>

      <h1 class="app-header__title">{{ title }}</h1>

      <div v-if="showSearch || btnIcon || btn2Icon" class="app-header__right">
        <input v-if="showSearch" v-model="searchValue" class="app-header__search" type="search"
          :placeholder="searchPlaceholder" aria-label="Search" />
        <Btn v-if="btnIcon" :icon="btnIcon" @click="btnClick" variant="ghost" />
        <Btn v-if="btn2Icon" :icon="btn2Icon" @click="btn2Click" variant="ghost" />
      </div>

      <span class="app-header__ghost" aria-hidden="true"></span>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 1100;
  width: 100%;
  padding: 8px 12px;
}

.app-header__inner {
  --side-width: clamp(132px, 34vw, 220px);
  display: grid;
  grid-template-columns: var(--side-width) minmax(0, 1fr) var(--side-width);
  grid-template-areas: "left title right";
  align-items: center;
  gap: 8px;
  min-height: 52px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.56);
  backdrop-filter: blur(12px) saturate(145%);
  -webkit-backdrop-filter: blur(12px) saturate(145%);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 2px;
  box-shadow: 0 4px 12px rgba(27, 16, 21, 0.12);
}

.app-header__left {
  grid-area: left;
  display: flex;
  justify-content: flex-start;
  min-width: 0;
}

.app-header__logo-btn {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.app-header__logo {
  width: 60px;
  height: 60px;
  object-fit: contain;
}

.app-header__title {
  grid-area: title;
  margin: 0;
  justify-self: center;
  text-align: center;
  color: #4b2935;
  font-size: clamp(1rem, 2.3vw, 1.3rem);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-family: "Cormorant Garamond", "Times New Roman", Georgia, serif;
  white-space: nowrap;
  max-width: min(100%, 32ch);
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-header__right {
  grid-area: right;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-width: 0;
}

.app-header__search {
  width: min(100%, var(--side-width));
  height: 34px;
  border: 1px solid rgba(84, 44, 58, 0.36);
  border-radius: 2px;
  padding: 0 10px;
  color: #4b2935;
  background: rgba(255, 255, 255, 0.58);
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.app-header__search::placeholder {
  color: rgba(75, 41, 53, 0.52);
}

.app-header__search:focus {
  border-color: rgba(84, 44, 58, 0.72);
  box-shadow: 0 0 0 2px rgba(232, 179, 190, 0.22);
}

.app-header__ghost {
  display: none;
}

@media (max-width: 575.98px) {
  .app-header__inner {
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    grid-template-areas:
      "left title ghost"
      "right right right";
    min-height: 44px;
    padding: 4px 8px;
    row-gap: 8px;
  }

  .app-header__title {
    font-size: 0.95rem;
    letter-spacing: 0.04em;
    max-width: 100%;
  }

  .app-header__right {
    justify-content: stretch;
  }

  .app-header__search {
    width: 100%;
    max-width: 100%;
    height: 32px;
    font-size: 0.74rem;
    margin-bottom: 8px;
  }

  .app-header__ghost {
    grid-area: ghost;
    display: block;
    width: 44px;
    height: 44px;
  }
}
</style>
