import { Plugin } from '@yarnpkg/core'
import { RepackResolver } from './resolver'
import { CrateFetcher } from './fetcher'
import { RepackRebuildCommand } from './repack-rebuild.command'

export const plugin: Plugin = {
  commands: [RepackRebuildCommand],
  resolvers: [RepackResolver],
  fetchers: [CrateFetcher],
}
