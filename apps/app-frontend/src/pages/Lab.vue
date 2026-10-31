<script setup lang="ts">
import { ChevronRightIcon, ExternalIcon, SearchIcon, StarIcon } from '@modrinth/assets'
import {
    Button,
    Card,
    Combobox,
    defineMessages,
    EmptyState,
    injectNotificationManager,
    StyledInput,
    TagItem,
    useVIntl,
} from '@modrinth/ui'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import { openUrl } from '@tauri-apps/plugin-opener'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import commandGeneratorToolCover from '@/assets/lab/command-generator-tool-cover.png'
import gradientTextToolCover from '@/assets/lab/gradient-text-tool-cover.png'
import modTranslationCover from '@/assets/lab/mod-translation-cover.png'
import recipeGeneratorToolCover from '@/assets/lab/recipe-generator-tool-cover.png'
import schematicPreviewToolCover from '@/assets/lab/schematic-preview-cover.png'
import seedMapToolCover from '@/assets/lab/seed-map-tool-cover.png'
import skinEditorToolCover from '@/assets/lab/skin-editor-tool-cover.png'
import {
    getLabCategoryFilter,
    getLabFavoriteFilter,
    getLabFavoriteToolIds,
    type LabCategoryFilter,
    type LabFavoriteFilter,
    setLabCategoryFilter,
    setLabFavoriteFilter,
    setLabFavoriteToolIds,
} from '@/helpers/lab-preferences'
import {
    asLocalizerFailure,
    installLocalizer,
    launchLocalizer,
    type LocalizerFailure,
    type LocalizerProgress,
    type LocalizerRelease,
    localizerReleaseInfo,
    localizerStatus,
} from '@/helpers/localizer'
import { update as updateSettings } from '@/helpers/settings'
import { labTools } from '@/lab/registry'

const { formatMessage } = useVIntl()
const { addNotification } = injectNotificationManager()
const router = useRouter()
const search = ref('')
const category = ref<LabCategoryFilter>(getLabCategoryFilter())
const favoriteFilter = ref<LabFavoriteFilter>(getLabFavoriteFilter())
const favoriteToolIds = ref<string[]>(getLabFavoriteToolIds())
// Temporarily hide the mod translation entry while retaining its route and implementation.
const availableTools = labTools.filter((tool) => tool.id !== 'mod-translation')
const toolCoverImages: Record<string, string> = {
    'gradient-text': gradientTextToolCover,
    'recipe-generator': recipeGeneratorToolCover,
    'schematic-preview': schematicPreviewToolCover,
    'seed-map': seedMapToolCover,
    'mod-translation': modTranslationCover,
    'skin-editor': skinEditorToolCover,
    'command-generator': commandGeneratorToolCover,
}

