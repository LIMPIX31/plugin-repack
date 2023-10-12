import { Configuration }         from '@yarnpkg/core'
import { formatUtils }           from '@yarnpkg/core'
import { MessageName }           from '@yarnpkg/core'
import { Project }               from '@yarnpkg/core'
import { StreamReport }          from '@yarnpkg/core'
import { xfs }                   from '@yarnpkg/fslib'
import { Option }                from 'clipanion'
import { catchError }            from 'rxjs'
import { lastValueFrom }         from 'rxjs'
import { map }                   from 'rxjs'
import { Observable }            from 'rxjs'
import { of }                    from 'rxjs'

import { download }              from 'repack'
import { extractFiles }          from 'repack'
import { fetchBinaryenAsset }    from 'repack'
import { fetchWasmBindgenAsset } from 'repack'

import { RepackBaseCommand }     from './repack-base.command'

export class RepackInstallCommand extends RepackBaseCommand {
	static paths = [['repack', 'install']]

	skipCheck = Option.Boolean('-s, --skip-check')

	forceInstall = Option.Boolean('-f, --force-install')

	async execute() {
		const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
		const { project } = await Project.find(configuration, this.context.cwd)

		const commandReport = await StreamReport.start(
			{
				stdout: this.context.stdout,
				configuration,
			},
			// eslint-disable-next-line consistent-return
			async (report) => {
				await xfs.mkdirPromise(await this.installationPath(), { recursive: true })

				if (
					// eslint-disable-next-line consistent-return
					await report.startTimerPromise('Checking', async () => {
						if (!this.forceInstall) {
							const installed = await this.validateInstall(report)

							if (installed) {
								report.reportInfo(MessageName.UNNAMED, 'Repack already installed. Use `yarn repack upgrade` to upgrade')
								return true
							}
						}

						if (!this.skipCheck) {
							const invalid = !(await this.validateEnv(report)) || !(await this.validateWorkspaces(project.cwd, report))

							if (invalid) {
								return true
							}
						}
					})
				) {
					return undefined
				}

				if (
					// eslint-disable-next-line consistent-return
					await report.startTimerPromise('Downloading [Bindgen]', async () => {
						try {
							const bindgenDownloader = this.trackProgress(
								report,
								download(await fetchWasmBindgenAsset(), await this.installationPath('bindgen.tgz')),
							)

							await lastValueFrom(
								bindgenDownloader.pipe(
									catchError((err) => {
										report.reportError(
											MessageName.UNNAMED,
											err?.message ?? 'Unknown error occurred while downloading bindgen',
										)
										return of(err)
									}),
								),
							)
						} catch (e: any) {
							report.reportError(
								MessageName.UNNAMED,
								e?.message ?? 'Unable to download bindgen due to an unknown error',
							)
							return true
						}
					})
				) {
					return undefined
				}

				if (
					// eslint-disable-next-line consistent-return
					await report.startTimerPromise('Downloading [Binaryen]', async () => {
						try {
							const binaryenDownloader = this.trackProgress(
								report,
								download(await fetchBinaryenAsset(), await this.installationPath('binaryen.tgz')),
							)

							await lastValueFrom(
								binaryenDownloader.pipe(
									catchError((err) => {
										report.reportError(
											MessageName.UNNAMED,
											err?.message ?? 'Unknown error occurred while downloading binaryen',
										)
										return of(err)
									}),
								),
							)
						} catch (e: any) {
							report.reportError(
								MessageName.UNNAMED,
								e?.message ?? 'Unable to download bynarien due to an unknown error',
							)
							return true
						}
					})
				) {
					return undefined
				}

				if (
					// eslint-disable-next-line consistent-return
					await report.startTimerPromise('Extracting [Bindgen]', async () => {
						try {
							await extractFiles(
								await this.installationPath('bindgen.tgz'),
								await this.installationPath(),
								/wasm-bindgen(\.\w+)?$/,
								1,
							)
						} catch (e: any) {
							report.reportError(MessageName.UNNAMED, e?.message ?? 'Failed to extract bindgen due to an unknown error')
							return true
						}
					})
				) {
					return undefined
				}

				if (
					// eslint-disable-next-line consistent-return
					await report.startTimerPromise('Extracting [Binaryen]', async () => {
						try {
							await extractFiles(
								await this.installationPath('binaryen.tgz'),
								await this.installationPath(),
								/bin\/wasm-opt(\.\w+)?$/,
								2,
							)
						} catch (e: any) {
							report.reportError(MessageName.UNNAMED, e?.message ?? 'Failed to extract bindgen due to an unknown error')
							return true
						}
					})
				) {
					return undefined
				}

				await report.startTimerPromise('Cleaning', async () => {
					await xfs.unlinkPromise(await this.installationPath('bindgen.tgz'))
					await xfs.unlinkPromise(await this.installationPath('binaryen.tgz'))
				})

				report.reportInfo(
					MessageName.UNNAMED,
					formatUtils.pretty(configuration, 'Repack plugin installed successfully', 'green'),
				)
			},
		)

		return commandReport.exitCode()
	}

	private trackProgress(report: StreamReport, observable: Observable<{ total: number; transferred: number }>) {
		let progress!: ReturnType<(typeof StreamReport)['progressViaCounter']>

		return observable.pipe(
			map(({ total, transferred }) => {
				if (!progress) {
					progress = StreamReport.progressViaCounter(total)
					report.reportProgress(progress)
				}

				progress.set(transferred)

				return { total, transferred }
			}),
		)
	}
}
