import { Descriptor }           from '@yarnpkg/core'
import { formatUtils }          from '@yarnpkg/core'
import { LinkType }             from '@yarnpkg/core'
import { Locator }              from '@yarnpkg/core'
import { MessageName }          from '@yarnpkg/core'
import { miscUtils }            from '@yarnpkg/core'
import { Package }              from '@yarnpkg/core'
import { ResolveOptions }       from '@yarnpkg/core'
import { Resolver }             from '@yarnpkg/core'
import { semverUtils }          from '@yarnpkg/core'
import { structUtils }          from '@yarnpkg/core'
import { PortablePath }         from '@yarnpkg/fslib'
import { ppath }                from '@yarnpkg/fslib'

import { fetchCargoWorkspaces } from './crate-utils'
import { readCargoToml }        from './crate-utils'

export class CrateResolver implements Resolver {
	static protocol = 'crate:'

	supportsDescriptor(descriptor: Descriptor, { report, project }: ResolveOptions): boolean {
		const validRange = descriptor.range.startsWith(CrateResolver.protocol)
		const validScope = descriptor.scope === 'crate'

		if (!validScope) {
			report.reportError(
				MessageName.UNNAMED,
				`You need to explicitly specify scope: ${formatUtils.pretty(project.configuration, '@crate/', 'green')}${
					descriptor.name
				}`,
			)
		}

		return validRange && validScope
	}

	supportsLocator(locator: Locator, { report, project }: ResolveOptions): boolean {
		const validReference = locator.reference.startsWith(CrateResolver.protocol)
		const validScope = locator.scope === 'crate'

		if (!validScope) {
			report.reportError(
				MessageName.UNNAMED,
				`You need to explicitly specify scope: ${formatUtils.pretty(project.configuration, '@crate/', 'green')}${
					locator.name
				}`,
			)
		}

		return validReference && validScope
	}

	shouldPersistResolution(locator: Locator, opts: ResolveOptions): boolean {
		return false
	}

	bindDescriptor(descriptor: Descriptor, fromLocator: Locator, opts: ResolveOptions): Descriptor {
		return descriptor
	}

	getResolutionDependencies(descriptor: Descriptor, opts: ResolveOptions): Record<string, Descriptor> {
		return {}
	}

	async getCandidates(
		descriptor: Descriptor,
		dependencies: Record<string, Package>,
		opts: ResolveOptions,
	): Promise<Array<Locator>> {
		const range = semverUtils.validRange(descriptor.range.slice(CrateResolver.protocol.length))

		if (range === null) {
			throw new Error(`Expected a valid range, got ${descriptor.range.slice(CrateResolver.protocol.length)}`)
		}

		const workspaces = await fetchCargoWorkspaces(opts.project.cwd)

		if (!workspaces) {
			return []
		}

		const candidates = miscUtils.mapAndFilter(workspaces, (workspace) => {
			if (workspace.manifest.package.name !== descriptor.name) {
				return miscUtils.mapAndFilter.skip
			}

			try {
				const candidate = new semverUtils.SemVer(workspace.manifest.package.version)

				if (range.test(candidate)) {
					return { candidate, ...workspace }
				}
			} catch {
				/** @ignore */
			}

			return miscUtils.mapAndFilter.skip
		})

		candidates.sort(({ candidate: a }, { candidate: b }) => -a.compare(b))

		return candidates.map((workspace) =>
			structUtils.makeLocator(descriptor, `${CrateResolver.protocol}${workspace.path}`))
	}

	async getSatisfying(
		descriptor: Descriptor,
		dependencies: Record<string, Package>,
		locators: Array<Locator>,
		opts: ResolveOptions,
	): Promise<{
		locators: Array<Locator>
		sorted: boolean
	}> {
		const range = semverUtils.validRange(descriptor.range.slice(CrateResolver.protocol.length))

		if (range === null) {
			throw new Error(`Expected a valid range, got ${descriptor.range.slice(CrateResolver.protocol.length)}`)
		}

		const [locator] = await this.getCandidates(descriptor, dependencies, opts)

		return {
			locators: locators.filter((candidate) => candidate.locatorHash === locator.locatorHash),
			sorted: false,
		}
	}

	async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
		const workspacePath = ppath.join(
			opts.project.cwd,
			locator.reference.slice(CrateResolver.protocol.length) as PortablePath,
		)

		const manifest = await readCargoToml(workspacePath)

		return {
			...locator,

			version: manifest!.package.version ?? '0.0.0',

			languageName: 'node',
			linkType: LinkType.HARD,

			dependencies: new Map(),
			peerDependencies: new Map(),
			dependenciesMeta: new Map(),
			peerDependenciesMeta: new Map(),

			bin: new Map(),
		}
	}
}
