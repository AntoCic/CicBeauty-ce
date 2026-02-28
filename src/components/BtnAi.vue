<script setup lang="ts">
import { computed, useAttrs, type ButtonHTMLAttributes, type StyleValue } from 'vue'

defineOptions({ inheritAttrs: false })

type BtnAiSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type BtnAiVariant = 'solid' | 'outline'

const props = withDefaults(
  defineProps<{
    size?: BtnAiSize
    variant?: BtnAiVariant
    loading?: boolean
  }>(),
  {
    size: 'md',
    variant: 'solid',
    loading: false,
  },
)

const attrs = useAttrs()

function isDisabledAttr(value: unknown) {
  if (value === '' || value === true) return true
  const normalized = String(value ?? '').trim().toLowerCase()
  return ['true', 'disabled', '1'].includes(normalized)
}

const computedType = computed(() => {
  const rawType = String(attrs.type ?? '').trim().toLowerCase()
  return rawType === 'submit' || rawType === 'reset' || rawType === 'button' ? rawType : 'button'
})

const isDisabled = computed(() => props.loading || isDisabledAttr(attrs.disabled))

const forwardedAttrs = computed<ButtonHTMLAttributes>(() => {
  const {
    class: _class,
    style: _style,
    disabled: _disabled,
    type: _type,
    ...rest
  } = attrs as ButtonHTMLAttributes & Record<string, unknown>
  return rest as ButtonHTMLAttributes
})

const externalClass = computed(() => attrs.class)
const externalStyle = computed(() => attrs.style as StyleValue)
const ariaLabel = computed(() => String(attrs['aria-label'] ?? attrs.title ?? 'AI button'))
</script>

<template>
  <button
    v-bind="forwardedAttrs"
    :type="computedType"
    :disabled="isDisabled"
    :aria-label="ariaLabel"
    :aria-busy="loading || undefined"
    :class="[
      'btn-ai',
      `btn-ai--${size}`,
      `btn-ai--${variant}`,
      { 'is-loading': loading, 'is-disabled': isDisabled && !loading },
      externalClass,
    ]"
    :style="externalStyle"
  >
    <span class="btn-ai__ambient" aria-hidden="true"></span>
    <span class="btn-ai__icon" aria-hidden="true"></span>
    <span v-if="loading" class="visually-hidden">Loading</span>
  </button>
</template>

<style scoped>
.btn-ai {
  --ai-border-1: #4285f4;
  --ai-border-2: #34a853;
  --ai-border-3: #fbbc05;
  --ai-border-4: #ea4335;
  --btn-ai-size: 42px;
  --btn-ai-icon-size: 54%;
  position: relative;
  width: var(--btn-ai-size);
  height: var(--btn-ai-size);
  min-width: var(--btn-ai-size);
  min-height: var(--btn-ai-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  background:
    linear-gradient(150deg, rgba(36, 24, 46, 0.98), rgba(20, 42, 63, 0.95)) padding-box,
    linear-gradient(
      120deg,
      var(--ai-border-1),
      var(--ai-border-2),
      var(--ai-border-3),
      var(--ai-border-4),
      var(--ai-border-1)
    )
    border-box;
  background-size: 100% 100%, 280% 280%;
  box-shadow:
    0 10px 18px rgba(19, 13, 27, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease,
    opacity 0.2s ease;
  animation: btnAiBorderFlow 6.8s linear infinite;
  isolation: isolate;
  overflow: hidden;
}

.btn-ai--outline {
  background:
    linear-gradient(150deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.6)) padding-box,
    linear-gradient(
      120deg,
      var(--ai-border-1),
      var(--ai-border-2),
      var(--ai-border-3),
      var(--ai-border-4),
      var(--ai-border-1)
    )
    border-box;
  box-shadow:
    0 8px 14px rgba(26, 14, 24, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.btn-ai__ambient {
  position: absolute;
  inset: -36%;
  z-index: 0;
  background:
    radial-gradient(circle at 28% 24%, rgba(66, 133, 244, 0.3), transparent 42%),
    radial-gradient(circle at 72% 70%, rgba(234, 67, 53, 0.28), transparent 44%);
  opacity: 0.72;
  filter: blur(10px);
  animation: btnAiAmbient 3.5s ease-in-out infinite alternate;
}

.btn-ai__icon {
  position: relative;
  z-index: 1;
  display: block;
  flex: 0 0 auto;
  width: calc(var(--btn-ai-size) * var(--btn-ai-icon-size));
  height: calc(var(--btn-ai-size) * var(--btn-ai-icon-size));
  background: linear-gradient(
    120deg,
    #5ab1ff,
    #42d480,
    #ffd54a,
    #ff7a64,
    #5ab1ff
  );
  background-size: 260% 260%;
  -webkit-mask-image: url('/img/AI/AI_icon.svg');
  mask-image: url('/img/AI/AI_icon.svg');
  -webkit-mask-mode: alpha;
  mask-mode: alpha;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.42));
  animation: btnAiIconFlow 3.9s linear infinite;
}

.btn-ai--xs {
  --btn-ai-size: 28px;
}

.btn-ai--sm {
  --btn-ai-size: 34px;
}

.btn-ai--md {
  --btn-ai-size: 42px;
}

.btn-ai--lg {
  --btn-ai-size: 50px;
}

.btn-ai--xl {
  --btn-ai-size: 58px;
}

.btn-ai:hover:not(:disabled),
.btn-ai:focus-visible:not(:disabled) {
  transform: translateY(-1px) scale(1.04);
  box-shadow:
    0 14px 26px rgba(14, 12, 31, 0.34),
    0 0 0 2px rgba(66, 133, 244, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
  animation-duration: 3.2s;
}

.btn-ai:hover:not(:disabled) .btn-ai__icon,
.btn-ai:focus-visible:not(:disabled) .btn-ai__icon {
  animation-duration: 1.9s;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.56));
}

