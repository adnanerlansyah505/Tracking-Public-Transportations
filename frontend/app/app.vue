<script setup lang="ts">
const auth = useAuthStore();

// Stays true until we know whether the visitor is signed in, so no page
// (including the login screen) flashes before that is decided.
const booting = ref(true);

onMounted(async () => {
  try {
    // Only restore when there is actually a session to restore. An anonymous
    // visitor must not trigger /auth/me or /auth/refresh.
    if (auth.accessToken || auth.sessionHint) {
      await auth.initialize();
    }
  } finally {
    booting.value = false;
  }
});
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator
      color="#123d8d"
      :height="3"
      :throttle="120"
    />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <Transition name="boot-fade">
      <div
        v-if="booting"
        class="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-[#f5f7fa]"
        role="status"
        aria-live="polite"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 shadow-lg shadow-blue-700/25">
          <img
            src="@/assets/images/logo-white.png"
            alt="AngkotTracker"
            class="h-7 w-7"
          >
        </div>

        <UIcon
          name="i-lucide-loader-circle"
          class="h-6 w-6 animate-spin text-[#123d8d]"
        />

        <p class="text-xs font-medium text-slate-500">
          Loading...
        </p>
      </div>
    </Transition>
  </UApp>
</template>

<style scoped>
.boot-fade-leave-active {
  transition: opacity 0.25s ease;
}

.boot-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .boot-fade-leave-active {
    transition: none;
  }
}
</style>
