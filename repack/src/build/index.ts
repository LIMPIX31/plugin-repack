import { $ }         from 'execa'
import { execa }     from 'execa'
import { satisfies } from 'semver'

export const CARGO_SUPPORTED_VERSIONS = '>=1.71'
export const RUSTUP_SUPPORTED_VERSIONS = '>=1.25'

export async function fetchCargoVersion(): Promise<string | undefined> {
	try {
		const { stdout } = await $`cargo -V`

		const [, version] = stdout.match(/cargo\s(.+?)\s/) ?? []

		return version
	} catch {
		return undefined
	}
}

export async function isSupportedCargoVersion(version: string) {
	return satisfies(version, CARGO_SUPPORTED_VERSIONS)
}

export async function fetchRustupVersion(): Promise<string | undefined> {
	try {
		const { stdout } = await $`rustup -V`

		const [, version] = stdout.match(/rustup\s(.+?)\s/) ?? []

		return version
	} catch {
		return undefined
	}
}

export function isSupportedRustupVersion(version: string) {
	return satisfies(version, RUSTUP_SUPPORTED_VERSIONS)
}

export async function hasWasm32installed(): Promise<boolean> {
	const { stdout } = await $`rustup target list --installed`

	return stdout.includes('wasm32-unknown-unknown')
}

export function cargoBuild(cwd: string, outDir: string, release = false) {
	return execa(
		'cargo',
		`build --lib --target wasm32-unknown-unknown --out-dir ${outDir} -Z unstable-options${release ? ' -r' : ''}`.split(
			' ',
		),
		{
			cwd,
		},
	)
}
