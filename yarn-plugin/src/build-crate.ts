import { cargoBuild, bindgen } from 'repack'
import { PortablePath, ppath, xfs } from '@yarnpkg/fslib'
import { Locator, tgzUtils } from '@yarnpkg/core'
import { REPACK_INSTALL_LOCATION } from './constants'
import { createPackage } from './create-package'

export async function buildCrate(locator: Locator, cwd: PortablePath) {
  const tempDir = await xfs.mktempPromise()

  const packagePath = ppath.join(tempDir, 'node_modules', locator.name as PortablePath)

  await xfs.mkdirPromise(packagePath, { recursive: true })

  await cargoBuild(cwd, packagePath)
  await bindgen(ppath.join(cwd, REPACK_INSTALL_LOCATION), 'web', ppath.join(packagePath, `${locator.name.replaceAll('-','_')}.wasm`), packagePath)

  await xfs.writeFilePromise(ppath.join(packagePath, 'package.json'), JSON.stringify(createPackage(locator), null, 2))

  const tgz = await tgzUtils.makeArchiveFromDirectory(tempDir)

  await xfs.detachTemp(tempDir)

  return tgz
}