const messages = defineMessages({
    title: { id: 'app.lab.title', defaultMessage: 'Lab' },
    toolCount: { id: 'app.lab.tool-count', defaultMessage: '{count} tool' },
    toolCountPlural: { id: 'app.lab.tool-count-plural', defaultMessage: '{count} tools' },
    search: { id: 'app.lab.search', defaultMessage: 'Search tools' },
    allTools: { id: 'app.lab.category.all', defaultMessage: 'All tools' },
    creation: { id: 'app.lab.category.creation', defaultMessage: 'Creation' },
    maintenance: { id: 'app.lab.category.maintenance', defaultMessage: 'Maintenance' },
    world: { id: 'app.lab.category.world', defaultMessage: 'World' },
    enter: { id: 'app.lab.enter', defaultMessage: 'Enter' },
    favoriteFilterAll: { id: 'app.lab.favorite-filter.all', defaultMessage: 'All' },
    favoriteFilterFavorite: {
        id: 'app.lab.favorite-filter.favorite',
        defaultMessage: 'Favorited',
    },
    favoriteFilterUnfavorite: {
        id: 'app.lab.favorite-filter.unfavorite',
        defaultMessage: 'Not favorited',
    },
    favoriteAdd: { id: 'app.lab.favorite.add', defaultMessage: 'Add to favorites' },
    favoriteRemove: { id: 'app.lab.favorite.remove', defaultMessage: 'Remove from favorites' },
    noResults: { id: 'app.lab.no-results', defaultMessage: 'No tools match your search.' },
    noFavorites: {
        id: 'app.lab.no-favorites',
        defaultMessage: 'You have not favorited any tools yet.',
    },
    gradientTextTitle: {
        id: 'app.lab.gradient-text.title',
        defaultMessage: 'Gradient text generator',
    },
    gradientTextDescription: {
        id: 'app.lab.gradient-text.description',
        defaultMessage: 'Create Minecraft-ready gradient text without a browser.',
    },
    recipeGeneratorTitle: {
        id: 'app.lab.recipe-generator.title',
        defaultMessage: 'Recipe generator',
    },
    recipeGeneratorDescription: {
        id: 'app.lab.recipe-generator.description',
        defaultMessage: 'Create Minecraft Java data pack recipes from local item and tag data.',
    },
    seedMapTitle: { id: 'app.lab.seed-map.title', defaultMessage: 'Seed map' },
    seedMapDescription: {
        id: 'app.lab.seed-map.description',
        defaultMessage:
            'Explore a Minecraft seed locally with biomes, structures, and saved markers.',
    },
    schematicPreviewTitle: {
        id: 'app.lab.schematic-preview.title',
        defaultMessage: 'Schematic workshop',
    },
    schematicPreviewDescription: {
        id: 'app.lab.schematic-preview.description',
        defaultMessage: 'Quickly preview and edit your schematics.',
    },
    modTranslationTitle: {
        id: 'app.lab.mod-translation.title',
        defaultMessage: 'Mod translation',
    },
    modTranslationDescription: {
        id: 'app.lab.mod-translation.description',
        defaultMessage: 'Translate any Minecraft mod JAR into Simplified Chinese.',
    },
    skinEditorTitle: { id: 'app.lab.skin-editor.title', defaultMessage: 'Skin editor' },
    skinEditorDescription: {
        id: 'app.lab.skin-editor.description',
        defaultMessage: 'Create and edit Minecraft player skins locally.',
    },
    commandGeneratorTitle: {
        id: 'app.lab.command-generator.title',
        defaultMessage: 'Command generator',
    },
    commandGeneratorDescription: {
        id: 'app.lab.command-generator.description',
        defaultMessage: 'Generate Minecraft Java Edition commands with visual NBT editing.',
    },
    localizerTitle: {
        id: 'app.lab.localizer.title',
        defaultMessage: 'Mod localization',
    },
    localizerDescription: {
        id: 'app.lab.localizer.description',
        defaultMessage:
            'Call an external localization tool to translate English mods into Chinese.',
    },
    localizerSuccess: {
        id: 'app.lab.localizer.success',
        defaultMessage: 'Localization workshop started.',
    },
    localizerNotConfigured: {
        id: 'app.lab.localizer.error.not-configured',
        defaultMessage: 'No localization tool selected. Choose mc-content-localizer.exe first.',
    },
    localizerNotFound: {
        id: 'app.lab.localizer.error.not-found',
        defaultMessage: 'The localization tool is missing. Please choose it again.',
    },
    localizerLaunchFailed: {
        id: 'app.lab.localizer.error.launch-failed',
        defaultMessage: 'Could not start the localization tool.',
    },
    localizerChooseTitle: {
        id: 'app.lab.localizer.choose-title',
        defaultMessage: 'Select mc-content-localizer.exe',
    },
    localizerProjectHome: {
        id: 'app.lab.localizer.project-home',
        defaultMessage: 'Project page',
    },
    localizerCheckUpdates: {
        id: 'app.lab.localizer.check-updates',
        defaultMessage: 'Check updates',
    },
    localizerPromptTitle: {
        id: 'app.lab.localizer.download.title',
        defaultMessage: 'MC Content Localizer not found',
    },
    localizerPromptBody: {
        id: 'app.lab.localizer.download.body',
        defaultMessage: 'Download and install {version} ({size}) from GitHub now?',
    },
    localizerPromptUnsupported: {
        id: 'app.lab.localizer.download.unsupported',
        defaultMessage:
            'The latest release only provides an MSI installer, which cannot be installed silently. Please download it manually.',
    },
    localizerDownloading: {
        id: 'app.lab.localizer.download.downloading',
        defaultMessage: 'Downloading {percent}%',
    },
    localizerInstalling: {
        id: 'app.lab.localizer.download.installing',
        defaultMessage: 'Installing…',
    },
    localizerDownloadAndInstall: {
        id: 'app.lab.localizer.download.confirm',
        defaultMessage: 'Download and install',
    },
    localizerChooseManually: {
        id: 'app.lab.localizer.download.choose',
        defaultMessage: 'Choose manually',
    },
    localizerCancel: {
        id: 'app.lab.localizer.download.cancel',
        defaultMessage: 'Cancel',
    },
    localizerOpenReleasePage: {
        id: 'app.lab.localizer.download.release-page',
        defaultMessage: 'Open release page',
    },
    localizerInstalled: {
        id: 'app.lab.localizer.installed',
        defaultMessage: 'Localization workshop installed and started.',
    },
    localizerNetworkFailed: {
        id: 'app.lab.localizer.error.network',
        defaultMessage: 'Network request failed. Check your connection and try again.',
    },
    localizerRateLimited: {
        id: 'app.lab.localizer.error.rate-limited',
        defaultMessage:
            'GitHub API rate limit reached. Please retry later or download manually from the project page.',
    },
    localizerAssetUnavailable: {
        id: 'app.lab.localizer.error.asset-unavailable',
        defaultMessage: 'No compatible installer was found in the latest release.',
    },
    localizerDownloadFailed: {
        id: 'app.lab.localizer.error.download-failed',
        defaultMessage: 'The installer download failed or was interrupted.',
    },
    localizerVerifyFailed: {
        id: 'app.lab.localizer.error.verify-failed',
        defaultMessage: 'The downloaded installer failed its size/checksum verification.',
    },
    localizerInstallFailed: {
        id: 'app.lab.localizer.error.install-failed',
        defaultMessage: 'The installer could not be installed (it may have been blocked by UAC).',
    },
    localizerInstallTimeout: {
        id: 'app.lab.localizer.error.install-timeout',
        defaultMessage: 'The installation did not finish within {seconds} seconds.',
    },
    localizerNotFoundAfterInstall: {
        id: 'app.lab.localizer.error.not-found-after-install',
        defaultMessage:
            'Installation finished but the tool was not found afterwards. Try choosing it manually.',
    },
})

