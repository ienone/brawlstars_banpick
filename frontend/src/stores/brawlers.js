import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBrawlersStore = defineStore('brawlers', () => {
  const brawlers = ref([])

  async function loadBrawlers() {
    try {
      const response = await fetch('/manifest.json')
      const data = await response.json()
      brawlers.value = data.brawlers || []
    } catch (e) {
      console.error('Failed to load manifest.json', e)
      brawlers.value = []
    }
  }

  const getBrawlerById = computed(() => (id) => {
    return brawlers.value.find(b => String(b.bid) === String(id)) || null
  })

  return { brawlers, loadBrawlers, getBrawlerById }
})
