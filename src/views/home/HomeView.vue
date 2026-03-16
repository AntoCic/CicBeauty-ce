<script setup lang="ts">
import { computed } from 'vue'
import { Auth } from '../../main'
import CalendarView from '../calendar/CalendarView.vue'
import HomeGuestView from './HomeGuestView.vue'

const isLoggedIn = computed(() => Boolean(Auth.isLoggedIn))
</script>

<template>
  <CalendarView v-if="isLoggedIn" />
  <HomeGuestView v-else />
</template>
