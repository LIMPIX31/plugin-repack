import type { Ident } from '@yarnpkg/core'

export function importRepackProtocol(protocol: Ident) {
  return import(`@plugin-repack/${protocol.scope}`)
}
