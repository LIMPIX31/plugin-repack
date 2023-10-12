import { BaseCommand }                from '@yarnpkg/cli'
import { Configuration }              from '@yarnpkg/core'
import { MessageName }                from '@yarnpkg/core'
import { Project }                    from '@yarnpkg/core'
import { StreamReport }               from '@yarnpkg/core'
import { PortablePath }               from '@yarnpkg/fslib'
import { ppath }                      from '@yarnpkg/fslib'

import { fetchBinaryenVersion }       from 'repack'
import { fetchBindgenVersion }        from 'repack'
import { fetchCargoVersion }          from 'repack'
import { fetchRustupVersion }         from 'repack'
import { hasWasm32installed }         from 'repack'
import { isSupportedBinaryenVersion } from 'repack'
import { isSupportedBindgenVersion }  from 'repack'
import { isSupportedCargoVersion }    from 'repack'
import { isSupportedRustupVersion }   from 'repack'

import { REPACK_INSTALL_LOCATION }    from './constants'
import { fetchCargoWorkspaces }       from './crate-utils'

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

		const wasm32Installed = await hasWasm32installed()

		if (!wasm32Installed) {
			report.reportError(MessageName.UNNAMED, 'Missing wasm32-unknown-unknown target')
			return false
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

		const unsupported = !isSupportedBindgenVersion(bindgenVersion) || !isSupportedBinaryenVersion(binaryenVersion)

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
