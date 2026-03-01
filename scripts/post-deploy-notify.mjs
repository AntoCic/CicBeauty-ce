import process from 'node:process'
import { readFile } from 'node:fs/promises'

const INGEST_ENDPOINT =
  process.env.HUBCORTEX_INGEST_ENDPOINT || 'https://europe-west1-hubcortex-33389.cloudfunctions.net/ingestProjectMessage'

async function main() {
  const apiKey = process.env.HUBCORTEX_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('Missing HUBCORTEX_API_KEY environment variable.')
  }

  const packageRaw = await readFile(new URL('../package.json', import.meta.url), 'utf8')
  const packageJson = JSON.parse(packageRaw)
  const version = String(packageJson.version || 'unknown')
  const sourceProjectId = String(packageJson.name || 'cicbeauty-ce')
  const notifyTypeMessage = normalizeOptional(process.env.NOTIFY_TYPE_MESSAGE) || 'info'
  const notifyTitle = normalizeOptional(process.env.NOTIFY_TITLE) || 'Nuova versione rilasciata'
  const notifyMessage =
    normalizeOptional(process.env.NOTIFY_MESSAGE) || `Deploy completato: ${sourceProjectId} v${version}`
  const notifyPayload = readOptionalJsonObject(process.env.NOTIFY_PAYLOAD_JSON, 'NOTIFY_PAYLOAD_JSON')
  const notifySendPush = readOptionalBoolean(process.env.NOTIFY_SEND_PUSH, 'NOTIFY_SEND_PUSH') ?? true

  const body = {
    typeMessage: notifyTypeMessage,
    title: notifyTitle,
    message: notifyMessage,
    apiKey,
    sendPush: notifySendPush,
    payload: {
      version,
      project: sourceProjectId,
      environment: process.env.DEPLOY_ENV || 'production',
      actor: process.env.DEPLOY_ACTOR || 'deploy-script',
      gitRef: process.env.DEPLOY_REF_NAME || '',
      gitSha: process.env.DEPLOY_SHA || '',
      workflowRunUrl: process.env.DEPLOY_RUN_URL || '',
      timestamp: new Date().toISOString(),
      ...(notifyPayload || {}),
    },
  }

  const response = await fetch(INGEST_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-project-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = { raw: text }
  }

  if (!response.ok || parsed?.ok === false) {
    throw new Error(
      `Failed to publish release message (status ${response.status}): ${JSON.stringify(parsed)}`,
    )
  }

  console.log(`Release notification sent (${response.status}).`)
  console.log(JSON.stringify(parsed, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

function normalizeOptional(value) {
  const normalized = String(value ?? '').trim()
  return normalized || ''
}

function readOptionalBoolean(value, key) {
  const normalized = normalizeOptional(value).toLowerCase()
  if (!normalized) return undefined
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  throw new Error(`${key} must be "true" or "false".`)
}

function readOptionalJsonObject(value, key) {
  const normalized = normalizeOptional(value)
  if (!normalized) return undefined

  let parsed
  try {
    parsed = JSON.parse(normalized)
  } catch {
    throw new Error(`${key} must be a valid JSON object string.`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${key} must be a JSON object.`)
  }

  return parsed
}
