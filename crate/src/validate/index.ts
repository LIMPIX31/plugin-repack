import { MessageName, Report } from '@yarnpkg/core'
import {
  fetchCargoVersion,
  fetchRustupVersion,
  hasWasm32installed,
  isSupportedCargoVersion,
  isSupportedRustupVersion,
} from '../build'
import { fetchBindgenVersion, isSupportedBindgenVersion } from '../bind'
import { fetchBinaryenVersion, isSupportedBinaryenVersion } from '../optimize'
import { PortablePath } from '@yarnpkg/fslib'
import { fetchCargoWorkspaces } from '../cargo'

export async function validateEnv(report: Report): Promise<boolean> {
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

  const wasm32Installed = await hasWasm32installed()

  if (!wasm32Installed) {
    report.reportError(MessageName.UNNAMED, 'Missing wasm32-unknown-unknown target')
    return false
  }

  return true
}

export async function validateInstall(report: Report): Promise<boolean> {
  const installationPath = await this.installationPath()

  const bindgenVersion = await fetchBindgenVersion(installationPath)
  const binaryenVersion = await fetchBinaryenVersion(installationPath)

  if (!bindgenVersion || !binaryenVersion) {
    return false
  }

  const unsupported = !isSupportedBindgenVersion(bindgenVersion) || !isSupportedBinaryenVersion(binaryenVersion)

  return !unsupported
}


export async function validateWorkspaces(cwd: PortablePath, report: Report): Promise<boolean> {
  const workspaces = await fetchCargoWorkspaces(cwd)

  if (!workspaces) {
    report.reportError(MessageName.UNNAMED, 'This project has no cargo workspaces')
    return false
  }

  return true
}


export async function validateProject(cwd: PortablePath, report: Report): Promise<boolean> {
  const env = await this.validateEnv(report)
  const installation = await this.validateInstall(report)
  const workspaces = await this.validateWorkspaces(cwd, report)

  return env && installation && workspaces
}
