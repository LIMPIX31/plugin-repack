import { FetchOptions, formatUtils, Locator, MessageName, structUtils } from '@yarnpkg/core'

export function reportCargoBuildOutput(locator: Locator, opts: FetchOptions, data: string, splitSkip = false) {
  if (!splitSkip) {
    data?.split('\n').filter(line => line.trim() !== '').forEach(line => reportCargoBuildOutput(locator, opts, line, true))
    return
  }

  const trimmed = data.trim().replaceAll('\n', '')

  if (trimmed.includes('unused manifest key: repack')) {
    return
  }

  const { configuration: conf } = opts.project

  if (trimmed.startsWith('Compiling')) {
    const [, name, semver, dir = ''] = trimmed.match(/^Compiling\s(.+?)\sv(.+?)(\(.+?)?$/) ?? []

    if (name && semver) {
      opts.report.reportInfo(MessageName.UNNAMED, [
        formatUtils.pretty(conf, `${structUtils.stringifyIdent(locator)}: `, 'gray'),
        formatUtils.pretty(conf, 'compiling ', 'green'),
        formatUtils.pretty(conf, name, 'magenta'),
        formatUtils.pretty(conf, `@${semver.replaceAll('\n', '')}`, 'gray'),
        formatUtils.pretty(conf, dir, 'yellow'),
      ].join(''))
      return
    }
  }

  opts.report.reportInfo(MessageName.UNNAMED, formatUtils.pretty(conf, `${structUtils.stringifyIdent(locator)}: ${data.trim()}`, 'gray'))
}
