<script setup lang="ts">
definePageMeta({ layout: 'auth' });

const auth = useAuthStore();
const { message } = useApiError();
const route = useRoute();
const accountType = ref<'passenger' | 'driver'>('passenger');
const identifier = ref('');
const password = ref('');
const error = ref('');
const submitting = ref(false);
const showPassword = ref(false);

async function submit() {
  error.value = '';

  const cleanIdentifier = identifier.value.trim();
  const cleanPassword = password.value;

if (!cleanIdentifier || !cleanPassword) {
    error.value = 'Enter your email or username and password.';
    return;
  }

  if (cleanPassword.length < 8) {
    error.value = 'Password must be at least 8 characters.';
    return;
  }

  submitting.value = true;
  try {
    await auth.login({ identifier: cleanIdentifier, password: cleanPassword }, accountType.value);
    await navigateTo('/dashboard');
  } catch (cause) {
    error.value = message(cause, 'Unable to sign in with those credentials.');
  } finally {
    submitting.value = false;
  }
}

function switchType(type: 'passenger' | 'driver') {
  accountType.value = type;
  identifier.value = '';
  password.value = '';
  error.value = '';
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-brand">
      <img class="auth-brand__icon" src="@/assets/images/logo-white.png"></img>
      <h1 class="auth-brand__title">AngkotTracker</h1>
      <p class="auth-brand__subtitle">Precision transit management system</p>
    </div>

    <UCard class="auth-card">
      <UAlert
        v-if="route.query['driver-pending'] === '1'"
        class="mb-5"
        color="info"
        title="Application under review"
        description="Your driver account has been submitted and must be approved by an administrator before you can sign in."
      />

      <div class="auth-tab-switch">
        <button class="auth-tab" :class="accountType === 'passenger' ? 'is-active' : ''" @click="switchType('passenger')" type="button">Passenger</button>
        <button class="auth-tab" :class="accountType === 'driver' ? 'is-active' : ''" @click="switchType('driver')" type="button">Driver</button>
      </div>

      <form class="auth-form px-3" @submit.prevent="submit">
        <UFormField :label="accountType === 'driver' ? 'Driver ID, email, or username' : 'Email or username'" class="auth-field">
          <UInput v-model="identifier" class="auth-input w-full" autocomplete="username" :placeholder="accountType === 'driver' ? 'Enter your driver ID' : 'Enter your credentials'" />
        </UFormField>

        <UFormField label="Password" class="auth-field">
          <div class="auth-password-wrap">
            <UInput v-model="password" class="auth-input w-full" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Enter your password" />
            <button class="auth-password-toggle" type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
          </div>
        </UFormField>

        <p v-if="error" class="auth-error">{{ error }}</p>
        <button class="google-auth-button" type="button" @click="auth.loginWithGoogle()">Continue with Google</button>
        <UButton class="auth-submit" type="submit" :loading="submitting" :ui="{ base: 'flex items-center gap-2' }">Sign in</UButton>
      </form>

      <div class="auth-form-divider" />
      <p class="auth-footer-text pb-3">
        New to the fleet?
        <NuxtLink :to="accountType === 'driver' ? '/register/driver' : '/register'">Register as a New {{ accountType === 'driver' ? 'Driver' : 'Passenger' }}</NuxtLink>
      </p>
    </UCard>
  </section>
</template>
