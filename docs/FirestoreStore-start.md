# FirestoreStore.start + useStoreWatch

Guida pratica su come usare `useStoreWatch` e `FirestoreStore.start()` in modo corretto, con focus su realtime, query options e lifecycle.

## Obiettivo

Questi due pezzi lavorano insieme:

- `useStoreWatch` decide *quando* attivare o fermare i listener (`start`/`stop`) in base a login e lifecycle Vue.
- `FirestoreStore.start` decide *cosa* ascoltare in realtime (query Firestore) e come sincronizzare `items` locali.

## Mappa rapida

- `useStoreWatch(...)`:
  - monta una `watch` su `_Auth?.isLoggedIn`
  - su ogni cambio login avvia/ferma gli store passati
  - su unmount chiude tutti i listener
- `store.start(opts)`:
  - valida le opzioni query
  - evita restart se la query e uguale alla precedente
  - crea `onSnapshot` e mantiene aggiornato `store.items`
- `store.stop()`:
  - chiude listener realtime
  - resetta stato interno del live (`prevStartQuery`, `isFirstRun`)

## useStoreWatch: comportamento reale

Signature:

```ts
useStoreWatch(
  stores: readonly {
    store: AnyFirestoreStoreReactive
    getOpts?: GetProps
    getAuthOpts?: GetProps
    checkLogin?: boolean
  }[],
  defaultCheckLogin: boolean = true
)
```

Regole:

- Se `logged === true`: usa `store.start(getAuthOpts ?? getOpts)`.
- Se `logged === false`:
  - se `checkLogin` (o default) e `true`: `store.stop()`
  - se `checkLogin` e `false`: `store.start(getOpts)`

Precedenze:

- `checkLogin` sul singolo store ha priorita su `defaultCheckLogin`.
- `getAuthOpts` ha priorita su `getOpts` quando utente loggato.

Lifecycle:

- `onBeforeMount`: attiva watch login con `{ immediate: true }`.
- `onBeforeUnmount`: stoppa watch login + `stop()` su tutti gli store.

## start() vs get(): differenza fondamentale

- `start(opts)` = realtime listener continuo (`onSnapshot`).
- `get(opts)` = fetch one-shot (`getDocs`) senza ascolto continuo.

Usa `start` per UI che deve aggiornarsi live (es. calendario).  
Usa `get` per operazioni puntuali o viste statiche (es. edit dettaglio singolo).

## GetProps: cosa puoi passare a start()

```ts
interface GetProps {
  ids?: string[]
  lastByCreate?: number
  lastByUpdate?: number
  query?: QueryConstraint | QueryConstraint[]
  limit?: number
  orderBy?: { fieldPath: string | FieldPath; directionStr?: OrderByDirection }
  forceLocalSet?: boolean
  localSet?: boolean
}
```

Significato pratico:

- `ids`: filtra per document id (`documentId()`).
- `query`: vincoli Firestore custom (`where`, ecc).
- `orderBy` + `limit`: ordinamento e limite.
- `lastByCreate` / `lastByUpdate`: shortcut per ultimi N in ordine desc su timestamp standard.
- `forceLocalSet`: svuota cache `items` + LocalStorage al primo snapshot e risincronizza.
- `localSet`: abilita/disabilita sync LocalStorage (se supportato dal model).

## Validazioni importanti (validateQueryGetOpts)

Combinazioni non permesse:

- `ids` insieme a `query`
- `ids.length > 10` in `start` (limite `in` query)
- `lastByCreate` insieme a `lastByUpdate`
- `lastByCreate` o `lastByUpdate` insieme a `limit`/`orderBy`

Quando una regola fallisce:

- viene mostrato `toast.logError(...)`
- `start()` esce subito senza aprire listener

## Come start() costruisce e gestisce il listener

Flusso interno:

1. log debug (`debugLog`).
2. validazione opzioni.
3. calcolo `currentQueryKey` da `ids/query/limit/orderBy`.
4. se store e gia live e la chiave query e uguale: non fa nulla.
5. altrimenti `stop()` del listener precedente.
6. costruzione constraints (`buildConstraintsFromGetProps`).
7. apertura `onSnapshot(...)`.
8. aggiornamento incrementale di `items` su `docChanges()`.

