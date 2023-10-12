import { FetchOptions }            from '@yarnpkg/core'
import { Locator }                 from '@yarnpkg/core'
import { MessageName }             from '@yarnpkg/core'
import { Project }                 from '@yarnpkg/core'
import { ReportError }             from '@yarnpkg/core'
import { structUtils }             from '@yarnpkg/core'
import { tgzUtils }                from '@yarnpkg/core'
import { PortablePath }            from '@yarnpkg/fslib'
import { ppath }                   from '@yarnpkg/fslib'
import { xfs }                     from '@yarnpkg/fslib'

import { bindgen }                 from 'repack'
import { cargoBuild }              from 'repack'
import { optimize }                from 'repack'

import { REPACK_INSTALL_LOCATION } from './constants'
import { readCargoToml }           from './crate-utils'
import { createPackage }           from './create-package'
import { CrateResolver }           from './resolver'
import { reportCargoBuildOutput }  from './utils'

export async function buildCrate(locator: Locator, project: Project, opts: FetchOptions) {
	const tempDir = await xfs.mktempPromise()

	const packagePath = ppath.join(tempDir, 'node_modules', structUtils.stringifyIdent(locator) as PortablePath)
	const workspacePath = ppath.join(
		opts.project.cwd,
		locator.reference.slice(CrateResolver.protocol.length) as PortablePath,
	)

	const manifest = await readCargoToml(workspacePath)

	await xfs.mkdirPromise(packagePath, { recursive: true })

	const target = manifest?.repack?.target ?? 'web'

	let stdout: string = ''
	const handleStdout = (msg: string = '') => {
		stdout += msg
		if (stdout.includes('\n')) {
			const queue = stdout.split('\n')
			queue.forEach((line) => reportCargoBuildOutput(locator, opts, line))
			stdout = ''
		}
	}

	const optimization = project.configuration.values.get('repack-release')

	try {
		const cargoChild = cargoBuild(workspacePath, packagePath, optimization)
		cargoChild.stdout?.on('data', (data) => handleStdout(data))
		cargoChild.stderr?.on('data', (data) => handleStdout(data))
		await cargoChild
	} catch (e: any) {
		throw new ReportError(MessageName.UNNAMED, 'Cargo build failed')
	}

	const outname = ppath.join(packagePath, `${locator.name.replaceAll('-', '_')}.wasm`)
	const repackCwd = ppath.join(project.cwd, REPACK_INSTALL_LOCATION)

	try {
		const bg = bindgen(repackCwd, target, outname, packagePath)
		bg.stdout?.on('data', (data) => handleStdout(data))
		bg.stderr?.on('data', (data) => handleStdout(data))
		await bg
	} catch (e: any) {
		throw new ReportError(MessageName.UNNAMED, 'Bindgen failed')
	}

	await xfs.unlinkPromise(outname)

	try {
		const opt = optimize(repackCwd, ppath.join(packagePath, `index_bg.wasm`), optimization ? 3 : 0)
		opt.stdout?.on('data', (data) => handleStdout(data))
		opt.stderr?.on('data', (data) => handleStdout(data))
		await opt
	} catch (e: any) {
		throw new ReportError(MessageName.UNNAMED, 'Optimization failed')
	}

	await xfs.writeFilePromise(ppath.join(packagePath, 'package.json'), JSON.stringify(createPackage(locator), null, 2))
	const tgz = await tgzUtils.makeArchiveFromDirectory(tempDir)
	await xfs.detachTemp(tempDir)

	return tgz
}
