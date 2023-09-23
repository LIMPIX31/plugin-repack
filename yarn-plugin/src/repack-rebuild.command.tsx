import { Option } from 'clipanion'
import { Cache, Configuration, Project, StreamReport, structUtils } from '@yarnpkg/core'
import { xfs } from '@yarnpkg/fslib'
import { BaseCommand } from '@yarnpkg/cli'

export class RepackRebuildCommand extends BaseCommand {
  static paths = [['repack', 'rebuild']]

  release = Option.Boolean('-r, --release')
  idents = Option.Rest()

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)
    const cache = await Cache.find(configuration)

    const commandReport = await StreamReport.start({
        configuration,
        stdout: this.context.stdout,
      },
      async (report) => {
        await report.startTimerPromise('Cleaning previous build(s)', async () => {
          const regexp = new RegExp(`(${this.idents.map(structUtils.parseIdent).map(ident => `${ident.scope}-${ident.name}-${ident.scope}`).join('|')})`)

          for (const entry of await xfs.readdirPromise(cache.cwd)) {
            if (regexp.test(entry)) {
              cache.markedFiles.delete(entry)
            }
          }
        })

        if (this.release) {
          configuration.values.set('repack-release', true)
        }

        await project.install({
          report,
          cache,
        })
      },
    )

    return commandReport.exitCode()
  }
}
