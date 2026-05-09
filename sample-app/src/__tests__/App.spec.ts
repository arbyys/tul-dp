import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'

vi.mock('@evolu/vue', () => ({
  provideEvolu: vi.fn(),
}))

vi.mock('../db/evolu', () => ({
  evolu: { appOwner: { id: 'test-owner-id', mnemonic: null } },
  createQuery: vi.fn(() => ({})),
  useQuery: vi.fn(() => ref([])),
  getEvoluDeps: vi.fn(() => ({
    evoluError: {
      subscribe: vi.fn(() => vi.fn()),
      get: vi.fn(() => null),
    },
  })),
  createSharedOwnerTransport: vi.fn(),
}))

vi.mock('vue-router', () => ({
  RouterView: { template: '<div data-test="router-view" />' },
  useRouter: () => ({
    push: vi.fn<(path: string) => void>(),
  }),
}))

import App from '../App.vue'

describe('App', () => {
  it('renders application shell header', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('Výpůjčky')
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(true)
  })
})
