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

export interface CargoWorkspace {
  manifest: CargoToml,
  path: PortablePath
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

export async function fetchCargoWorkspaces(cwd: PortablePath): Promise<CargoWorkspace[] | undefined> {
  const cargoToml = await readCargoToml(cwd)

  if (!cargoToml) {
    return
  }

  const { workspace } = cargoToml

  if (!workspace || !workspace.members || !Array.isArray(workspace.members)) {
    return
  }

  const { members } = workspace

  const workspaces = members
      .filter(m => typeof m === 'string')
      .map(m => m as PortablePath)

  const candidates = await Promise.all(workspaces.map(async m => ({ manifest: await readCargoToml(m), path: m })))

  return (
    candidates.filter(({ manifest }) => Boolean(manifest)) as CargoWorkspace[]
  ).filter(({ manifest }) => manifest?.package?.name && manifest?.package?.version)
}
