#!/usr/bin/env node
/**
 * Fetch the bundled MC Content Localizer (MC 汉化工坊) executable from GitHub Releases.
 *
 * The executable is a third-party Windows binary and is intentionally not
 * committed. This script downloads the official NSIS installer for a release,
 * verifies its SHA-256 against the GitHub release digest, extracts the main
 * executable with 7-Zip, checks its FileVersion and installs it into
 * apps/app/resources/tools/mc-content-localizer/.
 *
 * Usage:
 *   node scripts/fetch-tools.mjs                    # latest release
 *   node scripts/fetch-tools.mjs --version 4.0.1    # pin a release
 *   node scripts/fetch-tools.mjs --check            # verify the installed copy only
 *   node scripts/fetch-tools.mjs --force            # re-download
 *
 * Options:
 *   --version <tag>       Release tag to install, with or without the leading "v".
 *   --seven-zip <path>    Path to 7z.exe (default: SEVEN_ZIP, PATH, standard locations).
 *   --force               Re-download even when the installed FileVersion matches.
 *   --check               Verify the installed executable without downloading.
 *   --skip-version-check  Do not require a Windows FileVersion match (non-Windows hosts).
 *   --allow-unverified    Continue when GitHub provides no SHA-256 digest (not recommended).
 *
 * Environment:
 *   GITHUB_TOKEN / GH_TOKEN  Optional; raises the GitHub API rate limit.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const repository = 'adssadax-1/mc-content-localizer'
const toolDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../apps/app/resources/tools/mc-content-localizer',
)
const toolExecutable = 'mc-content-localizer.exe'
const versionFile = path.join(toolDirectory, 'VERSION.txt')
const noticeFile = path.join(toolDirectory, 'NOTICE.txt')
const installerSuffix = '-x64-setup.exe'

const { values } = parseArgs({
    options: {
        version: { type: 'string' },
        'seven-zip': { type: 'string' },
        force: { type: 'boolean', default: false },
        check: { type: 'boolean', default: false },
        'skip-version-check': { type: 'boolean', default: false },
        'allow-unverified': { type: 'boolean', default: false },
    },
})

function fail(message) {
    console.error(`error: ${message}`)
    process.exit(1)
}

function log(message) {
    console.log(message)
}

function sha256(buffer) {
    return createHash('sha256').update(buffer).digest('hex')
}

function sha256File(file) {
    return sha256(fs.readFileSync(file))
}

function formatMegabytes(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function normalizeTag(input) {
    const tag = input.trim()
    if (!tag) fail('--version must not be empty')
    return tag.startsWith('v') ? tag : `v${tag}`
}

function releaseVersion(tag) {
    return tag.replace(/^v/, '')
}

function githubHeaders() {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'meetwhale-fetch-tools',
        'X-GitHub-Api-Version': '2022-11-28',
    }
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
}

async function githubJson(url) {
    const response = await fetch(url, { headers: githubHeaders() })
    if (!response.ok) {
        const body = await response.text().catch(() => '')
        const hint =
            response.status === 403 || response.status === 429
                ? ' (GitHub API rate limit; set GITHUB_TOKEN)'
                : ''
        fail(
            `GitHub API request failed: ${response.status} ${response.statusText}${hint}\n${url}\n${body.slice(0, 500)}`,
        )
    }
    return response.json()
}

async function resolveRelease(versionInput) {
    if (versionInput && versionInput !== 'latest') {
        return githubJson(
            `https://api.github.com/repos/${repository}/releases/tags/${normalizeTag(versionInput)}`,
        )
    }
    return githubJson(`https://api.github.com/repos/${repository}/releases/latest`)
}

function selectInstaller(release) {
    const expectedName = `MC-Content-Localizer-${release.tag_name}${installerSuffix}`
    const assets = Array.isArray(release.assets) ? release.assets : []
    const exact = assets.find((asset) => asset.name === expectedName)
    if (exact) return exact

    const candidates = assets.filter(
        (asset) =>
            /-x64-setup\.exe$/i.test(asset.name) &&
            !/devtools/i.test(asset.name) &&
            !/\.msi$/i.test(asset.name),
    )
    if (candidates.length === 1) return candidates[0]
    if (candidates.length > 1) {
        fail(
            `Multiple candidate installers for ${release.tag_name}:\n${candidates
                .map((asset) => `  - ${asset.name}`)
                .join('\n')}\nPass --version with an exact release or update the asset filter.`,
        )
    }
    fail(
        `No ${installerSuffix} asset found for ${release.tag_name}. ` +
            'The upstream release only publishes MSI or DevTools assets? Check the release page.',
    )
}

function expectedDigest(asset, release) {
    if (typeof asset.digest === 'string') {
        const match = /^sha256:([a-f0-9]{64})$/i.exec(asset.digest.trim())
        if (match) return { source: 'GitHub release digest', hash: match[1].toLowerCase() }
    }

    const checksumAsset = (release.assets || []).find(
        (candidate) => /sha256|checksum/i.test(candidate.name) && candidate.name !== asset.name,
    )
    if (!checksumAsset) return null
    log(`note: ${checksumAsset.name} exists; download it and compare the installer hash manually.`)
    return null
}

async function downloadInstaller(asset, targetFile) {
    log(`Downloading ${asset.name} (${formatMegabytes(asset.size)})...`)
    const response = await fetch(asset.browser_download_url, {
        headers: { 'User-Agent': 'meetwhale-fetch-tools' },
        redirect: 'follow',
    })
    if (!response.ok) {
        fail(
            `Download failed: ${response.status} ${response.statusText}\n${asset.browser_download_url}`,
        )
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    if (asset.size && buffer.length !== asset.size) {
        fail(`Downloaded size mismatch: expected ${asset.size} bytes, got ${buffer.length}`)
    }
    fs.writeFileSync(targetFile, buffer)
    return { hash: sha256(buffer), size: buffer.length }
}

function powershellFileVersion(executable) {
    if (process.platform !== 'win32') return null
    const quoted = executable.replaceAll("'", "''")
    const output = execFileSync(
        'powershell.exe',
        [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            `(Get-Item -LiteralPath '${quoted}').VersionInfo.FileVersion`,
        ],
        { encoding: 'utf8', windowsHide: true },
    )
    return output.trim()
}

function findSevenZip(explicit) {
    const candidates = [
        explicit,
        process.env.SEVEN_ZIP,
        '7z',
        '7zz',
        '7za',
        'C:\\Program Files\\7-Zip\\7z.exe',
        'C:\\Program Files (x86)\\7-Zip\\7z.exe',
    ].filter(Boolean)

    for (const candidate of candidates) {
        try {
            execFileSync(candidate, ['i'], { stdio: 'ignore', windowsHide: true })
            return candidate
        } catch {
            // Try the next candidate.
        }
    }
    fail(
        '7-Zip was not found. Install 7-Zip, add it to PATH, or pass --seven-zip <path to 7z.exe>.',
    )
}

function walk(directory) {
    const files = []
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name)
        if (entry.isDirectory()) {
            if (entry.name === '$PLUGINSDIR') continue
            files.push(...walk(fullPath))
        } else if (entry.isFile()) {
            files.push(fullPath)
        }
    }
    return files
}

function extractToolExecutable(installer, workDirectory) {
    const extractDirectory = path.join(workDirectory, 'extracted')
    fs.mkdirSync(extractDirectory, { recursive: true })
    const sevenZip = findSevenZip(values['seven-zip'])

    try {
        execFileSync(sevenZip, ['x', '-y', `-o${extractDirectory}`, installer], {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
        })
    } catch (error) {
        const stderr = String(error.stderr || '')
        fail(
            `7-Zip could not extract ${path.basename(installer)}.\n${stderr.trim()}\n` +
                'A full 7-Zip installation (7z.exe) is required; the reduced 7za.exe build cannot open NSIS installers.',
        )
    }

    const files = walk(extractDirectory)
    const exact = files.find((file) => path.basename(file).toLowerCase() === toolExecutable)
    const fallback = files.find(
        (file) =>
            /^mc[-_]?content[-_]?localizer[^/\\]*\.exe$/i.test(path.basename(file)) &&
            !/uninstall/i.test(path.basename(file)),
    )
    const executable = exact ?? fallback
    if (!executable) {
        fail(
            `Extracted installer does not contain ${toolExecutable}. ` +
                `Files found:\n${files.map((file) => `  - ${path.relative(extractDirectory, file)}`).join('\n')}`,
        )
    }
    return executable
}

function readInstalledVersion() {
    try {
        return fs.readFileSync(versionFile, 'utf8').trim()
    } catch {
        return null
    }
}

function verifyInstalledCopy(expectedVersion) {
    const installed = path.join(toolDirectory, toolExecutable)
    if (!fs.existsSync(installed))
        fail(`Missing ${path.relative(process.cwd(), installed)}; run the fetch step first.`)
    const fileVersion = powershellFileVersion(installed)
    if (!fileVersion) {
        log('note: FileVersion check skipped on this platform.')
    } else if (expectedVersion && fileVersion !== expectedVersion) {
        fail(`Installed FileVersion is ${fileVersion}, expected ${expectedVersion}.`)
    }
    log(
        `Installed ${toolExecutable}: FileVersion ${fileVersion ?? 'unknown'}, sha256 ${sha256File(installed)}`,
    )
    return installed
}

function recordVersion(version) {
    const current = readInstalledVersion()
    if (current !== version) {
        fs.writeFileSync(versionFile, `${version}\n`)
        log(`Updated ${path.relative(process.cwd(), versionFile)} to ${version}.`)
    }
}

function checkNotice(version, installerHash, executableHash) {
    let notice
    try {
        notice = fs.readFileSync(noticeFile, 'utf8')
    } catch {
        return
    }
    const missing = []
    if (!notice.includes(`Version      : ${version}`)) missing.push(`Version ${version}`)
    if (!notice.includes(installerHash)) missing.push(`installer sha256 ${installerHash}`)
    if (!notice.includes(executableHash)) missing.push(`executable sha256 ${executableHash}`)
    if (missing.length > 0) {
        log('')
        log('warning: NOTICE.txt provenance is stale for this download:')
        for (const item of missing) log(`  - missing ${item}`)
        log('Update apps/app/resources/tools/mc-content-localizer/NOTICE.txt before a release.')
    }
}

async function main() {
    if (values.check) {
        const installed = verifyInstalledCopy(readInstalledVersion())
        if (values.force) fail('--check cannot be combined with --force')
        if (values.version) {
            const fileVersion = powershellFileVersion(installed)
            if (fileVersion && fileVersion !== releaseVersion(normalizeTag(values.version))) {
                fail(`Installed FileVersion is ${fileVersion}, expected ${values.version}.`)
            }
        }
        return
    }

    const release = await resolveRelease(values.version)
    const version = releaseVersion(release.tag_name)
    const installed = path.join(toolDirectory, toolExecutable)
    const currentVersion = readInstalledVersion()

    if (!values.force && fs.existsSync(installed) && currentVersion === version) {
        const fileVersion = powershellFileVersion(installed)
        if (!fileVersion || fileVersion === version) {
            log(
                `${toolExecutable} ${version} is already installed at ${path.relative(process.cwd(), installed)}.`,
            )
            log('Use --force to download it again.')
            return
        }
    }

    const asset = selectInstaller(release)
    const digest = expectedDigest(asset, release)
    if (!digest && !values['allow-unverified']) {
        fail(
            'The GitHub release does not expose a SHA-256 digest for the installer. ' +
                'Pass --allow-unverified to accept this, or pin a release that publishes checksums.',
        )
    }

    const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-localizer-'))
    try {
        const installer = path.join(workDirectory, asset.name)
        const downloaded = await downloadInstaller(asset, installer)

        if (digest) {
            if (downloaded.hash !== digest.hash) {
                fail(
                    `Installer SHA-256 mismatch.\n  expected ${digest.hash} (${digest.source})\n  actual   ${downloaded.hash}`,
                )
            }
            log(`Installer sha256 ${downloaded.hash} verified (${digest.source}).`)
        } else {
            log(`warning: installer sha256 ${downloaded.hash} was not verified.`)
        }

        const executable = extractToolExecutable(installer, workDirectory)
        const executableHash = sha256File(executable)
        const fileVersion = powershellFileVersion(executable)
        if (fileVersion === null && !values['skip-version-check']) {
            fail(
                'Cannot read the extracted executable FileVersion on this platform. ' +
                    'Pass --skip-version-check when preparing Windows files on another OS.',
            )
        }
        if (fileVersion !== null && fileVersion !== version) {
            fail(
                `Extracted FileVersion is ${fileVersion}, expected ${version} from ${release.tag_name}.`,
            )
        }
        if (fileVersion !== null) log(`Extracted ${toolExecutable}: FileVersion ${fileVersion}.`)

        fs.mkdirSync(toolDirectory, { recursive: true })
        fs.copyFileSync(executable, installed)
        if (!fs.existsSync(installed) || sha256File(installed) !== executableHash) {
            fail(`Failed to install ${path.relative(process.cwd(), installed)}.`)
        }
        log(`Installed ${path.relative(process.cwd(), installed)}.`)
        log(`Executable sha256 ${executableHash}.`)

        recordVersion(version)
        checkNotice(version, downloaded.hash, executableHash)
    } finally {
        fs.rmSync(workDirectory, { recursive: true, force: true })
    }
}

try {
    await main()
} catch (error) {
    if (error && error.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') fail(error.message)
    console.error(error)
    process.exit(1)
}
