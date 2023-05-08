import { bindgen, cargoBuild, optimize } from 'repack'
import { PortablePath, ppath, xfs } from '@yarnpkg/fslib'
import { FetchOptions, Locator, Project, tgzUtils } from '@yarnpkg/core'
import { RELEASE_BUILD, REPACK_INSTALL_LOCATION } from './constants'
import { createPackage } from './create-package'
import { reportCargoBuildOutput } from './utils'

export async function buildCrate(locator: Locator, project: Project, opts: FetchOptions) {
  const tempDir = await xfs.mktempPromise()

  const packagePath = ppath.join(tempDir, 'node_modules', locator.name as PortablePath)

  await xfs.mkdirPromise(packagePath, { recursive: true })

  let stdout: string = ''
  const handleStdout = (msg: string = '') => {
    stdout += msg
    if (stdout.includes('\n')) {
      const queue = stdout.split('\n')
      queue.forEach(line => reportCargoBuildOutput(opts, line))
      stdout = ''
    }
  }

  return await opts.report.startTimerPromise(`Compiling [${locator.name}]`, async () => {
    const optimization = project.configuration.values.get('repack-release')

    const cargoChild = cargoBuild(project.cwd, packagePath, optimization)
    cargoChild.stdout?.on('data', data => handleStdout(data))
    cargoChild.stderr?.on('data', data => handleStdout(data))
    await cargoChild

    const outname = ppath.join(packagePath, `${locator.name.replaceAll('-','_')}.wasm`)
    const repackCwd = ppath.join(project.cwd, REPACK_INSTALL_LOCATION)

    await bindgen(repackCwd, 'web', outname, packagePath)
    
    await xfs.unlinkPromise(outname)

    const opt = optimize(repackCwd, ppath.join(packagePath, `index_bg.wasm`), optimization ? 3 : 0)
    opt.stdout?.on('data', data => handleStdout(data))
    opt.stderr?.on('data', data => handleStdout(data))
    await opt

    await xfs.writeFilePromise(ppath.join(packagePath, 'package.json'), JSON.stringify(createPackage(locator), null, 2))
    const tgz = await tgzUtils.makeArchiveFromDirectory(tempDir)
    await xfs.detachTemp(tempDir)

    return tgz
  })
}
