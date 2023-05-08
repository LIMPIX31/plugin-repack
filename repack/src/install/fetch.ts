import { arch, platform } from 'node:os'
import { FetchFailedException, UnsupportedBindgenException } from './exceptions'

function fetchLatestRelease(owner: string, repo: string) {
  return fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`).then(res => res.json())
}

export function currentArchIsSupported() {
  return ['arm64', 'x64'].includes(arch())
}

export function currentPlatformIsSupported() {
  return ['win32', 'darwin', 'linux'].includes(platform())
}

export async function fetchWasmBindgenAsset() {
  const { assets } = await fetchLatestRelease('rustwasm', 'wasm-bindgen')

  if (!assets) {
    throw new FetchFailedException('assets')
  }

  const assetArch = arch() === 'arm64' ? 'aarch64' : 'x86_64'
  let assetRelease!: string
  switch (platform()) {
    case 'win32': assetRelease = 'pc-windows-msvc'
      break
    case 'linux': assetRelease = 'unknown-linux-musl'
      break
    case 'darwin': assetRelease = 'apple-darwin'
  }

  const target = assets.find(({ name }) => name.includes(assetArch) && name.includes(assetRelease))

  if (!target) {
    throw new UnsupportedBindgenException(platform(), arch())
  }

  return target.browser_download_url
}

export async function fetchBinaryenAsset() {
  const { assets } = await fetchLatestRelease('WebAssembly', 'binaryen')

  if (!assets) {
    throw new FetchFailedException('assets')
  }

  const assetArch = arch() === 'arm64' ? 'arm64' : 'x86_64'
  let assetRelease!: string
  switch (platform()) {
    case 'win32': assetRelease = 'windows'
      break
    case 'linux': assetRelease = 'linux'
      break
    case 'darwin': assetRelease = 'macos'
  }

  const target = assets.find(({ name }) => name.includes(assetArch) && name.includes(assetRelease) && !name.includes('sha256'))

  if (!target) {
    throw new UnsupportedBindgenException(platform(), arch())
  }

  return target.browser_download_url
}
