import { $ }         from 'execa'
import { satisfies } from 'semver'

export const BINDGEN_SUPPORTED_VERSIONS = '>=0.2'

export async function fetchBindgenVersion(cwd: string): Promise<string | undefined> {
	try {
		const { stdout } = await $({ cwd })`./wasm-bindgen -V`

		const [, version] = stdout.match(/wasm-bindgen\s(.+?)\s/) ?? []

		return version
	} catch {
		return undefined
	}
}

export function isSupportedBindgenVersion(version: string) {
	return satisfies(version, BINDGEN_SUPPORTED_VERSIONS)
}

export function bindgen(
	cwd: string,
	target: 'web' | 'bundler' | 'nodejs' | 'no-modules' | 'deno',
	wasm: string,
	outDir: string,
) {
	return $({
		cwd,
	})`./wasm-bindgen --target ${target} --typescript --weak-refs --reference-types --out-name index --out-dir ${outDir} ${wasm}`
}
