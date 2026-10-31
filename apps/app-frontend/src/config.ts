const trimTrailingSlash = (url: string) => url.replace(/\/$/, '')

export const MCLBrandConfig = Object.freeze({
    productName: '遇见神鲸',
    shortProductName: '遇见神鲸',
    repositoryUrl: 'https://example.invalid/mcl/repository',
    supportUrl: 'https://example.invalid/mcl/support',
    bundleIdentifier: 'dev.mcl.launcher',
    deepLinkScheme: 'mcl',
    userAgent: (version: string, os: string) => `MeetWhale-Launcher/${version} (${os})`,
    capabilities: Object.freeze({
        publicModrinthApi: true,
        privateModrinthServices: false,
        mclTelemetry: false,
    }),
})

const siteUrl = trimTrailingSlash(import.meta.env.MODRINTH_URL || 'https://modrinth.com')
const officialLabrinthBaseUrl = trimTrailingSlash(
    import.meta.env.MODRINTH_API_BASE_URL || 'https://api.modrinth.com',
)
type DownloadSourceMode = 'auto' | 'official_only' | 'mirror_preferred' | 'official_preferred'

// The Modrinth API always uses the official source; Modrinth download mirror
// routing is handled by the Rust download layer.
export function setModrinthSourceMode(_sourceMode: DownloadSourceMode) {}

export function setModrinthMirrorEnabled(_enabled: boolean) {}

export function getOfficialLabrinthBaseUrl() {
    return officialLabrinthBaseUrl
}

export function getLabrinthBaseUrl() {
    return officialLabrinthBaseUrl
}

export const config = {
    siteUrl,
    labrinthBaseUrl: getLabrinthBaseUrl,
}
