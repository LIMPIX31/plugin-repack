import { Fetcher }             from '@yarnpkg/core'
import { FetchOptions }        from '@yarnpkg/core'
import { FetchResult }         from '@yarnpkg/core'
import { Locator }             from '@yarnpkg/core'
import { MinimalFetchOptions } from '@yarnpkg/core'
import { structUtils }         from '@yarnpkg/core'
import { PortablePath }        from '@yarnpkg/fslib'

import { buildCrate }          from './build-crate'
import { CrateResolver }       from './resolver'

export class CrateFetcher implements Fetcher {
	supports(locator: Locator, opts: MinimalFetchOptions): boolean {
		return locator.reference.startsWith(CrateResolver.protocol)
	}

	getLocalPath(locator: Locator, opts: FetchOptions): PortablePath | null {
		return null
	}

	async fetch(locator: Locator, opts: FetchOptions): Promise<FetchResult> {
		const expectedChecksum = opts.checksums.get(locator.locatorHash) ?? null

		const [packageFs, releaseFs, checksum] = await opts.cache.fetchPackageFromCache(locator, expectedChecksum, {
			onHit: () => opts.report.reportCacheHit(locator),
			onMiss: () =>
				opts.report.reportCacheMiss(
					locator,
					`${structUtils.prettyLocator(
						opts.project.configuration,
						locator,
					)} can't be found in the cache and will be rebuild from sources`,
				),
			loader: () => buildCrate(locator, opts.project, opts),
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
