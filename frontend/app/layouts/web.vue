<template>
  <div class="min-h-screen bg-slate-50">
    <header class="border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <NuxtLink to="/" class="font-bold text-primary-700">AngkotTracker</NuxtLink>
        <UButton to="/login" size="sm">Sign in</UButton>
      </nav>
    </header>
    <main><slot /></main>
  </div>
</template>
