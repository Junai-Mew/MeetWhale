<script setup lang="ts">
import { ChevronDownIcon, DownloadIcon, RefreshCwIcon, RightArrowIcon } from '@modrinth/assets'
import { Button, defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useNetworkStatus } from '@/composables/useNetworkStatus'
import {
    install_create_instance,
    installJobInstanceId,
    wait_for_install_job,
} from '@/helpers/install'
import { list } from '@/helpers/instance'
import { get_game_versions, get_loader_versions } from '@/helpers/metadata'
import type { GameInstance } from '@/helpers/types'

interface VanillaVersion {
    id: string
    type: string
    releaseTime?: string
}

interface VersionGroup {
    id: string
    label: string
    versions: VanillaVersion[]
}

interface LoaderVersionEntry {
    id: string
    stable: boolean
}

type LoaderKind = 'fabric' | 'forge' | 'neoforge' | 'quilt' | 'optifine'

interface LoaderDefinition {
    kind: LoaderKind
    label: string
    /** Name used by the loader metadata API. */
    api: string
    /** Loader name stored on instances. */
    instance: string
}

const LOADERS: LoaderDefinition[] = [
    { kind: 'fabric', label: 'Fabric', api: 'fabric', instance: 'fabric' },
    { kind: 'forge', label: 'Forge', api: 'forge', instance: 'forge' },
    { kind: 'neoforge', label: 'NeoForge', api: 'neo', instance: 'neoforge' },
    { kind: 'quilt', label: 'Quilt', api: 'quilt', instance: 'quilt' },
    { kind: 'optifine', label: 'OptiFine', api: 'optifine', instance: 'optifine' },
]

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()
const { offline } = useNetworkStatus()
const router = useRouter()

const messages = defineMessages({
    title: { id: 'app.pcl.download.vanilla.title', defaultMessage: 'Vanilla game' },
    description: {
        id: 'app.pcl.download.vanilla.description',
        defaultMessage: 'Install a clean Minecraft version as a new instance.',
    },
    release: { id: 'app.pcl.download.vanilla.group.release', defaultMessage: 'Releases' },
    snapshot: { id: 'app.pcl.download.vanilla.group.snapshot', defaultMessage: 'Snapshots' },
    old: { id: 'app.pcl.download.vanilla.group.old', defaultMessage: 'Ancient versions' },
    aprilFools: {
        id: 'app.pcl.download.vanilla.group.april-fools',
        defaultMessage: 'April Fools',
    },
    refresh: { id: 'app.pcl.download.vanilla.refresh', defaultMessage: 'Refresh' },
    latest: { id: 'app.pcl.download.vanilla.latest', defaultMessage: 'Latest' },
    empty: {
        id: 'app.pcl.download.vanilla.empty',
        defaultMessage: 'Could not load the version list.',
    },
    loading: { id: 'app.pcl.download.vanilla.loading', defaultMessage: 'Loading versions…' },
    released: { id: 'app.pcl.download.vanilla.released', defaultMessage: 'Released {date}' },
    loadersTitle: {
        id: 'app.pcl.download.vanilla.loaders-title',
        defaultMessage: 'Mod loaders',
    },
    loaderAvailable: {
        id: 'app.pcl.download.vanilla.loader-available',
        defaultMessage: 'Available',
    },
    loaderInstalled: {
        id: 'app.pcl.download.vanilla.loader-installed',
        defaultMessage: 'Installed',
    },
    loaderUnsupported: {
        id: 'app.pcl.download.vanilla.loader-unsupported',
        defaultMessage: 'Not for this version',
    },
    loaderFailed: {
        id: 'app.pcl.download.vanilla.loader-failed',
        defaultMessage: 'Failed to load, click to retry',
    },
    loaderLoading: {
        id: 'app.pcl.download.vanilla.loader-loading',
        defaultMessage: 'Loading…',
    },
    allVersions: {
        id: 'app.pcl.download.vanilla.all-versions',
        defaultMessage: 'All versions ({count})',
    },
    noVersions: {
        id: 'app.pcl.download.vanilla.no-versions',
        defaultMessage: 'No builds available.',
    },
    stable: { id: 'app.pcl.download.vanilla.stable', defaultMessage: 'Stable' },
    startDownload: {
        id: 'app.pcl.download.vanilla.start-download',
        defaultMessage: 'Start download',
    },
    vanillaOnly: {
        id: 'app.pcl.download.vanilla.vanilla-only',
        defaultMessage: 'Vanilla only',
    },
    installing: {
        id: 'app.pcl.download.vanilla.installing',
        defaultMessage: 'Installing…',
    },
    selectLoaderHint: {
        id: 'app.pcl.download.vanilla.select-loader-hint',
        defaultMessage: 'Pick a loader build, or install the vanilla game.',
    },
    backToList: {
        id: 'app.pcl.download.vanilla.back',
        defaultMessage: 'Back to list',
    },
})

