/**
 * Section detection for the PCL-style shell (top tabs + contextual sidebar).
 * Kept in one place so the top bar and the sidebar never disagree about which
 * section the current URL belongs to.
 */
export type PclSection = 'launch' | 'download' | 'settings' | 'more'

const SECTION_PREFIXES: Record<PclSection, string[]> = {
    launch: ['/launch', '/instance', '/create', '/library'],
    download: ['/download', '/browse', '/project', '/resource'],
    settings: ['/settings'],
    more: [
        '/more',
        '/skins',
        '/multiplayer',
        '/screenshots',
        '/lab',
        '/worlds',
        '/favorites',
        '/downloads',
        '/help',
    ],
}

export function pathMatchesPrefix(path: string, prefix: string): boolean {
    return path === prefix || path.startsWith(`${prefix}/`)
}

export function pclSectionForPath(path: string): PclSection {
    for (const [section, prefixes] of Object.entries(SECTION_PREFIXES) as [
        PclSection,
        string[],
    ][]) {
        if (prefixes.some((prefix) => pathMatchesPrefix(path, prefix))) return section
    }
    return 'launch'
}
