<template>
  <div class="text-8xl text-center text-primary font-black mb-8">
    {{ statusCode }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
    statusCode: number
}>()
</script>

<style lang="scss" scoped>

</style>