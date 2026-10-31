<script setup lang="ts">
import {
    ClipboardCopyIcon,
    CopyIcon,
    FolderOpenIcon,
    PencilIcon,
    PlayIcon,
    PlusIcon,
    RefreshCwIcon,
    SettingsIcon,
    StopCircleIcon,
    TrashIcon,
} from '@modrinth/assets'
import {
    Button,
    commonMessages,
    defineMessages,
    injectNotificationManager,
    OverflowMenu,
    useRelativeTime,
    useVIntl,
} from '@modrinth/ui'
import dayjs from 'dayjs'
import { computed, inject, onMounted, onUnmounted, type Ref, ref } from 'vue'
import { useRouter } from 'vue-router'

import AccountsCard from '@/components/ui/AccountsCard.vue'
import InstanceIcon from '@/components/ui/InstanceIcon.vue'
import ConfirmDeleteInstanceModal from '@/components/ui/modal/ConfirmDeleteInstanceModal.vue'
import { install_duplicate_instance } from '@/helpers/install'
import { kill, list, remove, run } from '@/helpers/instance'
import { get_all as getRunningProcesses } from '@/helpers/process'
import { update as updateSettings } from '@/helpers/settings'
import type { GameInstance } from '@/helpers/types'
import { copyToClipboard, showInstanceInFolder } from '@/helpers/utils.js'
import { useTheming } from '@/store/theme'

const router = useRouter()
const themeStore = useTheming()
const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()
const relativeTime = useRelativeTime()

const messages = defineMessages({
    account: { id: 'app.pcl.launch.account', defaultMessage: 'Account' },
    play: { id: 'app.pcl.launch.play', defaultMessage: 'Launch game' },
    stop: { id: 'app.pcl.launch.stop', defaultMessage: 'Stop game' },
    starting: { id: 'app.pcl.launch.starting', defaultMessage: 'Starting…' },
    versionSelect: { id: 'app.pcl.launch.version-select', defaultMessage: 'Select version' },
    versionSettings: { id: 'app.pcl.launch.version-settings', defaultMessage: 'Version settings' },
    versionList: { id: 'app.pcl.launch.version-list', defaultMessage: 'Version list' },
    currentVersion: { id: 'app.pcl.launch.current-version', defaultMessage: 'Current version' },
    noVersion: { id: 'app.pcl.launch.no-version', defaultMessage: 'No version selected yet' },
    noVersions: {
        id: 'app.pcl.launch.no-versions',
        defaultMessage: 'No instances yet. Create one from Download → Vanilla game.',
    },
    createInstance: { id: 'app.pcl.launch.create-instance', defaultMessage: 'New instance' },
    openLibrary: { id: 'app.pcl.launch.open-library', defaultMessage: 'Instance library' },
    refresh: { id: 'app.pcl.launch.refresh', defaultMessage: 'Refresh' },
    running: { id: 'app.pcl.launch.running', defaultMessage: 'Running' },
    neverPlayed: { id: 'app.pcl.launch.never-played', defaultMessage: 'Never launched' },
    played: { id: 'app.pcl.launch.played', defaultMessage: 'Last launched {time}' },
    pickHint: {
        id: 'app.pcl.launch.pick-hint',
        defaultMessage: 'Click a row to choose the version the button launches.',
    },
    selectFirst: {
        id: 'app.pcl.launch.select-first',
        defaultMessage: 'Select a version first',
    },
    selectFirstText: {
        id: 'app.pcl.launch.select-first-description',
        defaultMessage: 'Pick a version from the list below, then launch the game.',
    },
    addContent: { id: 'app.instances.add-content', defaultMessage: 'Add content' },
    viewInstance: { id: 'app.instances.view-instance', defaultMessage: 'View instance' },
    duplicateInstance: {
        id: 'app.instances.duplicate-instance',
        defaultMessage: 'Duplicate instance',
    },
    copyPath: { id: 'app.instances.copy-path', defaultMessage: 'Copy path' },
    rowDelete: { id: 'app.pcl.launch.row-delete', defaultMessage: 'Delete instance' },
    rowSettings: { id: 'app.pcl.launch.row-settings', defaultMessage: 'Version settings' },
    deleteWarning: {
        id: 'app.pcl.launch.delete-warning',
        defaultMessage:
            'The entire folder of this instance will be deleted and cannot be recovered.',
    },
    deleteConfirm: { id: 'app.pcl.launch.delete-confirm', defaultMessage: 'Delete' },
    deleteSuccessTitle: {
        id: 'app.pcl.launch.delete-success-title',
        defaultMessage: 'Instance deleted',
    },
    deleteSuccessText: {
        id: 'app.pcl.launch.delete-success-text',
        defaultMessage: '{name} was removed from disk.',
    },
})

