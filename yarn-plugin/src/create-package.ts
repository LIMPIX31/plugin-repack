import { Locator }     from '@yarnpkg/core'
import { structUtils } from '@yarnpkg/core'

export function createPackage(locator: Locator) {
	return {
		name: structUtils.stringifyIdent(locator),
		main: 'index.js',
		types: 'index.d.ts',
	}
}
