<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false });

const DETAILS = [
  { label: 'Route code', example: '01A' },
  { label: 'Route name', example: 'Cicaheum - Ledeng' },
  { label: 'Origin terminal', example: 'Terminal Cicaheum' },
  { label: 'Destination terminal', example: 'Terminal Ledeng' },
  { label: 'Fare', example: 'Rp 6.000' },
  { label: 'Operating hours', example: '05:00 - 21:00' },
  { label: 'Maximum capacity', example: '12 passengers' },
];
</script>

<template>
  <UModal
    v-model:open="open"
    title="How to submit a route request"
    description="Everything the admin needs to review and publish your corridor."
    :ui="{
      content: 'max-w-2xl bg-white!',
      header: 'bg-white!',
      body: 'bg-white!',
      footer: 'bg-white!',
      title: 'text-slate-900',
      description: 'text-slate-500',
    }"
  >
    <template #body>
      <div class="space-y-6 text-sm leading-relaxed text-slate-600">
        <p>
          A route request proposes a new angkot corridor. An admin reviews every request — once
          approved, the route becomes visible to passengers. Prepare the details below before you
          start, and you can finish the form in one sitting.
        </p>

        <section>
          <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#123d8d] text-[11px] font-bold text-white">1</span>
            Gather the route details
          </h3>

          <dl class="mt-3 overflow-hidden rounded-lg border border-slate-200">
            <div
              v-for="(item, index) in DETAILS"
              :key="item.label"
              class="flex items-center justify-between gap-4 px-3 py-2"
              :class="index % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'"
            >
              <dt class="font-medium text-slate-700">{{ item.label }}</dt>
              <dd class="text-xs text-slate-500">{{ item.example }}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#123d8d] text-[11px] font-bold text-white">2</span>
            Find each stop's latitude and longitude
          </h3>

          <ol class="mt-3 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-slate-400">
            <li>Open Google Maps and search for the stop — a terminal, shelter, or a clear landmark.</li>
            <li>Right-click the exact spot on the map (long-press on a phone). A small panel appears with two numbers.</li>
            <li>Click those numbers to copy them. They are written as <span class="font-mono text-slate-700">latitude, longitude</span>.</li>
            <li>
              In the form, put the first number in <strong class="font-semibold text-slate-700">Latitude</strong>
              and the second in <strong class="font-semibold text-slate-700">Longitude</strong>. Keep the minus sign on the latitude.
            </li>
          </ol>

          <div class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <p class="font-medium text-slate-700">Example — Terminal Cicaheum</p>
            <p class="mt-1 font-mono text-slate-600">-6.9031, 107.6575</p>
            <p class="mt-1 text-slate-500">Latitude = -6.9031 · Longitude = 107.6575</p>
          </div>

          <p class="mt-2 text-xs text-slate-500">
            Bandung sits near latitude -6.9 and longitude 107.6, so nearby stops should look similar.
            Use decimal degrees — not degrees, minutes and seconds.
          </p>
        </section>

        <section>
          <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#123d8d] text-[11px] font-bold text-white">3</span>
            Build the travel path
          </h3>

          <p class="mt-3">
            Add every stop with <span class="font-medium text-slate-700">Add stop</span>, in the order the
            vehicle passes them. Use the arrow buttons to reorder and the bin to remove one. A route
            needs at least two stops, and the map path is drawn straight from stop to stop in this order.
          </p>
        </section>

        <section>
          <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#123d8d] text-[11px] font-bold text-white">4</span>
            Submit and wait for review
          </h3>

          <p class="mt-3">
            Choose <span class="font-medium text-slate-700">Submit for review</span>. Your request lands in
            the queue with a <span class="font-medium text-amber-700">Pending</span> status. An admin either
            approves it, or rejects it with a reason you can read on the route's detail page.
          </p>
        </section>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end">
        <UButton
          color="primary"
          icon="i-lucide-check"
          @click="open = false"
        >
          Got it
        </UButton>
      </div>
    </template>
  </UModal>
</template>