/** Snapshots Mojang shipped on April 1st. Kept as data so the group can be labelled. */
const APRIL_FOOLS = new Set([
    '15w14a',
    '1.rv-pre1',
    '3d shareware v1.34',
    '20w14infinite',
    '20w14∞',
    '22w13oneblockatatime',
    '23w13a_or_b',
    '24w14potato',
    '25w14craftmine',
])

const versions = ref<VanillaVersion[]>([])
const latestRelease = ref<string | null>(null)
const loading = ref(true)
const error = ref(false)
const collapsed = ref<Set<string>>(new Set())
const installing = ref(false)

const selectedVersion = ref<VanillaVersion | null>(null)
const expandedLoader = ref<LoaderKind | null>(null)
const selectedLoader = ref<{ kind: LoaderKind; version: string } | null>(null)
const instances = ref<GameInstance[]>([])

interface LoaderState {
    status: 'idle' | 'loading' | 'ready' | 'error'
    versions: LoaderVersionEntry[]
}

/** Lazy loader manifests, cached per Minecraft version + loader. */
const loaderCache = reactive(new Map<string, LoaderState>())

const groups = computed<VersionGroup[]>(() => {
    const release = versions.value.filter((version) => version.type === 'release')
    const snapshot = versions.value.filter((version) => version.type === 'snapshot')
    const old = versions.value.filter(
        (version) => version.type === 'old_beta' || version.type === 'old_alpha',
    )
    const april = snapshot.filter((version) => APRIL_FOOLS.has(version.id.toLowerCase()))
    const regularSnapshots = snapshot.filter((version) => !april.includes(version))
    return [
        { id: 'release', label: formatMessage(messages.release), versions: release },
        { id: 'snapshot', label: formatMessage(messages.snapshot), versions: regularSnapshots },
        { id: 'old', label: formatMessage(messages.old), versions: old },
        { id: 'april-fools', label: formatMessage(messages.aprilFools), versions: april },
    ].filter((group) => group.versions.length > 0)
})

const installedKeys = computed(() => {
    const keys = new Set<string>()
    for (const instance of instances.value) {
        const loader = (instance.loader ?? 'vanilla').toLowerCase()
        const normalized = loader === 'neo' ? 'neoforge' : loader
        keys.add(`${instance.game_version}:${normalized}`)
    }
    return keys
})

function isLoaderInstalled(mc: string, loader: LoaderDefinition) {
    return installedKeys.value.has(`${mc}:${loader.instance}`)
}

function loaderState(mc: string, loader: LoaderDefinition): LoaderState {
    const key = `${mc}:${loader.kind}`
    const existing = loaderCache.get(key)
    if (existing) return existing
    const state: LoaderState = { status: 'idle', versions: [] }
    loaderCache.set(key, state)
    // 必须返回 Map 里的代理对象：直接返回原始对象会让后续状态变更不参与响应式。
    return loaderCache.get(key) ?? state
}

function toggle(groupId: string) {
    const next = new Set(collapsed.value)
    if (next.has(groupId)) next.delete(groupId)
    else next.add(groupId)
    collapsed.value = next
}

async function loadVersions() {
    loading.value = true
    error.value = false
    try {
        const manifest = (await get_game_versions()) as {
            latest?: { release?: string; snapshot?: string }
            versions?: VanillaVersion[]
        }
        latestRelease.value = manifest.latest?.release ?? null
        versions.value = Array.isArray(manifest.versions) ? manifest.versions : []
        if (versions.value.length === 0) error.value = true
    } catch (err) {
        error.value = true
        handleError(err)
    } finally {
        loading.value = false
    }
}

async function refreshInstances() {
    try {
        instances.value = await list()
    } catch {
        instances.value = []
    }
}