const categoryOptions: LabCategoryFilter[] = ['all', 'creation', 'maintenance', 'world']
const favoriteFilterOptions: LabFavoriteFilter[] = ['all', 'favorite', 'unfavorite']

watch(category, (value) => setLabCategoryFilter(value))
watch(favoriteFilter, (value) => setLabFavoriteFilter(value))
watch(favoriteToolIds, (ids) => setLabFavoriteToolIds(ids))

function isFavorite(toolId: string) {
    return favoriteToolIds.value.includes(toolId)
}

function toggleFavorite(toolId: string) {
    favoriteToolIds.value = isFavorite(toolId)
        ? favoriteToolIds.value.filter((id) => id !== toolId)
        : [...favoriteToolIds.value, toolId]
}

const visibleTools = computed(() => {
    const normalizedSearch = search.value.trim().toLocaleLowerCase()
    const favoriteSet = new Set(favoriteToolIds.value)

    const filtered = availableTools.filter((tool) => {
        const matchingCategory = category.value === 'all' || tool.category === category.value
        const matchingFavorite =
            favoriteFilter.value === 'all' ||
            (favoriteFilter.value === 'favorite' && favoriteSet.has(tool.id)) ||
            (favoriteFilter.value === 'unfavorite' && !favoriteSet.has(tool.id))
        const matchingSearch =
            !normalizedSearch ||
            [toolTitle(tool.id, tool.title), toolDescription(tool.id, tool.description)]
                .join(' ')
                .toLocaleLowerCase()
                .includes(normalizedSearch)

        return matchingCategory && matchingFavorite && matchingSearch
    })

    const favorited = filtered.filter((tool) => favoriteSet.has(tool.id))
    const unfavorited = filtered.filter((tool) => !favoriteSet.has(tool.id))
    return [...favorited, ...unfavorited]
})

