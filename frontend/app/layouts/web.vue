<template>
  <div class="min-h-screen bg-slate-50">
    <header class="border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <NuxtLink to="/" class="font-bold text-primary flex items-center gap-1">
          <img src="@/assets/images/logo-dark.png" alt="Logo PTA" width="48" class="object-cover">
          AngkotTracker
        </NuxtLink>
        <UButton to="/login" size="sm" class="text-white">Sign in</UButton>
      </nav>
    </header>
    <main><slot /></main>
  </div>
</template>
