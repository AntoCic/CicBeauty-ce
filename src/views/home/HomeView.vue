<script setup lang="ts">
import { computed } from 'vue'
import { Auth } from '../../main'
import HomeAuthView from './HomeAuthView.vue'
import HomeGuestView from './HomeGuestView.vue'

const isLoggedIn = computed(() => Boolean(Auth.isLoggedIn))
</script>

<template>
  <HomeAuthView v-if="isLoggedIn" />
  <HomeGuestView v-else />
</template>
