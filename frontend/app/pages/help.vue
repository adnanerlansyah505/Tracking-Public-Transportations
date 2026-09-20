<script setup lang="ts">
definePageMeta({ layout: 'dashboard', roles: ['admin', 'driver', 'passenger'] });

const auth = useAuthStore();
const guideOpen = ref(false);

const role = computed(() => auth.user?.role ?? 'passenger');

const quickLinks = computed(() => {
  const common = [
    { label: 'Your profile', icon: 'i-lucide-user-round', to: '/dashboard/profile', description: 'Update your personal details and photo.' },
  ];

  if (role.value === 'driver') {
    return [
      { label: 'My route requests', icon: 'i-lucide-map', to: '/dashboard/routes', description: 'Track the routes you proposed.' },
      { label: 'Submit a route request', icon: 'i-lucide-plus', to: '/dashboard/routes/new', description: 'Propose a new corridor for review.' },
      ...common,
    ];
  }

  if (role.value === 'admin') {
    return [
      { label: 'Routes', icon: 'i-lucide-map', to: '/dashboard/routes', description: 'Publish and maintain the network.' },
      { label: 'Route requests', icon: 'i-lucide-inbox', to: '/dashboard/route-requests', description: 'Review driver-submitted routes.' },
      { label: 'Driver requests', icon: 'i-lucide-steering-wheel', to: '/dashboard/driver-requests', description: 'Review vehicle information updates.' },
    ];
  }

  return [
    { label: 'Browse routes', icon: 'i-lucide-map', to: '/dashboard/routes', description: 'See fares, stops and operating hours.' },
    { label: 'Live map', icon: 'i-lucide-radio-tower', to: '/', description: 'Follow angkot vehicles in real time.' },
    ...common,
  ];
});

const FAQS = [
  {
    question: 'Why can’t I sign in yet?',
    answer: 'Driver accounts submitted by form start as pending and need an administrator to activate them. Verify your email address first, then you can sign in once approved. Google sign-ins are ready immediately.',
  },
  {
    question: 'Why is a page unavailable to me?',
    answer: 'Pages are limited by role. Administrators manage routes and requests, drivers manage their own routes and vehicle details, and passengers browse and track. If you believe you should have access, contact an administrator.',
  },
  {
    question: 'How do I update my vehicle information?',
    answer: 'Open your profile and submit an update under “Vehicle & operation”. It is sent for administrator review, and only applies once approved.',
  },
  {
    question: 'A form keeps failing — what should I check?',
    answer: 'Make sure every required field is filled, coordinates are valid numbers, and any uploaded file is the right type and size. The message shown above the form explains what needs fixing.',
  },
];
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-sm font-medium text-[#123d8d]">Support</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-900">
        Help centre
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        Guides and answers for passengers, drivers and administrators.
      </p>
    </div>

    <!-- Quick links -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <NuxtLink
        v-for="link in quickLinks"
        :key="link.to"
        :to="link.to"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
      >
        <div class="flex items-center gap-2">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef4ff] text-[#123d8d]">
            <UIcon
              :name="link.icon"
              class="h-4 w-4"
            />
          </span>
          <span class="text-sm font-semibold text-slate-800">{{ link.label }}</span>
        </div>
        <p class="mt-2 text-xs text-slate-500">
          {{ link.description }}
        </p>
      </NuxtLink>
    </div>

    <!-- Getting started -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-900">
        Getting started
      </h2>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
        <li>Sign in with your email and password, or continue with Google. The Driver tab is for fleet drivers.</li>
        <li>Verify your email address from the link we send after registration.</li>
        <li>Keep your profile up to date — your name, city and phone help administrators reach you.</li>
        <li>Use the sidebar to move between the dashboard, routes, requests and your profile.</li>
      </ul>
    </section>

    <!-- Passenger -->
    <section
      v-if="role === 'passenger'"
      class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 class="text-sm font-semibold text-slate-900">
        For passengers
      </h2>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
        <li>Open <strong class="font-semibold text-slate-700">Routes</strong> to search approved corridors by code, name or stop.</li>
        <li>Open a route to see its stops in order, fare, operating hours and vehicle capacity.</li>
        <li>Open the <strong class="font-semibold text-slate-700">Live map</strong> on the home page to follow angkot vehicles in real time, including speed and estimated arrival.</li>
      </ul>
    </section>

    <!-- Driver -->
    <section
      v-if="role === 'driver'"
      class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <h2 class="text-sm font-semibold text-slate-900">
          For drivers
        </h2>
        <UButton
          icon="i-lucide-circle-help"
          color="neutral"
          variant="soft"
          size="sm"
          @click="guideOpen = true"
        >
          How to submit a route request
        </UButton>
      </div>

      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
        <li>Propose a corridor from <strong class="font-semibold text-slate-700">Routes → Submit route request</strong>. It stays pending until an administrator approves it.</li>
        <li>Add every stop in travel order. To get a stop’s latitude and longitude, right-click the spot in Google Maps and copy the two numbers (latitude first).</li>
        <li>Keep your <strong class="font-semibold text-slate-700">Vehicle &amp; operation</strong> details current from your profile — updates are sent for administrator review.</li>
        <li>If you signed in with Google, add your vehicle information from your profile to complete your account.</li>
      </ul>
    </section>

    <!-- Administrator -->
    <section
      v-if="role === 'admin'"
      class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 class="text-sm font-semibold text-slate-900">
        For administrators
      </h2>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
        <li><strong class="font-semibold text-slate-700">Routes</strong>: publish a new route directly, or edit and remove existing ones.</li>
        <li><strong class="font-semibold text-slate-700">Route requests</strong>: approve a driver’s proposed corridor, or reject it with a reason they can read.</li>
        <li><strong class="font-semibold text-slate-700">Driver requests</strong>: review vehicle and operation updates. Approving applies the change; use the WhatsApp button to reach a driver on their number.</li>
      </ul>
    </section>

    <!-- FAQ -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-900">
        Common questions
      </h2>
      <dl class="mt-4 space-y-4">
        <div
          v-for="faq in FAQS"
          :key="faq.question"
        >
          <dt class="text-sm font-medium text-slate-800">
            {{ faq.question }}
          </dt>
          <dd class="mt-1 text-sm text-slate-600">
            {{ faq.answer }}
          </dd>
        </div>
      </dl>
    </section>

    <!-- Contact -->
    <section class="rounded-xl border border-slate-200 bg-[#f8fafc] p-5">
      <h2 class="text-sm font-semibold text-slate-900">
        Still need help?
      </h2>
      <p class="mt-1 text-sm text-slate-600">
        Reach out to your fleet administrator. Drivers can also be contacted directly from the driver requests queue.
      </p>
    </section>

    <RouteRequestGuide v-model:open="guideOpen" />
  </div>
</template>