const emptyHeading = computed(() => {
    if (favoriteFilter.value === 'favorite' && favoriteToolIds.value.length === 0) {
        return formatMessage(messages.noFavorites)
    }
    return formatMessage(messages.noResults)
})

function toolTitle(toolId: string, fallback: string) {
    if (toolId === 'skin-editor') return formatMessage(messages.skinEditorTitle)
    if (toolId === 'gradient-text') return formatMessage(messages.gradientTextTitle)
    if (toolId === 'recipe-generator') return formatMessage(messages.recipeGeneratorTitle)
    if (toolId === 'seed-map') return formatMessage(messages.seedMapTitle)
    if (toolId === 'schematic-preview') return formatMessage(messages.schematicPreviewTitle)
    if (toolId === 'mod-translation') return formatMessage(messages.modTranslationTitle)
    if (toolId === 'command-generator') return formatMessage(messages.commandGeneratorTitle)
    if (toolId === 'localizer') return formatMessage(messages.localizerTitle)
    return fallback
}

function toolDescription(toolId: string, fallback: string) {
    if (toolId === 'skin-editor') return formatMessage(messages.skinEditorDescription)
    if (toolId === 'gradient-text') return formatMessage(messages.gradientTextDescription)
    if (toolId === 'recipe-generator') return formatMessage(messages.recipeGeneratorDescription)
    if (toolId === 'seed-map') return formatMessage(messages.seedMapDescription)
    if (toolId === 'schematic-preview') return formatMessage(messages.schematicPreviewDescription)
    if (toolId === 'mod-translation') return formatMessage(messages.modTranslationDescription)
    if (toolId === 'command-generator') return formatMessage(messages.commandGeneratorDescription)
    if (toolId === 'localizer') return formatMessage(messages.localizerDescription)
    return fallback
}

function toolOnboardingId(toolId: string) {
    return ['gradient-text', 'recipe-generator', 'seed-map', 'schematic-preview'].includes(toolId)
        ? `lab-${toolId}-card`
        : undefined
}

function toolIconClasses(toolId: string) {
    if (toolId === 'seed-map') return 'bg-highlight-green text-brand'
    // External tools get the solid brand plate so they read as "open something"
    // rather than "browse another in-app page".
    if (toolId === 'localizer') return 'bg-brand text-[var(--color-accent-contrast)]'
    return 'bg-brand-highlight text-brand'
}

function categoryLabel(value: LabCategoryFilter) {
    if (value === 'all') return formatMessage(messages.allTools)
    return formatMessage(messages[value])
}

function favoriteFilterLabel(value: LabFavoriteFilter) {
    if (value === 'all') return formatMessage(messages.favoriteFilterAll)
    if (value === 'favorite') return formatMessage(messages.favoriteFilterFavorite)
    return formatMessage(messages.favoriteFilterUnfavorite)
}

