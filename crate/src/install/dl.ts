import { Observable } from 'rxjs'
import { InstallFailedException, UnknownInstallException } from './exceptions'
import { Writable } from 'stream'
import { createWriteStream } from 'node:fs'

export interface DownloadProgress {
  total: number
  transferred: number
}

export function download(url: string, dest: string): Observable<DownloadProgress> {
  return new Observable<DownloadProgress>(subscriber => {
    const controller = new AbortController()

    ;(async () => {
      const response = await fetch(url)

      if (response.status !== 200) {
        throw new InstallFailedException('Non-200 status')
      }

      const { body: readable, headers } = response

      if (!headers.has('content-length')) {
        throw new UnknownInstallException('Invalid content-length header')
      }

      const total = parseInt(headers.get('content-length')!)

      if (!readable) {
        throw new UnknownInstallException('readable is null')
      }

      let transferred = 0

      const { signal } = controller

      await readable.pipeThrough(new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk)
          subscriber.next({ total, transferred: transferred += chunk.length })
        }
      }), { signal }).pipeTo(Writable.toWeb(createWriteStream(dest)), { signal })

      subscriber.complete()
    })()

    return () => controller.abort()
  })
}
