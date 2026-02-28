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
    variant: 'outline',
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
    <span class="btn-ai__icon-wrap" aria-hidden="true">
      <img class="btn-ai__icon-base" src="/img/AI/AI_icon.svg" alt="" />
      <span class="btn-ai__icon-animated"></span>
      <span v-if="loading" class="spinner-border spinner-border-sm btn-ai__spinner" role="status"></span>
    </span>
    <span v-if="loading" class="visually-hidden">Loading</span>
  </button>
</template>

<style scoped>
.btn-ai {
  --btn-ai-size: 42px;
  --btn-ai-icon-size: 86%;
  position: relative;
  width: var(--btn-ai-size);
  height: var(--btn-ai-size);
  min-width: var(--btn-ai-size);
  min-height: var(--btn-ai-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  margin: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  user-select: none;
  transition: transform 0.18s ease, opacity 0.2s ease;
}

.btn-ai__icon-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  flex: 0 0 auto;
}

.btn-ai__icon-base {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  opacity: 0.2;
  filter: brightness(0) invert(1);
}

.btn-ai__icon-animated {
  position: absolute;
  inset: 0;
  display: block;
  background: linear-gradient(
    118deg,
    #ff4b4b 0%,
    #ff6a88 16%,
    #b34dff 36%,
    #7a5cff 52%,
    #4f7dff 68%,
    #26b8ff 84%,
    #38d39f 100%
  );
  background-size: 250% 250%;
  background-position: 0% 50%;
  animation: btnAiLogoFlow 2.2s ease-in-out infinite alternate;
  -webkit-mask-image: url('/img/AI/AI_icon.svg');
  mask-image: url('/img/AI/AI_icon.svg');
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.42));
  will-change: background-position, filter;
}

.btn-ai__spinner {
  position: absolute;
  inset: 0;
  margin: auto;
  width: calc(var(--btn-ai-size) * 0.42);
  height: calc(var(--btn-ai-size) * 0.42);
  border-width: 0.10em;
  color: #7a5cff;
  z-index: 3;
  pointer-events: none;
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

.btn-ai:hover:not(:disabled) .btn-ai__icon-animated,
.btn-ai:active:not(:disabled) .btn-ai__icon-animated {
  animation-play-state: paused;
}

.btn-ai:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn-ai:active:not(:disabled) {
  transform: scale(0.96);
}

.btn-ai:focus-visible {
  outline: 2px solid rgba(79, 207, 112, 0.65);
  outline-offset: 2px;
}

.btn-ai.is-loading {
  cursor: wait;
}

.btn-ai.is-loading .btn-ai__icon-wrap {
  animation: btnAiPulse 0.92s ease-in-out infinite;
}

.btn-ai.is-loading .btn-ai__icon-animated {
  animation-duration: 0.75s;
  animation-play-state: running;
  opacity: 0.72;
  filter:
    saturate(0.64)
    brightness(0.92)
    drop-shadow(0 0 4px rgba(255, 255, 255, 0.26));
}

.btn-ai:disabled:not(.is-loading) {
  cursor: not-allowed;
  opacity: 0.75;
}

.btn-ai:disabled:not(.is-loading) .btn-ai__icon-base {
  opacity: 0.26;
  filter: brightness(0) invert(1) grayscale(1);
}

.btn-ai:disabled:not(.is-loading) .btn-ai__icon-animated {
  animation-play-state: paused;
  opacity: 0.36;
  filter:
    saturate(0.42)
    brightness(0.84)
    drop-shadow(0 0 3px rgba(255, 255, 255, 0.2));
}

@keyframes btnAiLogoFlow {
  0% {
    background-position: 0% 50%;
  }

  100% {
    background-position: 100% 50%;
  }
}

@keyframes btnAiPulse {
  0%,
  100% {
    transform: scale(0.98);
  }

  50% {
    transform: scale(1.02);
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn-ai,
  .btn-ai__icon-wrap,
  .btn-ai__icon-animated {
    animation: none !important;
    transition: none !important;
  }
}
</style>
