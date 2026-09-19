export default defineAppConfig({
  ui: {
    button: {
      slots: {
        base: 'text-white hover:text-white'
      },
      variants: {
        variant: {
          solid: 'text-white',
        },
        color: {
          primary: 'text-white',
        }
      },
    },
    select: {
      slots: {
        item: "text-muted"
      }
    },
    dropdownMenu: {
      slots: {
        item: "text-muted"
      }
    },
    colors: {
      primary: 'brand',
      secondary: 'accent',
      neutral: 'slate'
    }
  }
})