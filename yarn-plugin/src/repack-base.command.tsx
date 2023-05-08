import { BaseCommand } from '@yarnpkg/cli'
import { Configuration, MessageName, Project, StreamReport } from '@yarnpkg/core'
import { PortablePath, ppath } from '@yarnpkg/fslib'
import { REPACK_INSTALL_LOCATION } from './constants'
import {
  fetchBinaryenVersion,
  fetchBindgenVersion,
  fetchCargoVersion,
  fetchRustupVersion,
  isSupportedBinaryenVersion,
  isSupportedBindgenVersion,
  isSupportedCargoVersion,
  isSupportedRustupVersion,
} from 'repack'
import { fetchCargoWorkspaces } from './crate-utils'

export abstract class RepackBaseCommand extends BaseCommand {
  abstract execute(): Promise<number | void>

  protected async installationPath(...append: any[]) {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    return ppath.join(project.cwd, REPACK_INSTALL_LOCATION, ...append)
  }

  protected async validateEnv(report: StreamReport): Promise<boolean> {
    const cargoVersion = await fetchCargoVersion()
    const rustupVersion = await fetchRustupVersion()

    if (!cargoVersion || !rustupVersion) {
      if (!cargoVersion) {
        report.reportError(MessageName.UNNAMED, 'Cargo is not installed')
      }

      if (!rustupVersion) {
        report.reportError(MessageName.UNNAMED, 'Rustup is not installed')
      }

      return false
    }

    if (!isSupportedCargoVersion(cargoVersion)) {
      report.reportWarning(MessageName.UNNAMED, `Cargo ${cargoVersion} is not supported`)
    }

    if (!isSupportedRustupVersion(rustupVersion)) {
      report.reportWarning(MessageName.UNNAMED, `Rustup ${rustupVersion} is not supported`)
    }

    return true
  }

  protected async validateInstall(report: StreamReport): Promise<boolean> {
    const installationPath = await this.installationPath()

    const bindgenVersion = await fetchBindgenVersion(installationPath)
    const binaryenVersion = await fetchBinaryenVersion(installationPath)

    if (!bindgenVersion || !binaryenVersion) {
      return false
    }

    const unsupported =  !isSupportedBindgenVersion(bindgenVersion) || !isSupportedBinaryenVersion(binaryenVersion)

    if (unsupported) {
      report.reportError(MessageName.UNNAMED, 'Repack installation deprecated. Run `yarn repack update`')
      return false
    }

    return true
  }

  protected async validateWorkspaces(cwd: PortablePath, report: StreamReport): Promise<boolean> {
    const workspaces = await fetchCargoWorkspaces(cwd)

    if (!workspaces) {
      report.reportError(MessageName.UNNAMED, 'This project has no cargo workspaces')
      return false
    }
    
    return true
  }
  
  protected async validateProject(cwd: PortablePath, report: StreamReport): Promise<boolean> {
    const env = await this.validateEnv(report)
    const installation = await this.validateInstall(report)
    const workspaces = await this.validateWorkspaces(cwd, report)

    return env && installation && workspaces
  }
}
