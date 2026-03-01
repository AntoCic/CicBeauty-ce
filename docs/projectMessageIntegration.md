#### Integrazione Messaggi Progetto

Questa guida descrive il formato aggiornato dei messaggi progetto.
Il progetto destinatario viene identificato tramite `apiKey` (non tramite `projectId` nel messaggio).

### Struttura messaggio

```ts
type ProjectMessageInput = {
  typeMessage?: string;
  title?: string;
  message: string;
  payload?: Record<string, unknown>;
  sendPush?: boolean;
};
```

Note:
- `typeMessage` default: `info`
- `sendPush` default: `true`

### Endpoint HTTP (integrazione esterna)

Metodo: `POST`  
URL:

```txt
https://europe-west1-hubcortex-33389.cloudfunctions.net/ingestProjectMessage
```

Autenticazione progetto:
- consigliato header `x-project-api-key: <PROJECT_API_KEY>`
- alternativa body `apiKey`

Body esempio:

```json
{
  "typeMessage": "info",
  "title": "Release",
  "message": "E stata rilasciata la nuova versione",
  "payload": {
    "env": "production"
  },
  "sendPush": true
}
```

### Callable Firebase (uso interno UI)

Function: `publishProjectMessage`  
Input richiesto:

```ts
type PublishProjectMessageRequest = {
  apiKey: string;
  typeMessage?: string;
  title?: string;
  message: string;
  payload?: Record<string, unknown>;
  sendPush?: boolean;
};
```

### Esempio cURL rapido

```bash
curl -X POST "https://europe-west1-hubcortex-33389.cloudfunctions.net/ingestProjectMessage" \
  -H "Content-Type: application/json" \
  -H "x-project-api-key: <HUBCORTEX_API_KEY>" \
  -d '{
    "message": "E stata rilasciata la nuova versione",
    "typeMessage": "info",
    "sendPush": true
  }'
```

### Risposta successo

```json
{
  "ok": true,
  "id": "generatedMessageId",
  "projectId": "targetProjectId",
  "typeMessage": "info",
  "sentUsers": 2,
  "sentTokens": 4
}
```

### Risposta errore

```json
{
  "ok": false,
  "error": "Messaggio errore"
}
```
