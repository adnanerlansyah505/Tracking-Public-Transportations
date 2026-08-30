<script setup lang="ts">
definePageMeta({ layout: 'web' });

const identifier = ref('');
const password = ref('');
const isSubmitting = ref(false);

async function handleLogin() {
  isSubmitting.value = true;

  try {
    const authStore = useAuthStore();
    await authStore.login({
      identifier: identifier.value,
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
  <div v-if="false" class="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft grid md:grid-cols-2">
      <!-- <div class="bg-slate-900 p-10 text-white">
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
      </div> -->

      <div class="p-8 md:p-12">
        <div class="mb-8">
          <p class="text-sm font-medium text-primary">Sign in</p>
          <h2 class="mt-2 text-3xl font-bold text-slate-900">Access your dashboard</h2>
        </div>

        <form class="space-y-5" @submit.prevent="handleLogin">
          <UFormGroup label="Email, username, or driver ID card">
            <UInput v-model="identifier" type="text" placeholder="you@example.com" class="w-full" />
          </UFormGroup>

          <UFormGroup label="Password">
            <UInput v-model="password" type="password" placeholder="••••••••" class="w-full" />
          </UFormGroup>

          <UButton type="submit" class="w-full text-white" :loading="isSubmitting" color="primary">
            Sign in
          </UButton>

          <UButton type="button" variant="outline" class="w-full" @click="handleGoogleLogin">
            Continue with Google
          </UButton>
        </form>
      </div>
    </div>
  </div>
  <section class="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-32">
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-primary-600">Precision transit management</p>
      <h1 class="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">Public transport, clearly connected.</h1>
      <p class="mt-6 max-w-xl text-lg leading-8 text-slate-600">AngkotTracker helps passengers and drivers stay connected to the routes that move their city.</p>
      <div class="mt-8 flex flex-wrap gap-3">
        <UButton to="/login" size="lg" class="text-white">Sign in</UButton>
        <UButton to="/register" color="neutral" variant="outline" size="lg">Create passenger account</UButton>
      </div>
    </div>
    <div class="rounded-3xl bg-primary-700 p-8 text-white shadow-xl sm:p-12">
      <img src="@/assets/images/logo-white.png" alt="Logo PTA" width="52" class="object-cover">
      <h2 class="mt-6 text-2xl font-bold">A smoother trip starts here.</h2>
      <p class="mt-3 leading-7 text-primary-100">Manage your account, follow your transit system, and join a growing network of passengers and operators.</p>
    </div>
  </section>
</template>
