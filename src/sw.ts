/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

type NotificationData = Record<string, unknown> & { url?: string }
type NotificationInput = string | (NotificationOptions & { title?: string; data?: NotificationData })
type PushPayload = { notification?: NotificationInput }

function normalizePayload(content: NotificationInput) {
  const base = typeof content === 'string' ? { title: content } : (content || {})
  const title = base.title || 'Nuovo aggiornamento'
  const data = (base.data || {}) as NotificationData
  const url = typeof data.url === 'string' ? data.url : '/'

  const options: NotificationOptions = {
    ...base,
    data: { ...data, url },
    icon: base.icon ?? '/img/logo/pwa.png',
    tag: base.tag ?? `default-${new Date().toISOString().slice(0, 10)}`,
  }

  return { title, options }
}

function getNotificationInput(event: PushEvent): NotificationInput | null {
  if (!event.data) return null

  try {
    const parsed = event.data.json() as unknown

    if (typeof parsed === 'string') {
      return parsed
    }

    if (parsed && typeof parsed === 'object') {
      const payload = parsed as PushPayload

      if ('notification' in payload) {
        return payload.notification || null
      }

      return parsed as NotificationInput
    }

    return null
  } catch {
    try {
      const text = event.data.text()
      return text || null
    } catch {
      return null
    }
  }
}

async function showNotification(title: string, options: NotificationOptions) {
  if (Notification.permission !== 'granted') return
  await self.registration.showNotification(title, options)
}

self.addEventListener('push', (event: PushEvent) => {
  event.waitUntil((async () => {
    const notificationInput = getNotificationInput(event)
    if (!notificationInput) return

    try {
      const { title, options } = normalizePayload(notificationInput)
      await showNotification(title, options)
    } catch {
      await showNotification('Nuovo aggiornamento', {
        body: 'Apri l app per i dettagli',
        data: { url: '/' },
      })
    }
  })())
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  const data = (event.notification.data || {}) as NotificationData
  const targetUrl = typeof data.url === 'string' ? data.url : '/'

  event.notification.close()
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

    for (const client of clients) {
      if (!('focus' in client) || !('navigate' in client)) continue

      const windowClient = client as WindowClient

      try {
        if (new URL(windowClient.url).origin !== self.location.origin) continue
        await windowClient.focus()
        await windowClient.navigate(targetUrl)
        return
      } catch {
        // Ignore broken clients and continue with the next one.
      }
    }

    await self.clients.openWindow(targetUrl)
  })())
})
