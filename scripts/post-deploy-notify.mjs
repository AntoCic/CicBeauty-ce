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

  const body = {
    typeMessage: 'info',
    title: 'Nuova versione rilasciata',
    message: `Deploy completato: ${sourceProjectId} v${version}`,
    sourceProjectId,
    sourceLabel: 'CicBeauty CE',
    updateBy: process.env.DEPLOY_ACTOR || 'deploy-script',
    sendPush: true,
    payload: {
      version,
      sourceProjectId,
      environment: process.env.DEPLOY_ENV || 'production',
      timestamp: new Date().toISOString(),
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
