import { $ }         from 'execa'
import { satisfies } from 'semver'

export const BINARYEN_SUPPORTED_VERSIONS = '>=112'

export async function fetchBinaryenVersion(cwd: string, bin = 'wasm-opt'): Promise<string | undefined> {
	try {
		const { stdout } = await $({ cwd })`./${bin} --version`

		const [, version] = stdout.match(new RegExp(`${bin}\\sversion\\s(.+?)\\s`)) ?? []

		return version
	} catch {
		return undefined
	}
}

export async function isSupportedBinaryenVersion(version: string) {
	return satisfies(version, BINARYEN_SUPPORTED_VERSIONS)
}

export function optimize(cwd: string, file: string, level: 0 | 1 | 2 | 3 | 4) {
	return $({ cwd })`./wasm-opt ${file} -o ${file} -O${level === 0 ? 's' : level} --enable-reference-types`
}