function resetSelection() {
    expandedLoader.value = null
    selectedLoader.value = null
}

function selectVersion(version: VanillaVersion) {
    selectedVersion.value = version
    resetSelection()
    void loadLoaderManifests(version)
}

function closeDetail() {
    selectedVersion.value = null
    resetSelection()
}

async function loadLoaderManifests(version: VanillaVersion) {
    await Promise.all(LOADERS.map((loader) => loadLoader(version.id, loader)))
}

async function loadLoader(mc: string, loader: LoaderDefinition) {
    const state = loaderState(mc, loader)
    if (state.status === 'loading' || state.status === 'ready') return
    state.status = 'loading'
    try {
        const manifest = (await Promise.race([
            get_loader_versions(loader.api, mc),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('loader manifest timeout')), 10000),
            ),
        ])) as {
            gameVersions?: Array<{
                id: string
                loaders?: Array<{ id: string; stable?: boolean }>
            }>
        }
        const entries = Array.isArray(manifest.gameVersions) ? manifest.gameVersions : []
        const scoped =
            entries.find((entry) => entry.id === mc) ?? (entries.length === 1 ? entries[0] : null)
        state.versions = (scoped?.loaders ?? [])
            .map((entry) => ({ id: entry.id, stable: entry.stable !== false }))
            .filter((entry) => !!entry.id)
        state.status = 'ready'
    } catch {
        state.status = 'error'
        state.versions = []
    }
}

function retryLoader(loader: LoaderDefinition) {
    if (!selectedVersion.value) return
    const state = loaderState(selectedVersion.value.id, loader)
    state.status = 'idle'
    void loadLoader(selectedVersion.value.id, loader)
}

function toggleLoaderRow(loader: LoaderDefinition) {
    if (!selectedVersion.value) return
    if (expandedLoader.value === loader.kind) {
        expandedLoader.value = null
        return
    }
    expandedLoader.value = loader.kind
    void loadLoader(selectedVersion.value.id, loader)
}

function pickLoaderVersion(loader: LoaderDefinition, versionId: string) {
    selectedLoader.value = { kind: loader.kind, version: versionId }
}

function loaderBadge(loader: LoaderDefinition): string {
    const version = selectedVersion.value
    if (!version) return ''
    const state = loaderState(version.id, loader)
    // 加载中 / 失败 不能被「已安装」覆盖，否则失败的加载器会误显示为已安装。
    if (state.status === 'error') return formatMessage(messages.loaderFailed)
    if (state.status !== 'ready') return formatMessage(messages.loaderLoading)
    if (isLoaderInstalled(version.id, loader)) return formatMessage(messages.loaderInstalled)
    return state.versions.length
        ? formatMessage(messages.loaderAvailable)
        : formatMessage(messages.loaderUnsupported)
}