### Dedup query (anti restart inutile)

`start()` salva una chiave (`prevStartQuery`) della query attiva.  
Se richiami `start()` con stessi parametri mentre e gia live, evita restart.

## onSnapshot: come aggiorna store.items

Su ogni change:

- `removed`:
  - esegue `localSet(true)` sull'istanza se presente
  - rimuove da `items`
- `added` / `modified`:
  - crea model instance (`makeModel`)
  - passa da `onGetBeforeStoreSet`
  - upsert in `items`
  - sync LocalStorage se `canLocalSave(localSet)`

## isFirstRun + onStartFirstRun

Al primo payload snapshot:

- `isFirstRun` passa da `true` a `false`
- viene chiamato `onStartFirstRun(snapDocs, forceLocalSet)`
- se `forceLocalSet === true`:
  - `items = {}`
  - `localClear()`

`onStartFirstRun` e pensato per override in store custom se vuoi logica extra all'avvio realtime.

## stop(): cosa resetta

Quando chiami `stop()`:

- chiude unsubscribe Firestore (`snapshotFnStop()`).
- mette `snapshotFnStop = null`.
- resetta `prevStartQuery = null`.
- resetta `isFirstRun = true`.

Quindi il prossimo `start()` riparte pulito.

## buildConstraintsFromGetProps: strategia di costruzione query

Ordine logico:

1. `ids` (con `documentId() ==` oppure `in`) oppure `query`.
2. se `lastByCreate`: aggiunge `orderBy(createdAt, desc)` + `limit(N)` e termina.
3. se `lastByUpdate`: aggiunge `orderBy(updatedAt, desc)` + `limit(N)` e termina.
4. opzionale `orderBy`.
5. opzionale `limit`.

Nota:

- quando usi `query` con piu `where`, eventuali indici composti Firestore sono responsabilita del progetto.

## Pattern d'uso consigliati

### 1) Store protetto da login (default)

```ts
useStoreWatch([
  {
    store: appointmentStore,
    getAuthOpts: {
      query: where("user_id", "==", uid),
      orderBy: { fieldPath: "date_time", directionStr: "asc" },
    },
  },
]);
```

### 2) Store pubblico anche da guest

```ts
useStoreWatch([
  {
    store: publicStore,
    checkLogin: false,
    getOpts: { limit: 50 },
  },
]);
```

### 3) Query per intervallo temporale

```ts
useStoreWatch([
  {
    store: appointmentStore,
    getAuthOpts: {
      query: [
        where("date_time", ">=", fromTs),
        where("date_time", "<", toTs),
      ],
      orderBy: { fieldPath: "date_time", directionStr: "asc" },
    },
  },
]);
```

### 4) Stop del watch in viste che non servono realtime

Se una vista non ha bisogno di aggiornamenti live, non usare `useStoreWatch` li dentro.  
Fai `get()` puntuale o `getOne()` su id specifico.

## Relazione con LocalStorage

Il sync locale dipende dal model:

- `localSet` funziona solo se il model espone `localStorageKey()`.
- `forceLocalSet` forza reset + riscrittura.

Se il model non supporta local storage, il realtime funziona comunque su `items`.

## Checklist operativa

1. Model con `collectionName` (o store con `collectionPath`).
2. Query valida secondo regole `validateQueryGetOpts`.
3. Usa `getAuthOpts` quando cambia filtro tra guest/logged.
4. Evita di richiamare `start` con query equivalenti in loop.
5. Ricordati che `useStoreWatch` fa gia cleanup automatico su unmount.

## Quando usare cosa

- `useStoreWatch`:
  - viste Vue che vivono a componente e devono allinearsi a login lifecycle.
- `store.start()` manuale:
  - casi avanzati controllati da un manager/composable custom.
- `store.get()` / `getOne()`:
  - fetch una tantum, nessun realtime continuo.

