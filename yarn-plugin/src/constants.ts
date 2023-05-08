import { ppath } from '@yarnpkg/fslib'

export const REPACK_INSTALL_LOCATION = ppath.join('./', '.yarn', 'repack')

export const RELEASE_BUILD = Symbol()