function releaseLabel(version: VanillaVersion) {
    if (!version.releaseTime) return ''
    const date = new Date(version.releaseTime)
    if (Number.isNaN(date.getTime())) return ''
    return formatMessage(messages.released, {
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
            date.getDate(),
        ).padStart(2, '0')}`,
    })
}

async function install(loader?: LoaderDefinition) {
    const version = selectedVersion.value
    if (!version || offline.value || installing.value) return
    const chosen = loader ? selectedLoader.value : null
    installing.value = true
    try {
        const name = loader ? `${version.id}-${loader.label}` : version.id
        const job = await install_create_instance({
            name,
            gameVersion: version.id,
            loader: loader ? loader.instance : 'vanilla',
            loaderVersion: chosen?.version ?? 'latest',
            iconPath: null,
        })
        await wait_for_install_job(job.job_id)
        const instanceId = installJobInstanceId(job)
        await refreshInstances()
        if (instanceId) {
            await router.push(`/instance/${encodeURIComponent(instanceId)}`)
        }
    } catch (err) {
        handleError(err)
    } finally {
        installing.value = false
    }
}

onMounted(() => {
    void loadVersions()
    void refreshInstances()
})
</script>

<template>
    <div class="pcl-page absolute inset-0 flex min-h-0 w-full flex-col gap-3 overflow-hidden p-4">
        <div
            class="grid min-h-0 flex-1 gap-3"
            :class="
                selectedVersion ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]' : 'lg:grid-cols-1'
            "
        >
            <section class="pcl-card flex min-h-0 flex-col">
                <header class="pcl-card-header flex shrink-0 items-center gap-2">
                    <div class="flex min-w-0 flex-col gap-0.5">
                        <h2 class="pcl-card-title">{{ formatMessage(messages.title) }}</h2>
                        <p class="pcl-muted m-0 text-[11px] leading-none">
                            {{ formatMessage(messages.description) }}
                        </p>
                    </div>
                    <div class="ml-auto flex shrink-0 items-center gap-1.5">
                        <Button type="quiet" size="2xs" :disabled="loading" @click="loadVersions">
                            <RefreshCwIcon class="size-3.5" />
                            {{ formatMessage(messages.refresh) }}
                        </Button>
                    </div>
                </header>
                <div class="pcl-card-body flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                    <div v-if="loading" class="pcl-muted flex items-center gap-2 p-2 text-[12px]">
                        <RefreshCwIcon class="size-3.5 animate-spin" />
                        {{ formatMessage(messages.loading) }}
                    </div>
                    <div v-else-if="error" class="pcl-muted p-2 text-[12px]">
                        {{ formatMessage(messages.empty) }}
                    </div>
                    <div v-for="group in groups" v-else :key="group.id" class="pcl-version-group">
                        <button
                            type="button"
                            class="pcl-version-group-header flex w-full items-center gap-2"
                            @click="toggle(group.id)"
                        >
                            <ChevronDownIcon
                                class="size-3.5 shrink-0 transition-transform"
                                :class="{ '-rotate-90': collapsed.has(group.id) }"
                            />
                            <span class="text-[12px] font-semibold">{{ group.label }}</span>
                            <span class="pcl-muted text-[11px] leading-none">
                                {{ group.versions.length }}
                            </span>
                        </button>
                        <ul v-if="!collapsed.has(group.id)" class="m-0 flex list-none flex-col p-0">
                            <li
                                v-for="version in group.versions"
                                :key="version.id"
                                class="pcl-version-row flex items-center gap-2 px-3 py-1.5"
                                :class="{
                                    'pcl-version-row-selected': selectedVersion?.id === version.id,
                                }"
                            >
                                <button
                                    type="button"
                                    class="flex min-w-0 flex-1 items-center gap-2 border-0 bg-transparent p-0 text-left font-[inherit]"
                                    @click="selectVersion(version)"
                                >
                                    <span class="min-w-0 flex-1 truncate text-[13px] font-medium">
                                        {{ version.id }}
                                    </span>
                                    <span
                                        v-if="version.id === latestRelease"
                                        class="pcl-badge pcl-badge-accent shrink-0"
                                    >
                                        {{ formatMessage(messages.latest) }}
                                    </span>
                                    <RightArrowIcon class="pcl-muted size-3.5 shrink-0" />
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <section v-if="selectedVersion" class="pcl-card flex min-h-0 flex-col">
                <header class="pcl-card-header flex shrink-0 flex-wrap items-center gap-2">
                    <button
                        type="button"
                        class="pcl-muted flex items-center gap-1 border-0 bg-transparent p-0 text-[11px] font-[inherit] hover:text-brand"
                        @click="closeDetail"
                    >
                        <ChevronDownIcon class="size-3 rotate-90" />
                        {{ formatMessage(messages.backToList) }}
                    </button>
                    <h2 class="pcl-card-title m-0">{{ selectedVersion.id }}</h2>
                    <span class="pcl-badge shrink-0">{{ selectedVersion.type }}</span>
                    <span v-if="releaseLabel(selectedVersion)" class="pcl-muted text-[11px]">
                        {{ releaseLabel(selectedVersion) }}
                    </span>
                </header>
                <div class="pcl-card-body flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                    <div class="flex items-center gap-2">
                        <span class="text-[12px] font-semibold">{{
                            formatMessage(messages.loadersTitle)
                        }}</span>
                    </div>
                    <ul class="m-0 flex list-none flex-col gap-1 p-0">
                        <li
                            v-for="loader in LOADERS"
                            :key="loader.kind"
                            class="rounded-md border border-solid border-[var(--surface-4)]"
                        >
                            <button
                                type="button"
                                class="flex w-full items-center gap-2 border-0 bg-transparent px-3 py-2 text-left font-[inherit]"
                                @click="toggleLoaderRow(loader)"
                            >
                                <span class="text-[13px] font-medium">{{ loader.label }}</span>
                                <span
                                    class="pcl-badge ml-auto shrink-0"
                                    :class="{
                                        'pcl-badge-accent': isLoaderInstalled(
                                            selectedVersion.id,
                                            loader,
                                        ),
                                    }"
                                >
                                    {{ loaderBadge(loader) }}
                                </span>
                                <ChevronDownIcon
                                    class="pcl-muted size-3.5 shrink-0 transition-transform"
                                    :class="{ 'rotate-180': expandedLoader === loader.kind }"
                                />
                            </button>
                            <div
                                v-if="expandedLoader === loader.kind"
                                class="border-0 border-t border-solid border-[var(--surface-4)]"
                            >
                                <div
                                    v-if="
                                        loaderState(selectedVersion.id, loader).status === 'error'
                                    "
                                    class="pcl-muted p-3 text-[12px]"
                                >
                                    <button
                                        type="button"
                                        class="border-0 bg-transparent p-0 font-[inherit] text-brand"
                                        @click="retryLoader(loader)"
                                    >
                                        {{ formatMessage(messages.loaderFailed) }}
                                    </button>
                                </div>
                                <div
                                    v-else-if="
                                        loaderState(selectedVersion.id, loader).status === 'loading'
                                    "
                                    class="pcl-muted flex items-center gap-2 p-3 text-[12px]"
                                >
                                    <RefreshCwIcon class="size-3.5 animate-spin" />
                                    {{ formatMessage(messages.loaderLoading) }}
                                </div>
                                <div
                                    v-else-if="
                                        loaderState(selectedVersion.id, loader).versions.length ===
                                        0
                                    "
                                    class="pcl-muted p-3 text-[12px]"
                                >
                                    {{ formatMessage(messages.noVersions) }}
                                </div>
                                <div v-else class="flex min-h-0 flex-col">
                                    <p class="pcl-muted m-0 px-3 py-1.5 text-[11px]">
                                        {{
                                            formatMessage(messages.allVersions, {
                                                count: loaderState(selectedVersion.id, loader)
                                                    .versions.length,
                                            })
                                        }}
                                    </p>
                                    <div class="min-h-0">
                                        <button
                                            v-for="(entry, index) in loaderState(
                                                selectedVersion.id,
                                                loader,
                                            ).versions"
                                            :key="entry.id"
                                            type="button"
                                            class="flex w-full items-center gap-2 border-0 bg-transparent px-3 py-1 text-left font-[inherit] text-[12px] hover:bg-[var(--surface-3)]"
                                            :class="{
                                                'text-brand':
                                                    selectedLoader?.kind === loader.kind &&
                                                    selectedLoader?.version === entry.id,
                                            }"
                                            @click="pickLoaderVersion(loader, entry.id)"
                                        >
                                            <span class="min-w-0 flex-1 truncate">{{
                                                entry.id
                                            }}</span>
                                            <span
                                                v-if="index === 0 && entry.stable"
                                                class="pcl-badge pcl-badge-accent shrink-0"
                                            >
                                                {{ formatMessage(messages.latest) }}
                                            </span>
                                            <span
                                                v-else-if="entry.stable"
                                                class="pcl-muted shrink-0 text-[10px]"
                                            >
                                                {{ formatMessage(messages.stable) }}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </li>
                    </ul>
                    <p class="pcl-muted m-0 text-[11px]">
                        {{ formatMessage(messages.selectLoaderHint) }}
                    </p>
                </div>
                <div
                    class="flex shrink-0 flex-wrap items-center gap-2 border-0 border-t border-solid border-[var(--surface-4)] p-3"
                >
                    <Button
                        type="colored"
                        color="brand"
                        size="sm"
                        :disabled="offline || installing"
                        @click="
                            install(
                                LOADERS.find(
                                    (candidate) => candidate.kind === selectedLoader?.kind,
                                ),
                            )
                        "
                    >
                        <DownloadIcon class="size-3.5" />
                        {{
                            installing
                                ? formatMessage(messages.installing)
                                : formatMessage(messages.startDownload)
                        }}
                    </Button>
                    <Button
                        type="base"
                        size="sm"
                        :disabled="offline || installing"
                        @click="install()"
                    >
                        {{ formatMessage(messages.vanillaOnly) }}
                    </Button>
                </div>
            </section>
        </div>
    </div>
</template>
