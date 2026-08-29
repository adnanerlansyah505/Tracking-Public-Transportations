<script setup lang="ts">
const email = ref('');
const password = ref('');
const isSubmitting = ref(false);

async function handleLogin() {
  isSubmitting.value = true;

  try {
    const authStore = useAuthStore();
    await authStore.loginWithEmail({
      email: email.value,
      password: password.value,
    });

    await navigateTo('/dashboard');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleGoogleLogin() {
  const authStore = useAuthStore();
  await authStore.loginWithGoogle();
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft grid md:grid-cols-2">
      <div class="bg-slate-900 p-10 text-white">
        <div class="mb-10">
          <p class="text-sm uppercase tracking-[0.2em] text-blue-200">Public Transport Tracker</p>
          <h1 class="mt-4 text-4xl font-extrabold">Welcome back</h1>
        </div>

        <div class="space-y-4 text-sm text-slate-300">
          <p>Track routes, monitor trips, and manage user sessions with a clean transport platform.</p>
          <ul class="space-y-2">
            <li>• Secure JWT-based auth</li>
            <li>• Google login ready</li>
            <li>• API-first frontend architecture</li>
          </ul>
        </div>
      </div>

      <div class="p-8 md:p-12">
        <div class="mb-8">
          <p class="text-sm font-medium text-primary">Sign in</p>
          <h2 class="mt-2 text-3xl font-bold text-slate-900">Access your dashboard</h2>
        </div>

        <form class="space-y-5" @submit.prevent="handleLogin">
          <UFormGroup label="Email address">
            <UInput v-model="email" type="email" placeholder="you@example.com" class="w-full" />
          </UFormGroup>

          <UFormGroup label="Password">
            <UInput v-model="password" type="password" placeholder="••••••••" class="w-full" />
          </UFormGroup>

          <UButton type="submit" class="w-full" :loading="isSubmitting" color="primary">
            Sign in
          </UButton>

          <UButton type="button" variant="outline" class="w-full" @click="handleGoogleLogin">
            Continue with Google
          </UButton>
        </form>
      </div>
    </div>
  </div>
</template>
