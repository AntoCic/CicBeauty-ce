import { toast } from 'cic-kit'

type AnyError = {
  code?: unknown
  details?: unknown
  message?: unknown
}

export function defaultCatch(err: unknown, fallbackMessage = 'Errore durante la chiamata API'): Error {
  const currentError = (err ?? {}) as AnyError
  let message =
    (typeof currentError.details === 'string' && currentError.details.trim()) ||
    (typeof currentError.message === 'string' && currentError.message.trim()) ||
    fallbackMessage

  if (message === 'internal') {
    message = 'Errore interno'
  }

  toast.danger(message)

  if (import.meta.env.DEV && currentError.code === 'functions/internal') {
    toast.logError('Probabilmente la Cloud Function non e stata deployata o buildata.')
  }

  return new Error(message)
}

export function parseAiError(error: unknown) {
  if (!error) return 'Errore AI inatteso.'
  if (typeof error === 'string') return error

  if (typeof error === 'object') {
    const anyError = error as { message?: unknown; details?: unknown }
    if (typeof anyError.message === 'string' && anyError.message.trim()) {
      return anyError.message
    }
    if (typeof anyError.details === 'string' && anyError.details.trim()) {
      return anyError.details
    }
  }

  return 'Errore AI inatteso.'
}