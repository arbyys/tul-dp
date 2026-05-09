import { installPolyfills } from '@evolu/common/polyfills'
installPolyfills()

import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import { initEvolu } from './db/evolu'
import './App.css'

registerSW({ immediate: true })

initEvolu()
  .then(() => {
    const app = createApp(App)
    app.use(router)
    app.mount('#app')
  })
  .catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    const isSharedWorker = msg.includes('SharedWorker') || msg.toLowerCase().includes('sharedworker')
    const detail = isSharedWorker
      ? 'Tento prohlížeč nepodporuje SharedWorker, který aplikace vyžaduje. Zkuste Chrome nebo Firefox na desktopu, případně Firefox pro Android.'
      : 'Aplikace vyžaduje OPFS úložiště. Anonymní (inkognito) okno Chrome toto úložiště nepodporuje — otevřete stránku v normálním okně prohlížeče. Jinak se ujistěte, že prohlížeč podporuje OPFS (Chrome/Edge 102+, Safari 16.4+) a stránka je otevřena přes HTTPS.'
    document.body.innerHTML = `<div style="font-family:sans-serif;padding:2rem;color:#b91c1c">
      <h2>Aplikace nepodporována tímto prohlížečem</h2>
      <p style="margin-top:0.5rem;font-size:0.9rem">${detail}</p>
      <pre style="white-space:pre-wrap;font-size:0.75rem;margin-top:1rem;opacity:0.6">${msg}</pre>
    </div>`
  })
