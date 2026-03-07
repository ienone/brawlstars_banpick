import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  function getBrawlerById(id) {
    return brawlers.value.find(b => String(b.bid) === String(id)) || null
  }

  return { brawlers, loadBrawlers, getBrawlerById }
})
