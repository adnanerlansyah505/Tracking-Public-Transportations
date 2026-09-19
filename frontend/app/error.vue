<script setup lang="ts">
import { computed } from "vue"
import { 
  // getErrorContext, 
  getErrorContent 
} from "~/shared/error-handling"
import DefaultError from "./errors/default.vue"

const props = defineProps<{
  error: any
}>()

const route = useRoute()

const statusCode = computed(() =>
  props.error?.statusCode ??
  props.error?.status ??
  500
)

const page = computed(() => {

  // const context = getErrorContext(route)

  return (
    // errorRegistry.resolve({
    //   statusCode: statusCode.value,
    //   module: context.module,
    //   plugin: context.plugin
    // })
    // ??
    {
      component: DefaultError
    }
  )
})

const content = computed(() =>
  getErrorContent(statusCode.value)
)

const title = computed(() =>
  content.value.title
)

const message = computed(() =>
  props.error?.message ??
  props.error?.statusMessage ??
  content.value.description
)

// Set page metadata (title, meta tags)
useHead({
  title: `${statusCode.value} - ${title.value}`,
  meta: [
    {
      name: 'description',
      content: message.value
    },
    {
      property: 'og:title',
      content: title.value
    },
    {
      property: 'og:description',
      content: message.value
    },
    {
      name: 'twitter:title',
      content: title.value
    },
    {
      name: 'twitter:description',
      content: message.value
    }
  ]
})
</script>

<template>

  <component
    :is="page.component"
    :error="error"
    :status-code="statusCode"
    :title="title"
    :message="message"
  />

</template>
