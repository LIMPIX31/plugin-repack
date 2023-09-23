import {
  Descriptor,
  formatUtils,
  LinkType,
  Locator,
  MessageName,
  miscUtils,
  Package,
  ResolveOptions,
  Resolver,
  semverUtils,
  structUtils,
} from '@yarnpkg/core'
import { PortablePath, ppath } from '@yarnpkg/fslib'
import { importRepackProtocol } from './protocol'

export class RepackResolver implements Resolver {
  supportsDescriptor(descriptor: Descriptor, { report, project }: ResolveOptions): boolean {
    const protocol = descriptor.range

    const { manifest } = project.getWorkspaceByCwd(project.cwd)
    const { identHash } = structUtils.makeIdent('plugin-repack', protocol)

    const importable = manifest.devDependencies.has(identHash)

    if (!/[a-z0-9]/.test(protocol) || !importable) {
      return false
    }

    const validScope = descriptor.scope === protocol

    if (!validScope) {
      report.reportError(MessageName.UNNAMED, `You need to explicitly specify scope: ${formatUtils.pretty(project.configuration, `@${protocol}/`, 'green')}${descriptor.name}`)
    }

    return validScope
  }

  supportsLocator(locator: Locator, { report, project }: ResolveOptions): boolean {
    return true
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

  async getCandidates(descriptor: Descriptor, dependencies: Record<string, Package>, opts: ResolveOptions): Promise<Array<Locator>> {
    const repacker = await importRepackProtocol(descriptor)

    if (!repacker?.candidates) {
      opts.report.reportError(MessageName.UNNAMED, 'Repacker should export `candidates` function, which returns an array with complete candidate metadata')
      return []
    }

    const repackerCandidates = repacker.candidates(descriptor, opts)

    if (!Array.isArray(repackerCandidates)) {
      opts.report.reportError(MessageName.UNNAMED, 'The `candidates` function from repacker should return candidate array')
      return []
    }

    const candidates = miscUtils.mapAndFilter(repackerCandidates, repackerCandidate => {
      if (repackerCandidate.name !== descriptor.name) {
        return miscUtils.mapAndFilter.skip
      }

      try {
        const candidate = new semverUtils.SemVer(repackerCandidate.version)

        return { candidate, ...repackerCandidate }
      } catch {
      }

      return miscUtils.mapAndFilter.skip
    })

    candidates.sort(({ candidate: a }, { candidate: b }) => -a.compare(b))

    return candidates.map(workspace => structUtils.makeLocator(descriptor, `${descriptor.scope}:${workspace.path}`))
  }

  async getSatisfying(descriptor: Descriptor, dependencies: Record<string, Package>, locators: Array<Locator>, opts: ResolveOptions): Promise<{
    locators: Array<Locator>;
    sorted: boolean
  }> {
    const [locator] = await this.getCandidates(descriptor, dependencies, opts)

    return {
      locators: locators.filter(candidate => candidate.locatorHash === locator.locatorHash),
      sorted: false,
    }
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    const workspacePath = ppath.join(
      opts.project.cwd,
      locator.reference.split(':')[1] as PortablePath,
    )

    const repacker = await importRepackProtocol(locator)

    if (!repacker.fetchManifestByCwd) {
      throw new Error('Missing `fetchManifestByCwd` export from repacker')
    }

    const manifest = await repacker?.fetchManifestByCwd(workspacePath)

    return {
      ...locator,

      version: manifest.version ?? '0.0.0',

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
