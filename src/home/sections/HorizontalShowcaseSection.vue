<script setup lang="ts">
import { computed, onMounted } from 'vue'
import SectionTitle from '../components/SectionTitle.vue'
import CaseSlide from '../components/CaseSlide.vue'
import ProgressIndicator from '../components/ProgressIndicator.vue'
import { useHorizontalScroll } from '../composables/useHorizontalScroll'
import { usePrefersReducedMotion } from '../composables/usePrefersReducedMotion'
import type { HomeContent } from '../homeContent'

const props = defineProps<{
  content: HomeContent['showcase']
}>()

const caseStudies = computed(() => props.content.items)

const { isReducedMotion } = usePrefersReducedMotion()
const { sectionRef, stickyRef, viewportRef, trackRef, sectionStyle, trackStyle, displayProgress, isPinned, onFallbackScroll } =
  useHorizontalScroll({
    reducedMotion: isReducedMotion,
    mobileBreakpoint: 1024,
  })
void sectionRef
void stickyRef
void viewportRef
void trackRef

const currentSlide = computed(() => {
  const total = caseStudies.value.length
  return Math.min(total, Math.max(1, Math.round(displayProgress.value * (total - 1)) + 1))
})

function handleViewportScroll() {
  if (!isPinned.value) {
    onFallbackScroll()
  }
}

onMounted(() => {
  window.requestAnimationFrame(() => {
    onFallbackScroll()
  })
})
</script>

<template>
  <section id="case-studies" ref="sectionRef" class="home-horizontal" :style="sectionStyle">
    <div ref="stickyRef" class="home-horizontal__sticky" :class="{ 'is-pinned': isPinned }">
      <div class="home-horizontal__header">
        <SectionTitle
          :eyebrow="content.eyebrow"
          :title="content.title"
          :description="content.description"
        />
        <ProgressIndicator :current="currentSlide" :total="caseStudies.length" :progress="displayProgress" />
      </div>

      <div ref="viewportRef" class="home-horizontal__viewport" :class="{ 'is-fallback': !isPinned }" @scroll.passive="handleViewportScroll">
        <div ref="trackRef" class="home-horizontal__track" :style="trackStyle">
          <CaseSlide
            v-for="(item, index) in caseStudies"
            :key="item.id"
            :item="item"
            :index="index"
            :problem-label="content.problemLabel"
            :intervention-label="content.interventionLabel"
            :result-label="content.resultLabel"
          />
        </div>
      </div>
    </div>
  </section>
</template>
