import { satisfies } from 'semver'
import { $ } from 'execa'

export const BINARYEN_SUPPORTED_VERSIONS = '>=112'

export async function fetchBinaryenVersion(cwd: string, bin = 'wasm-opt'): Promise<string | undefined> {
  try {
    const { stdout } = await $({ cwd })`./${bin} --version`

    const [, version] = stdout.match(new RegExp(`${bin}\\sversion\\s(.+?)\\s`)) ?? []

    return version
  } catch {}
}

export async function isSupportedBinaryenVersion(version: string) {
  return satisfies(version, BINARYEN_SUPPORTED_VERSIONS)
}
