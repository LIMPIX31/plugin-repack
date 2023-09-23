import { PortablePath, ppath, xfs } from '@yarnpkg/fslib'
import toml from 'toml'

export interface CargoToml {
  package: {
    name: string
    version: string
  }
  workspace?: {
    members?: string[]
  },
  repack?: {
    target?: 'web' | 'bundler' | 'nodejs' | 'no-modules' | 'deno'
  }
}

export async function readCargoToml(cwd: PortablePath): Promise<CargoToml | undefined> {
  const cargoTomlPath = ppath.join(cwd, 'Cargo.toml')

  const exists = await xfs.existsPromise(cargoTomlPath)

  if (!exists) {
    return
  }

  const file = await xfs.readFilePromise(cargoTomlPath, 'utf8')
  return toml.parse(file)
}

export async function fetchCargoWorkspaces(cwd: PortablePath): Promise<PortablePath[]> {
  const cargoToml = await readCargoToml(cwd)

  if (!cargoToml) {
    return []
  }

  const { workspace } = cargoToml

  if (!workspace || !workspace.members || !Array.isArray(workspace.members)) {
    return []
  }

  const { members } = workspace

  return members
    .filter(m => typeof m === 'string')
    .map(m => m as PortablePath)
}
