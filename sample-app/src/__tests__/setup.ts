class MockSharedWorker {
  readonly port: MessagePort

  constructor(_scriptURL: string | URL, _options?: string | WorkerOptions) {
    this.port = {
      start() {},
      close() {},
      postMessage() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true
      },
      onmessage: null,
      onmessageerror: null,
    } as unknown as MessagePort
  }
}

if (typeof globalThis.SharedWorker === 'undefined') {
  ;(globalThis as { SharedWorker?: typeof SharedWorker }).SharedWorker =
    MockSharedWorker as unknown as typeof SharedWorker
}
