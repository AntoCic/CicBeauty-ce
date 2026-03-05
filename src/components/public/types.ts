import type { RouteLocationRaw } from 'vue-router'

export interface ShowcaseCategory {
  id: string
  title: string
  subtitle?: string
  emoji?: string
  count?: number
  imageUrl?: string
  to: RouteLocationRaw
}

export interface FeaturedShowcaseItem {
  id: string
  title: string
  subtitle?: string
  categoryLabel?: string
  imageUrl?: string
  to: RouteLocationRaw
}

export interface TestimonialItem {
  id: string
  quote: string
  author: string
  role: string
  rating?: number
}

export interface GalleryItem {
  id: string
  imageUrl: string
  alt: string
  title?: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  bio: string
  imageUrl?: string
}

export interface FaqItem {
  id: string
  question: string
  answer: string
}

export interface PublicBreadcrumbItem {
  label: string
  to?: RouteLocationRaw
}

export interface PublicSideLink {
  label: string
  to: RouteLocationRaw
  icon?: string
}
