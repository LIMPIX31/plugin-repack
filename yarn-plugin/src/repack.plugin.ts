import { Plugin }               from '@yarnpkg/core'

import { CrateFetcher }         from './fetcher'
import { RepackInstallCommand } from './repack-install.command'
import { RepackRebuildCommand } from './repack-rebuild.command'
import { CrateResolver }        from './resolver'

export const plugin: Plugin = {
	commands: [RepackInstallCommand, RepackRebuildCommand],
	resolvers: [CrateResolver],
	fetchers: [CrateFetcher],
}
