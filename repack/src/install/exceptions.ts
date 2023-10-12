export class FetchFailedException extends Error {
	constructor(kind: string) {
		super(`Failed to fetch: ${kind}`)
	}
}

export class UnsupportedBindgenException extends Error {
	constructor(platform: string, arch: string) {
		super(`Wasm bindgen is not supported for platform \`${platform}\` and arch \`${arch}\``)
	}
}

export class UnsupportedBinaryenException extends Error {
	constructor(platform: string, arch: string) {
		super(`Binaryen is not supported for platform \`${platform}\` and arch \`${arch}\``)
	}
}

export class UnknownInstallException extends Error {}

export class InstallFailedException extends Error {
	constructor(message: string) {
		super(`Installation failed: ${message}`)
	}
}