.btn-ai:focus-visible:not(:disabled) {
  outline: none;
}

.btn-ai:active:not(:disabled) {
  transform: scale(0.95);
  transition-duration: 0.08s;
}

.btn-ai::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-right-color: rgba(66, 133, 244, 0.76);
  opacity: 0;
  pointer-events: none;
  transform: scale(0.9);
}

.btn-ai.is-loading {
  cursor: wait;
}

.btn-ai.is-loading::after {
  opacity: 1;
  transform: scale(1);
  animation: btnAiSpinner 0.86s linear infinite;
}

.btn-ai.is-loading .btn-ai__icon {
  animation:
    btnAiIconFlow 2s linear infinite,
    btnAiPulse 0.88s ease-in-out infinite;
}

.btn-ai:disabled:not(.is-loading) {
  cursor: not-allowed;
  opacity: 0.56;
  filter: grayscale(0.45);
  animation: none;
  box-shadow: none;
  transform: none;
}

.btn-ai:disabled:not(.is-loading) .btn-ai__ambient {
  animation: none;
  opacity: 0.24;
}

.btn-ai:disabled:not(.is-loading) .btn-ai__icon {
  animation: none;
  background: linear-gradient(120deg, #a09ca6, #bcb8c0);
  filter: none;
}

@keyframes btnAiBorderFlow {
  0% {
    background-position: 0 0, 0% 50%;
  }

  100% {
    background-position: 0 0, 220% 50%;
  }
}

@keyframes btnAiIconFlow {
  0% {
    background-position: 0% 50%;
  }

  100% {
    background-position: 220% 50%;
  }
}

@keyframes btnAiAmbient {
  0% {
    transform: translate(-2%, -1%) scale(0.95);
    opacity: 0.6;
  }

  100% {
    transform: translate(3%, 4%) scale(1.08);
    opacity: 0.9;
  }
}

@keyframes btnAiSpinner {
  0% {
    transform: scale(1) rotate(0deg);
  }

  100% {
    transform: scale(1) rotate(360deg);
  }
}

@keyframes btnAiPulse {

  0%,
  100% {
    transform: scale(0.96);
  }

  50% {
    transform: scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {

  .btn-ai,
  .btn-ai__ambient,
  .btn-ai__icon,
  .btn-ai::after {
    animation: none !important;
    transition: none;
  }
}
</style>
