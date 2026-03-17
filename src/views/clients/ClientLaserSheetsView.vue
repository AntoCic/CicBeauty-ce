<script setup lang="ts">
import { Btn, cicKitStore } from 'cic-kit'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import HeaderApp from '../../components/headers/HeaderApp.vue'
import { computeFitzpatrickScore, resolveFitzpatrickPhototype } from '../../models/laserSheet'
import { clientStore } from '../../stores/clientStore'
import { asDate } from '../../utils/date'
import { matchesPhoneSearch } from '../../utils/phone'

const router = useRouter()
const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle())
const search = ref('')

const laserClientCards = computed(() => {
  const term = search.value.trim().toLowerCase()
  const source = [...clientStore.itemsActiveArray]
    .filter((client) => Boolean(client.schedaLaser && Object.keys(client.schedaLaser).length))
    .sort((a, b) => {
      const numberA = Number(a.schedaLaserNumber ?? 0)
      const numberB = Number(b.schedaLaserNumber ?? 0)
      if (numberA !== numberB) return numberB - numberA
      return `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`, 'it')
    })

  const filtered = term
    ? source.filter((client) => {
        const matchText = [client.name, client.surname, client.email, client.schedaLaserNumber]
          .map((value) => String(value ?? '').toLowerCase())
          .some((value) => value.includes(term))
        if (matchText) return true
        return matchesPhoneSearch(client.phone_number, term)
      })
    : source

  return filtered.map((client) => {
    const score = computeFitzpatrickScore(client.schedaLaser)
    return {
      id: client.id,
      fullName: `${client.name} ${client.surname}`.trim(),
      phone: String(client.phone_number ?? '').trim() || '-',
      sheetNumber: client.schedaLaserNumber || '-',
      sheetDate: formatLaserDate(client.dataSchiedaLaser),
      score,
      phototype: resolveFitzpatrickPhototype(score),
    }
  })
})

function formatLaserDate(value: unknown) {
  const date = asDate(value)
  if (!date) return '-'
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function openLaserSheet(clientId: string) {
  router.push({ name: 'ClientLaserSheetView', params: { id: clientId } })
}

function goToClients() {
  router.push({ name: 'ClientsView' })
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <HeaderApp title="Schede Laser" :to="{ name: 'homeApp' }">
      <div class="app-header__tools">
        <input
          v-model="search"
          class="app-header__search"
          type="search"
          placeholder="Cerca cliente o numero scheda..."
          aria-label="Cerca scheda laser"
        />
        <Btn
          icon="add"
          variant="ghost"
          title="Aggiungi scheda laser a un cliente"
          aria-label="Apri lista clienti per aggiungere scheda laser"
          @click="goToClients"
        />
      </div>
    </HeaderApp>

    <div class="laser-list-shell pb-4">
      <article
        v-for="card in laserClientCards"
        :key="card.id"
        class="laser-client-card"
        role="button"
        tabindex="0"
        @click="openLaserSheet(card.id)"
        @keydown.enter.prevent="openLaserSheet(card.id)"
      >
        <div class="laser-client-card__head">
          <h2 class="laser-client-card__name">{{ card.fullName || 'Cliente senza nome' }}</h2>
          <span class="laser-client-card__badge">Scheda #{{ card.sheetNumber }}</span>
        </div>

        <div class="laser-client-card__meta">
          <span>Data: {{ card.sheetDate }}</span>
          <span>Telefono: {{ card.phone }}</span>
        </div>

        <p class="laser-client-card__score mb-0">
          Fitzpatrick {{ card.score }}/40 | Fototipo {{ card.phototype }}
        </p>
      </article>

      <p v-if="!laserClientCards.length" class="text-muted small mt-2 mb-0">
        Nessuna scheda laser trovata.
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.laser-list-shell {
  max-width: 860px;
  margin: 0 auto;
  padding: 0.5rem 0.55rem;
  display: grid;
  gap: 0.7rem;
}

.laser-client-card {
  border: 1px solid rgba(84, 44, 58, 0.22);
  border-radius: 0.9rem;
  background:
    radial-gradient(circle at 0% 0%, rgba(31, 138, 112, 0.2) 0%, transparent 38%),
    radial-gradient(circle at 100% 100%, rgba(232, 179, 190, 0.28) 0%, transparent 44%),
    linear-gradient(164deg, rgba(255, 255, 255, 0.95), rgba(247, 241, 242, 0.92));
  padding: 0.82rem 0.9rem;
  box-shadow: 0 9px 22px rgba(39, 24, 31, 0.1);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.laser-client-card:hover,
.laser-client-card:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(84, 44, 58, 0.4);
  box-shadow: 0 14px 26px rgba(39, 24, 31, 0.16);
}

.laser-client-card:focus-visible {
  outline: 2px solid rgba(84, 44, 58, 0.5);
  outline-offset: 2px;
}

.laser-client-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.laser-client-card__name {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: #4b2935;
}

.laser-client-card__badge {
  border: 1px solid rgba(84, 44, 58, 0.26);
  border-radius: 999px;
  padding: 0.18rem 0.62rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #5b3845;
  background: rgba(255, 255, 255, 0.88);
}

.laser-client-card__meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  color: #6d4d5a;
  font-size: 0.75rem;
  margin-top: 0.4rem;
}

.laser-client-card__score {
  margin-top: 0.42rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #5c3543;
}
</style>
