# Google Calendar setup (CicBeauty)

Questa guida serve per:
- usare un calendario dedicato (separato dal personale)
- sincronizzare gli appuntamenti da `appointments/*`
- gestire da AppConfig quali email hanno accesso

## 1) Crea un calendario dedicato

In Google Calendar crea un nuovo calendario, ad esempio `CicBeauty - Appuntamenti`.

Poi copia il relativo `Calendar ID` (esempio: `xxxx@group.calendar.google.com`).

## 2) Configura le variabili ambiente delle Functions

La sync backend legge queste env vars:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_CALENDAR_IMPERSONATED_USER` (opzionale)

Note:
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` deve mantenere i newline escaped (`\n`) se salvata su una riga.
- `GOOGLE_CALENDAR_IMPERSONATED_USER` serve solo se vuoi operare "a nome di" un utente Google Workspace con permessi owner/manage sharing sul calendario.

## 3) Condividi il calendario col service account

Condividi il calendario dedicato con `GOOGLE_SERVICE_ACCOUNT_EMAIL`.

Permesso minimo consigliato:
- per sync eventi: `writer` (modifica eventi)

Se vuoi usare anche la sync ACL automatica (lista email da AppConfig), l'identita che chiama l'API deve poter gestire la condivisione del calendario (owner/manage sharing).

## 4) Compila AppConfig

In `App Config > Calendario, Disponibilita e Sync Google`:

- `Sync Google Calendar attivo`: ON
- `Google Calendar ID`: ID calendario dedicato
- `Ruolo accesso email`: `writer` / `reader` / `freeBusyReader`
- `Email abilitate al calendario`: una email per riga (oppure separate da virgola)

## 5) Deploy

Esegui:

```bash
npm run deploy:firebase
```

## 6) Verifica rapida

1. Crea un appuntamento in app.
2. Verifica evento su Google Calendar dedicato.
3. Modifica appuntamento e verifica update.
4. Elimina appuntamento e verifica delete evento.
5. Aggiorna lista email in AppConfig e verifica permessi del calendario.

## Troubleshooting

- Se non appare nulla nel calendario:
  - controlla `googleCalendarSyncEnabled`, `googleCalendarId`, env vars, permessi service account.
- Se gli eventi si syncano ma ACL no:
  - manca permesso di gestione condivisione (owner/manage sharing) per l'identita che chiama l'API.
- Se timezone errata:
  - controlla `businessTimezone` in AppConfig.
