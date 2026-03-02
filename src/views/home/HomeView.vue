<script setup lang="ts">
import { useHideHeader } from 'cic-kit'
import { computed } from 'vue'
import { Auth } from '../../main'
import HomeAuthView from './HomeAuthView.vue'
import HomeGuestView from './HomeGuestView.vue'

useHideHeader()

const isLoggedIn = computed(() => Boolean(Auth.isLoggedIn))
</script>

<template>
  <HomeAuthView v-if="isLoggedIn" />
  <HomeGuestView v-else />
</template>
