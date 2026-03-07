<template>
  <v-container class="fill-height login-bg" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <div class="text-center mb-8">
          <div class="text-h3 font-weight-bold mb-2" style="color: #4CAF50;">荒野乱斗</div>
          <div class="text-h5 text-grey-lighten-1">BP System</div>
        </div>
        <v-card class="pa-6" style="background: rgba(26,26,46,0.95); border: 1px solid rgba(76,175,80,0.3);">
          <v-card-title class="text-center text-h6 mb-4">Login</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="username"
                label="Username"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                color="primary"
                class="mb-3"
                :disabled="loading"
              />
              <v-text-field
                v-model="password"
                label="Password"
                prepend-inner-icon="mdi-lock"
                :type="showPass ? 'text' : 'password'"
                :append-inner-icon="showPass ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPass = !showPass"
                variant="outlined"
                color="primary"
                class="mb-4"
                :disabled="loading"
              />
              <v-alert v-if="error" type="error" class="mb-4" variant="tonal">{{ error }}</v-alert>
              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                :loading="loading"
                :disabled="!username || !password"
              >
                Login
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const showPass = ref(false)
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  const result = await authStore.login(username.value, password.value)
  loading.value = false
  if (result.success) {
    router.push('/home')
  } else {
    error.value = result.error || 'Login failed'
  }
}
</script>

<style scoped>
.login-bg {
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
  min-height: 100vh;
}
</style>
