import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { useAuthStore } from '@/stores/auth'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Restore the PocketBase session from localStorage before any navigation
// guard runs, so protected routes are accessible on hard refresh.
useAuthStore().restoreSession()

app.use(router)
app.use(vuetify)
app.mount('#app')