const localizerBusy = ref(false)
const localizerPromptOpen = ref(false)
const localizerReleaseLoading = ref(false)
const localizerRelease = ref<LocalizerRelease | null>(null)
const localizerReleaseError = ref<string | null>(null)
const localizerProgress = ref<LocalizerProgress | null>(null)
const localizerInstalling = ref(false)
let unlistenLocalizerProgress: (() => void) | undefined

const LOCALIZER_PROJECT_URL = 'https://github.com/adssadax-1/mc-content-localizer'
const LOCALIZER_RELEASES_URL = `${LOCALIZER_PROJECT_URL}/releases`

const progressPercent = computed(() => {
    const progress = localizerProgress.value
    if (!progress || !progress.total) return 0
    return Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
})

function formatDownloadSize(bytes: number) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function failureMessage(failure: LocalizerFailure) {
    switch (failure.code) {
        case 'notFound':
        case 'notFoundAfterInstall':
            return formatMessage(messages.localizerNotFoundAfterInstall)
        case 'networkFailed':
            return formatMessage(messages.localizerNetworkFailed)
        case 'rateLimited':
            return formatMessage(messages.localizerRateLimited)
        case 'assetUnavailable':
            return formatMessage(messages.localizerAssetUnavailable)
        case 'downloadFailed':
            return formatMessage(messages.localizerDownloadFailed)
        case 'sizeMismatch':
        case 'digestMismatch':
            return formatMessage(messages.localizerVerifyFailed)
        case 'installFailed':
            return formatMessage(messages.localizerInstallFailed)
        case 'installTimeout':
            return formatMessage(messages.localizerInstallTimeout, {
                seconds: failure.seconds ?? 180,
            })
        default:
            return formatMessage(messages.localizerLaunchFailed)
    }
}

function notifyFailure(failure: LocalizerFailure) {
    const detail =
        failure.code === 'launchFailed' || failure.code === 'networkFailed'
            ? failure.message
            : undefined
    addNotification({
        title: formatMessage(messages.localizerTitle),
        text: detail ? `${failureMessage(failure)} (${detail})` : failureMessage(failure),
        type: 'error',
    })
}

async function pickLocalizerExecutable(): Promise<string | null> {
    const selected = await open({
        multiple: false,
        directory: false,
        title: formatMessage(messages.localizerChooseTitle),
        filters: [{ name: 'mc-content-localizer.exe', extensions: ['exe'] }],
    })
    if (!selected || Array.isArray(selected)) return null
    return selected
}

async function saveLocalizerPath(path: string | null) {
    await updateSettings({ localizer_path: path })
}

async function startLocalizer() {
    const path = await launchLocalizer()
    addNotification({
        title: formatMessage(messages.localizerTitle),
        text: path
            ? `${formatMessage(messages.localizerSuccess)} (${path})`
            : formatMessage(messages.localizerSuccess),
        type: 'success',
    })
}

async function openLocalizerDownloadPrompt() {
    localizerPromptOpen.value = true
    localizerReleaseLoading.value = true
    localizerRelease.value = null
    localizerReleaseError.value = null
    try {
        const release = await localizerReleaseInfo()
        localizerRelease.value = release
        if (!release.supported) {
            localizerReleaseError.value = formatMessage(messages.localizerPromptUnsupported)
        }
    } catch (error) {
        const failure = asLocalizerFailure(error)
        localizerReleaseError.value = failureMessage(failure)
        if (failure.code === 'rateLimited' || failure.code === 'networkFailed') {
            notifyFailure(failure)
        }
    } finally {
        localizerReleaseLoading.value = false
    }
}

function closeLocalizerPrompt() {
    if (localizerInstalling.value) return
    localizerPromptOpen.value = false
    localizerProgress.value = null
}

