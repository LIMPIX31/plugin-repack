import { Fetcher, FetchOptions, FetchResult, Locator, MinimalFetchOptions, structUtils } from '@yarnpkg/core'
import { PortablePath } from '@yarnpkg/fslib'
import { importRepackProtocol } from './protocol'

export class CrateFetcher implements Fetcher {
  supports(locator: Locator, { project }: MinimalFetchOptions): boolean {
    const { name: protocol } = locator

    const { manifest } = project.getWorkspaceByCwd(project.cwd)
    const { identHash } = structUtils.makeIdent('plugin-repack', protocol)

    const importable = manifest.devDependencies.has(identHash)

    return /[a-z0-9]/.test(protocol) && importable
  }

  getLocalPath(locator: Locator, opts: FetchOptions): PortablePath | null {
    return null
  }

  async fetch(locator: Locator, opts: FetchOptions): Promise<FetchResult> {
    const repacker = await importRepackProtocol(locator)

    const expectedChecksum = opts.checksums.get(locator.locatorHash) ?? null

    const [packageFs, releaseFs, checksum] = await opts.cache.fetchPackageFromCache(locator, expectedChecksum, {
      onHit: () => opts.report.reportCacheHit(locator),
      onMiss: () => opts.report.reportCacheMiss(locator, `${structUtils.prettyLocator(opts.project.configuration, locator)} can't be found in the cache and will be rebuild from sources`),
      loader: () => {
        if (!repacker.make) {
          throw new Error('Missing `make` export from repacker')
        }
        return repacker.make(locator, opts)
      },
      ...opts.cacheOptions,
    })

    return {
      packageFs,
      releaseFs,
      checksum,
      prefixPath: structUtils.getIdentVendorPath(locator),
    }
  }
}
