<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Chart, type ChartType } from 'chart.js/auto'

export type StatisticheChartDataset = {
  label: string
  data: number[]
  color?: string
}

type ValueMode = 'currency' | 'number' | 'hours'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  type?: ChartType
  labels: string[]
  datasets: StatisticheChartDataset[]
  valueMode?: ValueMode
  emptyMessage?: string
  height?: number
}>(), {
  subtitle: '',
  type: 'bar',
  valueMode: 'number',
  emptyMessage: 'Nessun dato disponibile per il filtro attivo.',
  height: 280,
})

const palette = ['#4b2935', '#198754', '#0d6efd', '#d63384', '#f59e0b', '#0f766e']
const defaultPaletteColor = '#4b2935'
const chartRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const hasData = computed(() => props.labels.length > 0 && props.datasets.length > 0)

watch(
  () => [props.type, props.labels, props.datasets, props.valueMode],
  () => {
    renderChart()
  },
  { deep: true, immediate: true },
)

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

onMounted(() => {
  renderChart()
})

function renderChart() {
  if (!chartRef.value) return
  if (!hasData.value) {
    if (chartInstance) {
      chartInstance.destroy()
      chartInstance = null
    }
    return
  }

  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  chartInstance = new Chart(chartRef.value, {
    type: props.type,
    data: {
      labels: props.labels,
      datasets: props.datasets.map((dataset, index) => {
        const color = dataset.color ?? palette[index % palette.length] ?? defaultPaletteColor
        return {
          label: dataset.label,
          data: dataset.data,
          borderColor: color,
          backgroundColor: withAlpha(color, 0.22),
          borderWidth: 2,
          tension: 0.22,
          pointRadius: props.type === 'line' ? 3 : 0,
          fill: props.type === 'line',
        }
      }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: props.datasets.length > 1,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatTick(Number(value)),
          },
        },
      },
    },
  })
}

function formatTick(value: number) {
  if (props.valueMode === 'currency') {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value)
  }
  if (props.valueMode === 'hours') {
    return `${value.toFixed(1)} h`
  }
  return new Intl.NumberFormat('it-IT').format(Math.round(value))
}

function withAlpha(hex: string, alpha: number) {
  const normalized = String(hex ?? '').trim()
  const match = /^#([0-9a-f]{6})$/i.exec(normalized)
  if (!match) return `rgba(75, 41, 53, ${alpha})`
  const source = match[1] ?? '4b2935'
  const r = Number.parseInt(source.slice(0, 2), 16)
  const g = Number.parseInt(source.slice(2, 4), 16)
  const b = Number.parseInt(source.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}
</script>

<template>
  <section class="card border-0 shadow-sm p-3 mb-2 stats-chart-card">
    <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
      <div>
        <h3 class="h6 mb-1">{{ title }}</h3>
        <p v-if="subtitle" class="small text-muted mb-0">{{ subtitle }}</p>
      </div>
    </div>

    <div v-if="hasData" class="stats-chart-wrap" :style="{ height: `${height}px` }">
      <canvas ref="chartRef"></canvas>
    </div>

    <p v-else class="small text-muted mb-0">{{ emptyMessage }}</p>
  </section>
</template>

<style scoped lang="scss">
.stats-chart-card {
  background:
    radial-gradient(circle at 0% 100%, rgba(84, 44, 58, 0.1) 0%, transparent 40%),
    linear-gradient(155deg, rgba(255, 255, 255, 0.97), rgba(247, 244, 245, 0.97));
}

.stats-chart-wrap {
  width: 100%;
  min-height: 220px;
}
</style>
