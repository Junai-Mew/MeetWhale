/**
 * External "MC Content Localizer" integration.
 *
 * The tool is a separate MIT-licensed Tauri app. A portable copy is bundled in
 * the launcher resources (released on first run); when it cannot be found the UI
 * offers to download and silently install the official GitHub release.
 *
 * The renderer never passes a path to execute: the Rust side resolves the tool
 * from settings / bundled resources / system installs, and validates release
 * download URLs against the upstream GitHub prefix.
 */
import { invoke } from '@tauri-apps/api/core'

export type LocalizerSource = 'configured' | 'bundled' | 'detected'

export type LocalizerStatus = {
    path: string | null
    source: LocalizerSource | null
    version: string | null
}

export type LocalizerRelease = {
    tag: string
    version: string
    assetName: string
    downloadUrl: string
    size: number
    sha256: string | null
    kind: 'nsis' | 'msi'
    supported: boolean
}

export type LocalizerErrorCode =
    | 'notFound'
    | 'launchFailed'
    | 'networkFailed'
    | 'rateLimited'
    | 'assetUnavailable'
    | 'downloadFailed'
    | 'sizeMismatch'
    | 'digestMismatch'
    | 'installFailed'
    | 'installTimeout'
    | 'notFoundAfterInstall'

export type LocalizerFailure = {
    code: LocalizerErrorCode
    path?: string
    message?: string
    expected?: number | string
    actual?: number | string
    seconds?: number
}

export type LocalizerProgress = {
    phase: 'downloading' | 'installing'
    downloaded: number
    total: number
}

const ERROR_CODES: readonly LocalizerErrorCode[] = [
    'notFound',
    'launchFailed',
    'networkFailed',
    'rateLimited',
    'assetUnavailable',
    'downloadFailed',
    'sizeMismatch',
    'digestMismatch',
    'installFailed',
    'installTimeout',
    'notFoundAfterInstall',
]

export function asLocalizerFailure(error: unknown): LocalizerFailure {
    if (typeof error === 'object' && error !== null) {
        const candidate = error as Record<string, unknown>
        if (
            typeof candidate.code === 'string' &&
            ERROR_CODES.includes(candidate.code as LocalizerErrorCode)
        ) {
            return candidate as unknown as LocalizerFailure
        }
    }
    return { code: 'launchFailed', message: String(error) }
}

export async function localizerStatus(): Promise<LocalizerStatus> {
    return (await invoke('localizer_status')) as LocalizerStatus
}

export async function launchLocalizer(): Promise<string> {
    return (await invoke('launch_localizer')) as string
}

export async function localizerReleaseInfo(): Promise<LocalizerRelease> {
    return (await invoke('localizer_release_info')) as LocalizerRelease
}

export async function installLocalizer(release: LocalizerRelease): Promise<LocalizerStatus> {
    return (await invoke('localizer_install', {
        release,
    })) as LocalizerStatus
}

export async function localizerLicenseText(): Promise<string | null> {
    return (await invoke('localizer_license_text')) as string | null
}
