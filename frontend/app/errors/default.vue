<script setup lang="ts">
const props = defineProps<{
  statusCode?: number
  title?: string
  message?: string
}>()
</script>

<template>

<ErrorContainer>

    <ErrorStatusCode
      :status-code="props?.statusCode ?? 500"
    />

    <ErrorContent
      :title="props?.title ?? 'Terjadi Kesalahan'"
      :description="props?.message ?? 'Terjadi suatu kesalahan pada server, silahkan coba beberapa saat lagi.'"
    />

    <ErrorActions/>

    <ErrorFooter/>

</ErrorContainer>

</template>