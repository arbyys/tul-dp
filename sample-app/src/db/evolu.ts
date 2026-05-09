import {
  AppName,
  type Evolu,
  type OwnerId,
  type Query,
  type QueryRows,
  type Row,
  createAppOwner,
  createConsole,
  createEvolu,
  createOwnerSecret,
  createOwnerWebSocketTransport,
  createQueryBuilder,
  createRandomBytes,
  emptyArray,
  Mnemonic,
  mnemonicToOwnerSecret,
  testAppOwner,
  type OwnerWebSocketTransport,
} from '@evolu/common'
import type { AppOwner } from '@evolu/common/local-first'
import { useLocalStorage } from '@vueuse/core'
import { createEvoluDeps, createRun } from '@evolu/web'
import { useEvolu, useQuery as evoluVueUseQuery } from '@evolu/vue'
import {
  shallowReadonly,
  shallowRef,
  toValue,
  watchEffect,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'

import { Schema } from './schema'

const isDev = import.meta.env.DEV

export const RELAY_URL = 'wss://relay.arbystools.eu'

export function createSharedOwnerTransport(ownerId: OwnerId): OwnerWebSocketTransport {
  return createOwnerWebSocketTransport({ url: RELAY_URL, ownerId })
}

let evoluDepsInstance: ReturnType<typeof createEvoluDeps> | null = null

export function getEvoluDeps(): ReturnType<typeof createEvoluDeps> {
  if (!evoluDepsInstance) throw new Error('Evolu not initialized')
  return evoluDepsInstance
}

const MNEMONIC_KEY = 'evolu-app-owner-mnemonic'
const appOwnerMnemonic = useLocalStorage<string | null>(MNEMONIC_KEY, null)

function getOrCreateAppOwner(): AppOwner {
  if (isDev) return testAppOwner

  const stored = appOwnerMnemonic.value
  if (stored) {
    const result = Mnemonic.from(stored)
    if (result.ok) return createAppOwner(mnemonicToOwnerSecret(result.value))
  }

  const secret = createOwnerSecret({ randomBytes: createRandomBytes() })
  const owner = createAppOwner(secret)
  if (owner.mnemonic) appOwnerMnemonic.value = owner.mnemonic
  return owner
}

const appOwner = getOrCreateAppOwner()

export let evolu: Evolu<typeof Schema> = null!

export async function initEvolu(): Promise<void> {
  evoluDepsInstance = createEvoluDeps({
    console: createConsole({ level: 'silent', output: { write: () => {} } }),
  })

  const run = createRun(evoluDepsInstance)

  evolu = await run.orThrow(
    createEvolu(Schema, {
      appName: AppName.orThrow('vypujcky'),
      appOwner,
      transports: [
        createOwnerWebSocketTransport({
          url: RELAY_URL,
          ownerId: appOwner.id,
        }),
      ],
    }),
  )
}

export function importAppOwnerMnemonic(mnemonic: string): void {
  appOwnerMnemonic.value = mnemonic
  getEvoluDeps().reloadApp('/')
}

export function resetAppOwnerData(): void {
  const secret = createOwnerSecret({ randomBytes: createRandomBytes() })
  const owner = createAppOwner(secret)

  appOwnerMnemonic.value = owner.mnemonic ?? null

  evolu.useOwner(owner)
  getEvoluDeps().reloadApp('/')
}

export const createQuery = createQueryBuilder(Schema)

export const useQuery = evoluVueUseQuery as <R extends Row>(
  query: Query<typeof Schema, R>,
  options?: Partial<{ readonly once: boolean; readonly promise: Promise<QueryRows<R>> }>,
) => Readonly<Ref<QueryRows<R>>>

export function useReactiveQuery<R extends Row>(
  query: MaybeRefOrGetter<Query<typeof Schema, R> | null>,
): Readonly<Ref<QueryRows<R>>> {
  const evo = useEvolu() as Evolu<typeof Schema>
  const rows = shallowRef<QueryRows<R>>(emptyArray as QueryRows<R>)

  watchEffect((onCleanup) => {
    const q = toValue(query)
    if (!q) {
      rows.value = emptyArray as QueryRows<R>
      return
    }

    let cancelled = false
    void evo.loadQuery(q).then((result) => {
      if (!cancelled) rows.value = result
    })

    const unsubscribe = evo.subscribeQuery(q)(() => {
      rows.value = evo.getQueryRows(q)
    })

    onCleanup(() => {
      cancelled = true
      unsubscribe()
    })
  })

  return shallowReadonly(rows) as Readonly<Ref<QueryRows<R>>>
}
