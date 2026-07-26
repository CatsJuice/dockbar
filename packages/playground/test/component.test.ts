import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LightBorderFrame from '../src/components/light-border-frame.vue'

describe('light-border-frame.vue', () => {
  it('renders its slot and normalizes size props', () => {
    const wrapper = mount(LightBorderFrame, {
      props: {
        borderWidth: 2,
        radius: 24,
      },
      slots: {
        default: 'Dockbar',
      },
    })

    expect(wrapper.text()).toBe('Dockbar')
    expect(wrapper.attributes('style')).toContain('--light-border-radius: 24px')
    expect(wrapper.attributes('style')).toContain('--light-border-width: 2px')
  })
})
