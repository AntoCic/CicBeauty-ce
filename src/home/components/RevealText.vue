<script setup lang="ts">
import { computed } from 'vue'
import { usePrefersReducedMotion } from '../composables/usePrefersReducedMotion'
import { useScrollReveal } from '../composables/useScrollReveal'

const props = withDefaults(
  defineProps<{
    as?: string
    lines: string[]
    className?: string
  }>(),
  {
    as: 'p',
    className: '',
  },
)

const wordsByLine = computed(() =>
  props.lines.map((line) =>
    line
      .trim()
      .split(/\s+/)
      .filter(Boolean),
  ),
)

const { isReducedMotion } = usePrefersReducedMotion()
const { target, revealClass } = useScrollReveal({ threshold: 0.32, once: true })
void target

const classes = computed(() => [
  'home-reveal-text',
  revealClass.value,
  isReducedMotion.value ? 'is-reduced' : '',
  props.className,
])
</script>

<template>
  <component :is="as" ref="target" :class="classes">
    <span
      v-for="(line, lineIndex) in wordsByLine"
      :key="`line-${lineIndex}`"
      class="home-reveal-text__line"
      :style="{ '--line-index': lineIndex }"
    >
      <span
        v-for="(word, wordIndex) in line"
        :key="`word-${lineIndex}-${wordIndex}`"
        class="home-reveal-text__word"
        :style="{ '--word-index': lineIndex * 12 + wordIndex }"
      >
        {{ word }}
      </span>
    </span>
  </component>
</template>