const instances = ref<GameInstance[]>([])
const runningIds = ref<Set<string>>(new Set())
const startingIds = ref<Set<string>>(new Set())
const loading = ref(true)
const deleteModal = ref<InstanceType<typeof ConfirmDeleteInstanceModal> | null>(null)
const pendingDelete = ref<GameInstance | null>(null)

const accountsCard = ref<InstanceType<typeof AccountsCard> | null>(null)
/** App.vue 提供的应用级账户卡片引用（皮肤页依赖它的 login/refreshValues）。 */
const providedAccountsCard = inject<Ref<InstanceType<typeof AccountsCard> | null> | null>(
    'accountsCard',
    null,
)

const selectedId = computed(() => themeStore.minimalHomeInstanceId)
const selected = computed<GameInstance | undefined>(() => {
    const byId = instances.value.find((instance) => instance.id === selectedId.value)
    return byId ?? instances.value[0]
})

const selectedRunning = computed(() => !!selected.value && runningIds.value.has(selected.value.id))
const selectedStarting = computed(
    () => !!selected.value && startingIds.value.has(selected.value.id),
)

async function refreshRunning() {
    try {
        const processes = await getRunningProcesses()
        runningIds.value = new Set(
            (processes as { instance_id?: string }[])
                .map((process) => process.instance_id)
                .filter((id): id is string => !!id),
        )
    } catch {
        // 进程插件不可用（浏览器预览）时保持上一次状态。
    }
}

async function refreshInstances() {
    try {
        instances.value = await list()
    } catch (error) {
        handleError(error)
    } finally {
        loading.value = false
    }
}

function selectInstance(instance: GameInstance) {
    if (themeStore.minimalHomeInstanceId === instance.id) return
    themeStore.minimalHomeInstanceId = instance.id
    void updateSettings({ minimal_home_instance_id: instance.id }).catch(handleError)
}

async function launch(instance: GameInstance | undefined) {
    if (!instance) {
        addNotification({
            title: formatMessage(messages.selectFirst),
            text: formatMessage(messages.selectFirstText),
            type: 'warning',
        })
        return
    }
    if (startingIds.value.has(instance.id)) return
    startingIds.value = new Set(startingIds.value).add(instance.id)
    try {
        await run(instance.id)
        await refreshRunning()
    } catch (error) {
        handleError(error)
    } finally {
        const next = new Set(startingIds.value)
        next.delete(instance.id)
        startingIds.value = next
    }
}

async function stop(instance: GameInstance | undefined) {
    if (!instance) return
    try {
        await kill(instance.id)
        await refreshRunning()
    } catch (error) {
        handleError(error)
    }
}

async function duplicate(instance: GameInstance) {
    try {
        await install_duplicate_instance(instance)
        await refreshInstances()
    } catch (error) {
        handleError(error)
    }
}

async function copyPath(instance: GameInstance) {
    try {
        await copyToClipboard(instance.path ?? '')
    } catch (error) {
        handleError(error)
    }
}

function requestDelete(instance: GameInstance) {
    pendingDelete.value = instance
    deleteModal.value?.show()
}

async function confirmDelete() {
    const instance = pendingDelete.value
    if (!instance) return
    try {
        await remove(instance.id)
        pendingDelete.value = null
        await refreshInstances()
        addNotification({
            title: formatMessage(messages.deleteSuccessTitle),
            text: formatMessage(messages.deleteSuccessText, { name: instance.name }),
            type: 'success',
        })
    } catch (error) {
        handleError(error)
    }
}

function openVersionSettings() {
    if (!selected.value) return
    void router.push(`/instance/${encodeURIComponent(selected.value.id)}`)
}

function openInstanceSettings(instance: GameInstance) {
    void router.push(`/instance/${encodeURIComponent(instance.id)}`)
}

function openVersionPicker() {
    document.querySelector('[data-pcl-version-list]')?.scrollIntoView({ behavior: 'smooth' })
}

let pollTimer: ReturnType<typeof setInterval> | undefined

onMounted(async () => {
    if (providedAccountsCard) providedAccountsCard.value = accountsCard.value
    await refreshInstances()
    await refreshRunning()
    pollTimer = setInterval(refreshRunning, 4000)
})

