import { Locator } from '@yarnpkg/core'

export function createPackage(locator: Locator) {
  return {
    name: locator.name,
    main: "index.js",
    types: "index.d.ts"
  }
}
