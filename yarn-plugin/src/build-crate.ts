import { bindgen, cargoBuild } from 'repack'
import { PortablePath, ppath, xfs } from '@yarnpkg/fslib'
import { FetchOptions, Locator, tgzUtils } from '@yarnpkg/core'
import { REPACK_INSTALL_LOCATION } from './constants'
import { createPackage } from './create-package'
import { reportCargoBuildOutput } from './utils'

export async function buildCrate(locator: Locator, cwd: PortablePath, opts: FetchOptions) {
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
    const cargoChild = cargoBuild(cwd, packagePath)
    cargoChild.stdout?.on('data', data => handleStdout(data))
    cargoChild.stderr?.on('data', data => handleStdout(data))
    await cargoChild

    await bindgen(ppath.join(cwd, REPACK_INSTALL_LOCATION), 'web', ppath.join(packagePath, `${locator.name.replaceAll('-','_')}.wasm`), packagePath)

    await xfs.writeFilePromise(ppath.join(packagePath, 'package.json'), JSON.stringify(createPackage(locator), null, 2))
    const tgz = await tgzUtils.makeArchiveFromDirectory(tempDir)
    await xfs.detachTemp(tempDir)

    return tgz
  })
}
