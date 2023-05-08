import { Plugin } from '@yarnpkg/core'
import { RepackInstallCommand } from './repack-install.command'
import { CrateResolver } from './resolver'
import { CrateFetcher } from './fetcher'
import { RepackRebuildCommand } from './repack-rebuild.command'

export const plugin: Plugin = {
  commands: [RepackInstallCommand, RepackRebuildCommand],
  resolvers: [CrateResolver],
  fetchers: [CrateFetcher],
}