async function confirmLocalizerInstall() {
    const release = localizerRelease.value
    if (!release || !release.supported) return
    localizerInstalling.value = true
    localizerProgress.value = { phase: 'downloading', downloaded: 0, total: release.size }
    try {
        await installLocalizer(release)
        await startLocalizer()
        addNotification({
            title: formatMessage(messages.localizerTitle),
            text: formatMessage(messages.localizerInstalled),
            type: 'success',
        })
        localizerPromptOpen.value = false
    } catch (error) {
        notifyFailure(asLocalizerFailure(error))
    } finally {
        localizerInstalling.value = false
        localizerProgress.value = null
    }
}

async function chooseLocalizerManually() {
    const selected = await pickLocalizerExecutable()
    if (!selected) return
    await saveLocalizerPath(selected)
    try {
        await startLocalizer()
        localizerPromptOpen.value = false
    } catch (error) {
        notifyFailure(asLocalizerFailure(error))
    }
}

function openProjectPage() {
    void openUrl(LOCALIZER_PROJECT_URL)
}

function openReleasePage() {
    void openUrl(LOCALIZER_RELEASES_URL)
}

/**
 * Card click for the external localization tool:
 *   1. resolve settings → bundled → system installs and start it;
 *   2. only when none exists, offer downloading/installing the official release
 *      (or picking a local executable).
 * The renderer only ever writes the settings value; it never passes an executable
 * path to the shell.
 */
async function launchExternalLocalizer() {
    if (localizerBusy.value) return
    localizerBusy.value = true
    try {
        const status = await localizerStatus()
        if (!status.path) {
            await openLocalizerDownloadPrompt()
            return
        }
        try {
            await startLocalizer()
        } catch (error) {
            const failure = asLocalizerFailure(error)
            if (failure.code === 'notFound') {
                await openLocalizerDownloadPrompt()
            } else {
                notifyFailure(failure)
            }
        }
    } catch (error) {
        notifyFailure(asLocalizerFailure(error))
    } finally {
        localizerBusy.value = false
    }
}

onMounted(async () => {
    unlistenLocalizerProgress = await listen<LocalizerProgress>(
        'localizer-download-progress',
        (event) => {
            localizerProgress.value = event.payload
        },
    )
})

onUnmounted(() => {
    unlistenLocalizerProgress?.()
})

function enterTool(tool: (typeof labTools)[number]) {
    if (tool.external) {
        void launchExternalLocalizer()
        return
    }
    void router.push(tool.route)
}
</script>

