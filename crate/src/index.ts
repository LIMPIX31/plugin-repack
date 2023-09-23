import { fetchCargoWorkspaces, readCargoToml } from './cargo'
import type { PortablePath } from '@yarnpkg/fslib'
import type { FetchOptions, Locator } from '@yarnpkg/core'

export default {
  name: 'crate',
  description: 'Yarn crate protocol for repackaging Rust crates into wasm artifacts'
}

export async function list(cwd: PortablePath) {
  return fetchCargoWorkspaces(cwd)
}

export async function manifest(cwd: PortablePath) {
  const nativeManifest = await readCargoToml(cwd)

  return {
    name: nativeManifest?.package.name,
    version: nativeManifest?.package.version,
  }
}

export async function fetch(cwd: PortablePath) {
  const workspaces = await list(cwd)
  const manifests = new Map<PortablePath, any>()

  await Promise.all(
    workspaces.map(async w => manifests.set(w, await manifest(w)))
  )

  return manifests
}

export async function make(locator: Locator, { report }: FetchOptions) {
  
}
