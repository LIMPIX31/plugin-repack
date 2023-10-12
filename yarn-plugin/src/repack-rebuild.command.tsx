import { Cache }                from '@yarnpkg/core'
import { Configuration }        from '@yarnpkg/core'
import { formatUtils }          from '@yarnpkg/core'
import { MessageName }          from '@yarnpkg/core'
import { Project }              from '@yarnpkg/core'
import { StreamReport }         from '@yarnpkg/core'
import { structUtils }          from '@yarnpkg/core'
import { ppath }                from '@yarnpkg/fslib'
import { xfs }                  from '@yarnpkg/fslib'
import { Option }               from 'clipanion'

import { fetchCargoWorkspaces } from './crate-utils'
import { RepackBaseCommand }    from './repack-base.command'
import { CrateResolver }        from './resolver'

export class RepackRebuildCommand extends RepackBaseCommand {
	static paths = [['repack', 'rebuild']]

	release = Option.Boolean('-r, --release')

	idents = Option.Rest()

	async execute() {
		const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
		const { project } = await Project.find(configuration, this.context.cwd)
		const cache = await Cache.find(configuration)

		const commandReport = await StreamReport.start(
			{
				configuration,
				stdout: this.context.stdout,
			},
			async (report) => {
				const valid = await this.validateProject(project.cwd, report)

				if (!valid) {
					return
				}

				// eslint-disable-next-line consistent-return
				const stop = await report.startTimerPromise('Cleaning previous build(s)', async () => {
					const workspaces = await fetchCargoWorkspaces(project.cwd)

					for (const { path, manifest } of workspaces!) {
						if (this.idents.length === 0 || this.idents.includes(manifest.package.name) || this.idents.includes('*')) {
							const locator = structUtils.parseLocator(
								`@crate/${manifest.package.name}@${CrateResolver.protocol}${path}`,
							)

							const mirrorEntryPath = cache.getLocatorMirrorPath(locator)
							const cacheEntryPath = cache.getLocatorPath(
								locator,
								project.storedChecksums.get(locator.locatorHash) ?? null,
							)

							if (!mirrorEntryPath && !cacheEntryPath) {
								return true
							}

							project.storedChecksums.delete(locator.locatorHash)

							if (cache.immutable) {
								report.reportError(
									MessageName.IMMUTABLE_CACHE,
									`${formatUtils.pretty(
										configuration,
										ppath.basename(cacheEntryPath ?? mirrorEntryPath!),
										`magenta`,
									)} cannot be rebuild, because the cache is immutable`,
								)
								return true
							}
							if (
								(cacheEntryPath && (await xfs.existsPromise(cacheEntryPath))) ||
								(mirrorEntryPath && (await xfs.existsPromise(mirrorEntryPath)))
							) {
								report.reportInfo(
									MessageName.UNUSED_CACHE_ENTRY,
									`${formatUtils.pretty(configuration, ppath.basename(cacheEntryPath ?? mirrorEntryPath!), `magenta`)}`,
								)
							} else {
								report.reportInfo(
									MessageName.UNNAMED,
									`${formatUtils.pretty(configuration, ppath.basename(cacheEntryPath ?? mirrorEntryPath!), `red`)}`,
								)
							}

							if (mirrorEntryPath) {
								await xfs.removePromise(mirrorEntryPath)
							}

							if (cacheEntryPath) {
								await xfs.removePromise(cacheEntryPath)
							}
						}
					}
				})

				if (stop) {
					return
				}

				if (this.release) {
					configuration.values.set('repack-release', true)
				}

				await project.install({
					report,
					cache,
				})
			},
		)

		return commandReport.exitCode()
	}
}