<template>
    <main class="flex w-full flex-col gap-6 p-6">
        <header class="flex min-w-0 items-start justify-between gap-4">
            <div class="min-w-0">
                <h1 class="m-0 text-2xl font-bold text-[var(--color-text-primary)]">
                    {{ formatMessage(messages.title) }}
                </h1>
                <p class="m-0 mt-1 text-sm text-[var(--color-text-tertiary)]">
                    {{
                        formatMessage(
                            availableTools.length === 1
                                ? messages.toolCount
                                : messages.toolCountPlural,
                            {
                                count: availableTools.length,
                            },
                        )
                    }}
                </p>
            </div>
        </header>

        <div class="flex flex-wrap gap-2" aria-label="Lab tool filters">
            <StyledInput
                v-model="search"
                :icon="SearchIcon"
                :placeholder="formatMessage(messages.search)"
                clearable
                wrapper-class="min-w-[14rem] flex-1"
            />
            <Combobox
                v-model="category"
                :options="categoryOptions.map((value) => ({ value, label: categoryLabel(value) }))"
                width="custom"
                class="w-48 max-[576px]:w-full"
            />
            <Combobox
                v-model="favoriteFilter"
                :options="
                    favoriteFilterOptions.map((value) => ({
                        value,
                        label: favoriteFilterLabel(value),
                    }))
                "
                width="custom"
                class="w-48 max-[576px]:w-full"
            />
        </div>

        <section
            v-if="visibleTools.length"
            aria-label="Lab tools"
            data-onboarding-id="lab-tools"
            class="flex flex-col gap-3"
        >
            <Card
                v-for="tool in visibleTools"
                :key="tool.id"
                class="!m-0 relative flex items-end gap-4 !p-4 transition-[border-color,filter] duration-200 hover:border-surface-5 hover:brightness-[1.05]"
            >
                <button
                    class="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-colors hover:text-brand focus-visible:outline-none"
                    :aria-label="
                        isFavorite(tool.id)
                            ? formatMessage(messages.favoriteRemove)
                            : formatMessage(messages.favoriteAdd)
                    "
                    :aria-pressed="isFavorite(tool.id)"
                    @click="toggleFavorite(tool.id)"
                >
                    <StarIcon
                        class="size-5"
                        :class="
                            isFavorite(tool.id)
                                ? 'fill-brand text-brand'
                                : 'text-[var(--color-text-tertiary)]'
                        "
                    />
                </button>

                <div
                    v-if="tool.external"
                    class="absolute right-14 top-4 z-20 flex items-center gap-1"
                >
                    <button
                        type="button"
                        class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-surface-4 hover:text-brand focus-visible:outline-none"
                        @click.stop="openProjectPage"
                    >
                        <ExternalIcon class="size-3.5" />
                        {{ formatMessage(messages.localizerProjectHome) }}
                    </button>
                    <button
                        type="button"
                        class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-surface-4 hover:text-brand focus-visible:outline-none"
                        @click.stop="openReleasePage"
                    >
                        <ExternalIcon class="size-3.5" />
                        {{ formatMessage(messages.localizerCheckUpdates) }}
                    </button>
                </div>

                <component
                    :is="tool.external ? 'button' : RouterLink"
                    :to="tool.external ? undefined : tool.route"
                    :type="tool.external ? 'button' : undefined"
                    :aria-hidden="tool.external ? undefined : 'true'"
                    :tabindex="tool.external ? undefined : '-1'"
                    :class="[
                        'shrink-0 rounded-[var(--radius-lg)] focus-visible:outline-none',
                        tool.external ? 'cursor-pointer' : '',
                    ]"
                    @click="tool.external ? enterTool(tool) : undefined"
                >
                    <div
                        class="relative aspect-[2/1] w-56 overflow-hidden rounded-[var(--radius-lg)] bg-surface-2 max-[576px]:w-36"
                    >
                        <img
                            v-if="toolCoverImages[tool.id]"
                            :src="toolCoverImages[tool.id]"
                            alt=""
                            class="absolute inset-0 h-full w-full object-cover"
                        />
                        <div
                            v-else
                            class="flex h-full items-center justify-center"
                            :class="toolIconClasses(tool.id)"
                        >
                            <component :is="tool.icon" class="size-8" />
                        </div>
                    </div>
                </component>

                <div class="flex min-w-0 flex-1 flex-col">
                    <component
                        :is="tool.external ? 'button' : RouterLink"
                        :to="tool.external ? undefined : tool.route"
                        :type="tool.external ? 'button' : undefined"
                        :data-onboarding-id="toolOnboardingId(tool.id)"
                        :class="[
                            'min-w-0 rounded-[var(--radius-lg)] text-left text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                            tool.external ? 'cursor-pointer' : '',
                        ]"
                        @click="tool.external ? enterTool(tool) : undefined"
                    >
                        <h2
                            class="m-0 line-clamp-1 pr-10 text-lg font-bold leading-tight text-[var(--color-text-primary)]"
                        >
                            {{ toolTitle(tool.id, tool.title) }}
                        </h2>
                        <p
                            class="m-0 mt-1 line-clamp-2 text-sm leading-5 text-[var(--color-text-tertiary)]"
                        >
                            {{ toolDescription(tool.id, tool.description) }}
                        </p>
                    </component>
                    <div class="mt-auto flex items-center justify-between gap-3 pt-4">
                        <TagItem>{{ categoryLabel(tool.category) }}</TagItem>
                        <Button
                            type="colored"
                            color="brand"
                            size="sm"
                            class="min-w-20 justify-between px-3"
                            :disabled="tool.external && localizerBusy"
                            @click="enterTool(tool)"
                        >
                            <ChevronRightIcon />
                            {{ formatMessage(messages.enter) }}
                        </Button>
                    </div>
                </div>
            </Card>
        </section>

        <EmptyState v-else type="no-search-result" :heading="emptyHeading" aria-live="polite" />

        <Teleport to="body">
            <div
                v-if="localizerPromptOpen"
                class="fixed inset-0 z-[120] grid place-items-center bg-black/50 p-6"
                @click.self="closeLocalizerPrompt"
            >
                <div
                    class="flex w-full max-w-lg flex-col gap-3 rounded-2xl bg-surface-3 p-5 shadow-2xl"
                    role="dialog"
                    aria-modal="true"
                >
                    <h2 class="m-0 text-lg font-semibold text-[var(--color-text-primary)]">
                        {{ formatMessage(messages.localizerPromptTitle) }}
                    </h2>

                    <p
                        v-if="localizerReleaseLoading"
                        class="m-0 text-sm text-[var(--color-text-tertiary)]"
                    >
                        …
                    </p>
                    <p
                        v-else-if="localizerRelease"
                        class="m-0 text-sm text-[var(--color-text-secondary)]"
                    >
                        {{
                            formatMessage(messages.localizerPromptBody, {
                                version: localizerRelease.version,
                                size: formatDownloadSize(localizerRelease.size),
                            })
                        }}
                    </p>
                    <p class="m-0 break-all text-xs text-[var(--color-text-tertiary)]">
                        {{ localizerRelease?.assetName ?? localizerRelease?.downloadUrl }}
                    </p>
                    <p
                        v-if="localizerReleaseError"
                        class="m-0 text-sm text-[var(--color-text-tertiary)]"
                    >
                        {{ localizerReleaseError }}
                    </p>

                    <div v-if="localizerProgress" class="flex flex-col gap-1">
                        <div class="h-2 w-full overflow-hidden rounded-full bg-surface-5">
                            <div
                                class="h-full rounded-full bg-brand transition-[width]"
                                :style="{ width: `${progressPercent}%` }"
                            />
                        </div>
                        <span class="text-xs text-[var(--color-text-tertiary)]">
                            {{
                                localizerProgress.phase === 'installing'
                                    ? formatMessage(messages.localizerInstalling)
                                    : formatMessage(messages.localizerDownloading, {
                                          percent: progressPercent,
                                      })
                            }}
                        </span>
                    </div>

                    <div class="mt-1 flex flex-wrap items-center gap-2">
                        <Button
                            type="colored"
                            color="brand"
                            size="sm"
                            :disabled="
                                localizerInstalling ||
                                localizerReleaseLoading ||
                                !localizerRelease?.supported
                            "
                            @click="confirmLocalizerInstall"
                        >
                            {{ formatMessage(messages.localizerDownloadAndInstall) }}
                        </Button>
                        <Button
                            type="base"
                            size="sm"
                            :disabled="localizerInstalling"
                            @click="chooseLocalizerManually"
                        >
                            {{ formatMessage(messages.localizerChooseManually) }}
                        </Button>
                        <Button
                            type="base"
                            size="sm"
                            :disabled="localizerInstalling"
                            @click="closeLocalizerPrompt"
                        >
                            {{ formatMessage(messages.localizerCancel) }}
                        </Button>
                        <button
                            type="button"
                            class="ml-auto flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-brand"
                            @click="openProjectPage"
                        >
                            <ExternalIcon class="size-3.5" />
                            {{ formatMessage(messages.localizerProjectHome) }}
                        </button>
                        <button
                            type="button"
                            class="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-brand"
                            @click="openReleasePage"
                        >
                            <ExternalIcon class="size-3.5" />
                            {{ formatMessage(messages.localizerOpenReleasePage) }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    </main>
</template>
