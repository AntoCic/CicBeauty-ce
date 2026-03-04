import type { MotionVariants, Transition } from '@vueuse/motion'

export type MotionPresetName =
  | 'fadeUp'
  | 'fadeIn'
  | 'slideLeft'
  | 'scaleIn'
  | 'staggerChildren'
  | 'hoverLift'
  | 'tapScale'
  | 'softSpring'

export type MotionPresetMap = Record<MotionPresetName, MotionVariants<never>>

type EasingTuple = [number, number, number, number]

const EASE_OUT: EasingTuple = [0.16, 1, 0.3, 1]
const SOFT_DURATION = 0.48

function buildTweenTransition(duration = SOFT_DURATION, delay = 0): Transition {
  return {
    duration,
    ease: EASE_OUT,
    delay,
  }
}

function buildSpringTransition(stiffness = 190, damping = 24, mass = 0.88): Transition {
  return {
    type: 'spring',
    stiffness,
    damping,
    mass,
  }
}

function reduceTransitionIfNeeded(reduceMotion: boolean, fallback: Transition): Transition {
  if (!reduceMotion) return fallback
  return { duration: 0 }
}

export function createMotionPresets(reduceMotion = false): MotionPresetMap {
  const fadeUpDistance = reduceMotion ? 0 : 26
  const slideDistance = reduceMotion ? 0 : 32
  const scaleFrom = reduceMotion ? 1 : 0.96
  const hoverLiftY = reduceMotion ? 0 : -6
  const tapScaleValue = reduceMotion ? 1 : 0.975

  return {
    fadeUp: {
      initial: { opacity: 0, y: fadeUpDistance },
      enter: { opacity: 1, y: 0, transition: reduceTransitionIfNeeded(reduceMotion, buildTweenTransition()) },
    },
    fadeIn: {
      initial: { opacity: 0 },
      enter: { opacity: 1, transition: reduceTransitionIfNeeded(reduceMotion, buildTweenTransition(0.4)) },
    },
    slideLeft: {
      initial: { opacity: 0, x: slideDistance },
      enter: {
        opacity: 1,
        x: 0,
        transition: reduceTransitionIfNeeded(reduceMotion, buildTweenTransition(0.44)),
      },
    },
    scaleIn: {
      initial: { opacity: 0, scale: scaleFrom, y: fadeUpDistance * 0.35 },
      enter: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: reduceTransitionIfNeeded(reduceMotion, buildSpringTransition()),
      },
    },
    staggerChildren: {
      initial: { opacity: 0, y: reduceMotion ? 0 : 10 },
      enter: {
        opacity: 1,
        y: 0,
        transition: reduceTransitionIfNeeded(reduceMotion, buildTweenTransition(0.34, 0.04)),
      },
    },
    hoverLift: {
      initial: {
        y: 0,
        scale: 1,
        boxShadow: '0 8px 20px rgba(25, 14, 20, 0.1)',
      },
      hovered: {
        y: hoverLiftY,
        scale: reduceMotion ? 1 : 1.01,
        boxShadow: '0 16px 30px rgba(25, 14, 20, 0.16)',
        transition: reduceTransitionIfNeeded(reduceMotion, buildSpringTransition(220, 24, 0.86)),
      },
      tapped: {
        scale: tapScaleValue,
        transition: reduceTransitionIfNeeded(reduceMotion, buildTweenTransition(0.1)),
      },
    },
    tapScale: {
      initial: { scale: 1 },
      tapped: {
        scale: tapScaleValue,
        transition: reduceTransitionIfNeeded(reduceMotion, buildTweenTransition(0.08)),
      },
      hovered: {
        scale: reduceMotion ? 1 : 1.01,
        transition: reduceTransitionIfNeeded(reduceMotion, buildTweenTransition(0.18)),
      },
    },
    softSpring: {
      initial: { opacity: 0.001, y: reduceMotion ? 0 : 14 },
      enter: {
        opacity: 1,
        y: 0,
        transition: reduceTransitionIfNeeded(reduceMotion, buildSpringTransition(170, 22, 0.9)),
      },
    },
  }
}

export function getStaggerDelay(index: number, step = 0.07): number {
  return Math.max(0, index) * step
}
