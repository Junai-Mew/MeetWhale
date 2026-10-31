<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'
import { getVersion } from '@tauri-apps/api/app'
import { onMounted, onUnmounted, ref } from 'vue'

import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { MCLBrandConfig } from '@/config'
import { get_all as getRunningProcesses } from '@/helpers/process'

const { formatMessage } = useVIntl()
const { offline } = useNetworkStatus()

const messages = defineMessages({
    ready: {
        id: 'app.statusbar.ready',
        defaultMessage: 'Ready',
    },
    offline: {
        id: 'app.statusbar.offline',
        defaultMessage: 'Offline mode',
    },
    running: {
        id: 'app.statusbar.running',
        defaultMessage: '{count, plural, one {# instance running} other {# instances running}}',
    },
    website: {
        id: 'app.statusbar.website',
        defaultMessage: 'Website',
    },
    feedback: {
        id: 'app.statusbar.feedback',
        defaultMessage: 'Feedback',
    },
})

const version = ref('')
const runningCount = ref(0)

let refreshTimer: ReturnType<typeof setInterval> | undefined

async function refreshRunningCount() {
    try {
        const processes = (await getRunningProcesses()) as string[]
        runningCount.value = processes.length
    } catch {
        // 无进程插件（例如浏览器内预览）时保持上一次的计数。
    }
}

onMounted(async () => {
    version.value = await getVersion().catch(() => '')
    await refreshRunningCount()
    refreshTimer = setInterval(refreshRunningCount, 5000)
})

onUnmounted(() => {
    if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
    <div class="pcl-statusbar flex min-w-0 items-center gap-2">
        <span class="shrink-0 font-medium text-[var(--color-text-default)]">
            {{ MCLBrandConfig.shortProductName }}
        </span>
        <span v-if="version" class="shrink-0 tabular-nums">{{ version }}</span>
        <span class="h-3 w-px shrink-0 bg-surface-5" aria-hidden="true" />
        <span class="shrink-0" :class="offline ? 'text-orange' : ''">
            {{ formatMessage(offline ? messages.offline : messages.ready) }}
        </span>
        <span v-if="runningCount > 0" class="flex shrink-0 items-center gap-1">
            <span class="size-1.5 rounded-full bg-green" aria-hidden="true" />
            {{ formatMessage(messages.running, { count: runningCount }) }}
        </span>
    </div>
</template>
