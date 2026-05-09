import { createSharedOwner, Mnemonic, mnemonicToOwnerSecret, type OwnerId } from '@evolu/common'

export function mnemonicToOwnerId(mnemonic: string | null | undefined): OwnerId | null {
  if (!mnemonic) return null
  const result = Mnemonic.from(mnemonic)
  if (!result.ok) return null
  return createSharedOwner(mnemonicToOwnerSecret(result.value)).id
}
