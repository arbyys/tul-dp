import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...preset,
    transparent: {
      ...preset.transparent,
      // keep the existing favicon.ico — only generate transparent PNG icons
      favicons: undefined,
    },
  },
  images: ['public/pwa-icon.svg'],
})
