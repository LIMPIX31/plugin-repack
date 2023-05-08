import {
  Descriptor,
  LinkType,
  Locator,
  MinimalResolveOptions,
  miscUtils,
  Package,
  ResolveOptions,
  Resolver,
  semverUtils,
  structUtils,
} from '@yarnpkg/core'
import { fetchCargoWorkspaces } from './crateUtils'

export class CrateResolver implements Resolver {
  static protocol = 'crate:'

  supportsDescriptor(descriptor: Descriptor, opts: MinimalResolveOptions): boolean {
    return descriptor.range.startsWith(CrateResolver.protocol)
  }

  supportsLocator(locator: Locator, opts: MinimalResolveOptions): boolean {
    return locator.reference.startsWith(CrateResolver.protocol)
  }

  shouldPersistResolution(locator: Locator, opts: MinimalResolveOptions): boolean {
    return false
  }

  bindDescriptor(descriptor: Descriptor, fromLocator: Locator, opts: MinimalResolveOptions): Descriptor {
    return descriptor
  }

  getResolutionDependencies(descriptor: Descriptor, opts: MinimalResolveOptions): Record<string, Descriptor> {
    return {}
  }

  async getCandidates(descriptor: Descriptor, dependencies: Record<string, Package>, opts: ResolveOptions): Promise<Array<Locator>> {
    const range = semverUtils.validRange(descriptor.range.slice(CrateResolver.protocol.length))

    if (range === null) {
      throw new Error(`Expected a valid range, got ${descriptor.range.slice(CrateResolver.protocol.length)}`)
    }

    const workspaces = await fetchCargoWorkspaces(opts.project.cwd)

    if (!workspaces) {
      return []
    }

    const candidates = miscUtils.mapAndFilter(workspaces, workspace => {
      try {
        const candidate = new semverUtils.SemVer(workspace.manifest.package.version)

        if (range.test(candidate)) {
          return { candidate, ...workspace }
        }
      } catch {
      }

      return miscUtils.mapAndFilter.skip
    })

    candidates.sort(({ candidate: a }, { candidate: b }) => -a.compare(b))

    return candidates.map(workspace => structUtils.makeLocator(descriptor, `${CrateResolver.protocol}${workspace.candidate.raw}`))
  }

  async getSatisfying(descriptor: Descriptor, dependencies: Record<string, Package>, locators: Array<Locator>, opts: ResolveOptions): Promise<{
    locators: Array<Locator>;
    sorted: boolean
  }> {
    const range = semverUtils.validRange(descriptor.range.slice(CrateResolver.protocol.length))

    if (range === null) {
      throw new Error(`Expected a valid range, got ${descriptor.range.slice(CrateResolver.protocol.length)}`)
    }

    const [locator] = await this.getCandidates(descriptor, dependencies, opts)

    return {
      locators: locators.filter(candidate => candidate.locatorHash === locator.locatorHash),
      sorted: false,
    }
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    return {
      ...locator,

      version: locator.reference,

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