onUnmounted(() => {
    if (providedAccountsCard && providedAccountsCard.value === accountsCard.value) {
        providedAccountsCard.value = null
    }
    if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
    <div class="pcl-page flex min-h-full w-full flex-col gap-3 p-4">
        <section class="pcl-card">
            <header class="pcl-card-header">
                <h2 class="pcl-card-title">{{ formatMessage(messages.account) }}</h2>
            </header>
            <div class="pcl-card-body">
                <AccountsCard ref="accountsCard" />
            </div>
        </section>

        <section class="pcl-card">
            <header class="pcl-card-header">
                <h2 class="pcl-card-title">{{ formatMessage(messages.play) }}</h2>
            </header>
            <div class="pcl-card-body flex flex-col gap-3">
                <div class="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        class="pcl-launch-button"
                        :disabled="selectedStarting"
                        @click="selectedRunning ? stop(selected) : launch(selected)"
                    >
                        <StopCircleIcon v-if="selectedRunning" class="size-5 shrink-0" />
                        <PlayIcon v-else class="size-5 shrink-0" />
                        <span class="truncate">
                            {{
                                selectedRunning
                                    ? formatMessage(messages.stop)
                                    : selectedStarting
                                      ? formatMessage(messages.starting)
                                      : formatMessage(messages.play)
                            }}
                        </span>
                    </button>
                    <div class="flex min-w-0 flex-col gap-1">
                        <span class="pcl-muted text-[11px] leading-none">
                            {{ formatMessage(messages.currentVersion) }}
                        </span>
                        <span class="truncate text-[13px] font-semibold leading-none">
                            {{ selected?.name ?? formatMessage(messages.noVersion) }}
                        </span>
                        <span v-if="selected" class="pcl-muted truncate text-[11px] leading-none">
                            {{ selected.game_version }}
                            <template v-if="selected.loader && selected.loader !== 'vanilla'">
                                · {{ selected.loader }}
                            </template>
                        </span>
                    </div>
                    <div class="ml-auto flex shrink-0 items-center gap-2">
                        <Button type="base" size="sm" @click="openVersionPicker">
                            <SettingsIcon class="size-4" />
                            {{ formatMessage(messages.versionSelect) }}
                        </Button>
                        <Button
                            type="base"
                            size="sm"
                            :disabled="!selected"
                            @click="openVersionSettings"
                        >
                            <PencilIcon class="size-4" />
                            {{ formatMessage(messages.versionSettings) }}
                        </Button>
                    </div>
                </div>
                <p v-if="instances.length > 1" class="pcl-muted m-0 text-[11px] leading-none">
                    {{ formatMessage(messages.pickHint) }}
                </p>
            </div>
        </section>

        <section class="pcl-card flex min-h-0 flex-1 flex-col" data-pcl-version-list>
            <header class="pcl-card-header flex items-center gap-2">
                <h2 class="pcl-card-title">{{ formatMessage(messages.versionList) }}</h2>
                <span class="pcl-muted text-[11px] leading-none">{{ instances.length }}</span>
                <div class="ml-auto flex shrink-0 items-center gap-1.5">
                    <Button type="quiet" size="2xs" @click="refreshInstances">
                        <RefreshCwIcon class="size-3.5" />
                        {{ formatMessage(messages.refresh) }}
                    </Button>
                    <Button type="quiet" size="2xs" @click="router.push('/library')">
                        {{ formatMessage(messages.openLibrary) }}
                    </Button>
                    <Button type="colored" color="brand" size="2xs" @click="router.push('/create')">
                        <PlusIcon class="size-3.5" />
                        {{ formatMessage(messages.createInstance) }}
                    </Button>
                </div>
            </header>
            <div class="pcl-card-body min-h-0 flex-1 overflow-y-auto p-0">
                <div v-if="loading" class="flex flex-col gap-1 p-2">
                    <div v-for="row in 4" :key="row" class="flex items-center gap-3 p-2">
                        <div class="size-9 shrink-0 animate-pulse rounded-[6px] bg-surface-3" />
                        <div class="flex flex-1 flex-col gap-1.5">
                            <div class="h-3 w-1/3 animate-pulse rounded bg-surface-3" />
                            <div class="h-2.5 w-1/5 animate-pulse rounded bg-surface-2" />
                        </div>
                    </div>
                </div>
                <div
                    v-else-if="instances.length === 0"
                    class="pcl-muted p-6 text-center text-[12px]"
                >
                    {{ formatMessage(messages.noVersions) }}
                </div>
                <ul v-else class="m-0 flex list-none flex-col p-0">
                    <li
                        v-for="instance in instances"
                        :key="instance.id"
                        class="pcl-instance-row flex min-w-0 items-center gap-3 px-3 py-2"
                        :class="{ 'is-selected': selected?.id === instance.id }"
                        @click="selectInstance(instance)"
                    >
                        <InstanceIcon
                            size="36px"
                            :icon-path="instance.icon_path"
                            :instance-id="instance.id"
                            :loader="instance.loader"
                            :alt="instance.name"
                            class="shrink-0"
                        />
                        <div class="flex min-w-0 flex-1 flex-col gap-1">
                            <div class="flex min-w-0 items-center gap-2">
                                <span class="truncate text-[13px] font-semibold leading-none">
                                    {{ instance.name }}
                                </span>
                                <span
                                    v-if="instance.loader && instance.loader !== 'vanilla'"
                                    class="pcl-badge shrink-0"
                                >
                                    {{ instance.loader }}
                                </span>
                                <span
                                    v-if="runningIds.has(instance.id)"
                                    class="pcl-badge pcl-badge-accent shrink-0"
                                >
                                    {{ formatMessage(messages.running) }}
                                </span>
                            </div>
                            <span class="pcl-muted truncate text-[11px] leading-none">
                                {{ instance.game_version }}
                                <template v-if="instance.last_played">
                                    ·
                                    {{
                                        formatMessage(messages.played, {
                                            time: relativeTime(
                                                dayjs(instance.last_played).toISOString(),
                                            ),
                                        })
                                    }}
                                </template>
                                <template v-else>
                                    · {{ formatMessage(messages.neverPlayed) }}</template
                                >
                            </span>
                        </div>
                        <div class="flex shrink-0 items-center gap-[6px]" @click.stop>
                            <button
                                type="button"
                                class="pcl-row-action pcl-row-action--danger"
                                data-pcl-row-delete
                                :title="formatMessage(messages.rowDelete)"
                                :aria-label="formatMessage(messages.rowDelete)"
                                @click="requestDelete(instance)"
                            >
                                <TrashIcon class="size-[18px]" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                class="pcl-row-action"
                                data-pcl-row-settings
                                :title="formatMessage(messages.rowSettings)"
                                :aria-label="formatMessage(messages.rowSettings)"
                                @click="openInstanceSettings(instance)"
                            >
                                <SettingsIcon class="size-[18px]" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                class="pcl-row-button"
                                :title="
                                    runningIds.has(instance.id)
                                        ? formatMessage(messages.stop)
                                        : formatMessage(messages.play)
                                "
                                @click="
                                    runningIds.has(instance.id) ? stop(instance) : launch(instance)
                                "
                            >
                                <StopCircleIcon v-if="runningIds.has(instance.id)" class="size-4" />
                                <PlayIcon v-else class="size-4" />
                            </button>
                            <OverflowMenu
                                :options="[
                                    {
                                        id: 'play',
                                        action: () =>
                                            runningIds.has(instance.id)
                                                ? stop(instance)
                                                : launch(instance),
                                    },
                                    { type: 'divider' },
                                    {
                                        id: 'edit',
                                        action: () =>
                                            router.push(
                                                `/instance/${encodeURIComponent(instance.id)}`,
                                            ),
                                    },
                                    { id: 'duplicate', action: () => duplicate(instance) },
                                    {
                                        id: 'open_folder',
                                        action: () => showInstanceInFolder(instance.id),
                                    },
                                    { id: 'copy_path', action: () => copyPath(instance) },
                                    { type: 'divider' },
                                    {
                                        id: 'delete',
                                        color: 'danger',
                                        action: () => requestDelete(instance),
                                    },
                                ]"
                            >
                                <template #play>
                                    <PlayIcon />
                                    {{ formatMessage(messages.play) }}
                                </template>
                                <template #edit>
                                    <PencilIcon />
                                    {{ formatMessage(messages.viewInstance) }}
                                </template>
                                <template #duplicate>
                                    <CopyIcon />
                                    {{ formatMessage(messages.duplicateInstance) }}
                                </template>
                                <template #open_folder>
                                    <FolderOpenIcon />
                                    {{ formatMessage(commonMessages.openFolderButton) }}
                                </template>
                                <template #copy_path>
                                    <ClipboardCopyIcon />
                                    {{ formatMessage(messages.copyPath) }}
                                </template>
                                <template #delete>
                                    <TrashIcon />
                                    {{ formatMessage(commonMessages.deleteLabel) }}
                                </template>
                            </OverflowMenu>
                        </div>
                    </li>
                </ul>
            </div>
        </section>

        <ConfirmDeleteInstanceModal
            ref="deleteModal"
            :instance-id="pendingDelete?.id"
            :symlink-target="pendingDelete?.symlink_target"
            :instances="pendingDelete ? [pendingDelete] : []"
            :warning-body="formatMessage(messages.deleteWarning)"
            :confirm-label="formatMessage(messages.deleteConfirm)"
            focus-cancel
            :delete-action="confirmDelete"
        />
    </div>
</template>
