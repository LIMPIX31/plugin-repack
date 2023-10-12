import tar from 'tar'

export async function extractFiles(file: string, to: string, regexp?: RegExp, strip = 1) {
	await tar.x({
		file,
		C: to,
		strip,
		filter(path: string): boolean {
			return regexp?.test(path) ?? true
		},
	})
}
