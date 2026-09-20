<template>
  <div class="flex justify-center gap-4 mt-10">
    <UButton color="neutral" variant="soft" @click="handleBack">
        Kembali
    </UButton>
    <UButton to="/">Beranda</UButton>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

const handleBack = () => {
  router.back()
}

</script>

<style lang="scss" scoped>

</style>