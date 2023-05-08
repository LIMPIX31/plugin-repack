import { FetchOptions, formatUtils, MessageName } from '@yarnpkg/core'

export function reportCargoBuildOutput(opts: FetchOptions, data: string, splitSkip = false) {
  if (!splitSkip) {
    data?.split('\n').filter(line => line.trim() !== '').forEach(line => reportCargoBuildOutput(opts, line, true))
    return
  }

  const trimmed = data.trim().replaceAll('\n', '')

  if (trimmed.startsWith('Compiling')) {
    const [, name, semver, dir = ''] = trimmed.match(/^Compiling\s(.+?)\sv(.+?)(\(.+?)?$/) ?? []

    if (name && semver) {
      const { configuration: conf } = opts.project

      opts.report.reportInfo(MessageName.UNNAMED, [
        formatUtils.pretty(conf, 'compiling ', 'green'),
        formatUtils.pretty(conf, name, 'magenta'),
        formatUtils.pretty(conf, `@${semver.replaceAll('\n', '')}`, 'gray'),
        formatUtils.pretty(conf, dir, 'yellow'),
      ].join(''))
      return
    }
  }

  opts.report.reportInfo(MessageName.UNNAMED, data.trim())
}
