<script setup lang="ts">
import type { RouteStatus } from '~/data/transitData';

type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral';

const props = defineProps<{ status: RouteStatus }>();

const CONFIG: Record<RouteStatus, { label: string; color: BadgeColor; icon: string }> = {
  pending: { label: 'Pending review', color: 'warning', icon: 'i-lucide-clock' },
  approved: { label: 'Approved', color: 'success', icon: 'i-lucide-circle-check' },
  rejected: { label: 'Rejected', color: 'error', icon: 'i-lucide-circle-x' },
};

const current = computed(() => CONFIG[props.status] ?? CONFIG.pending);
</script>

<template>
  <UBadge
    :color="current.color"
    variant="subtle"
    :icon="current.icon"
  >
    {{ current.label }}
  </UBadge>
</template>
