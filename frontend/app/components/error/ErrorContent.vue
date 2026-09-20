<template>
    <h1 class="text-3xl font-bold text-black text-center">{{ title }}</h1>
    <p class="mt-4 text-black text-center">
        {{ description }}
    </p>
</template>

<script setup lang="ts">
defineProps<{
    title: string
    description: string
}>()
</script>

<style lang="scss" scoped>

</style>