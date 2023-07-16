export const activeStyle = ref('default')
export const styles = [{
  name: 'default',
  icon: 'i-fa6-solid:c',
  caption: 'CatsJuice',
}, {
  name: 'macos',
  icon: 'i-fa6-solid:a',
  caption: 'Apple',
}, {
  name: 'rauno',
  icon: 'i-fa6-solid:r',
  caption: 'Rauno',
}]

let ready = false

export function useStyle() {
  const $route = useRoute()
  const $router = useRouter()

  if (!ready) {
    ready = true
    watch(() => $route.query.style, (style) => {
      let index = styles.findIndex(s => s.name === style)
      if (index === -1) {
        $router.replace({ query: { style: 'default' } })
        index = 0
      }
      activeStyle.value = styles[index].name
    }, { immediate: true })
  }

  return { styles, activeStyle }
}
