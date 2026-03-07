import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          primary: '#4CAF50',
          secondary: '#FF9800',
          surface: '#1a1a2e',
          background: '#0f0f1a',
          error: '#f66e6e',
          warning: '#FF9800',
          info: '#5ab3ff',
          success: '#68fd58',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
})
