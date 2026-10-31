<script setup lang="ts">
import {
    DownloadIcon,
    GridIcon,
    LeftArrowIcon,
    PlayIcon,
    RightArrowIcon,
    SettingsIcon,
} from '@modrinth/assets'
import { commonMessages, defineMessages, type MessageDescriptor, useVIntl } from '@modrinth/ui'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import McpConnectionStatus from '@/features/mcp/McpConnectionStatus.vue'

import MCLLogo from './MCLLogo.vue'

defineProps<{
    isBetaBuild?: boolean
}>()

const route = useRoute()
const router = useRouter()
const { formatMessage } = useVIntl()

const messages = defineMessages({
    betaBuild: { id: 'app.build.beta', defaultMessage: 'Beta' },
    tabLaunch: { id: 'app.pcl.tab.launch', defaultMessage: 'Launch' },
    tabDownload: { id: 'app.pcl.tab.download', defaultMessage: 'Download' },
    tabSettings: { id: 'app.pcl.tab.settings', defaultMessage: 'Settings' },
    tabMore: { id: 'app.pcl.tab.more', defaultMessage: 'More' },
    forward: { id: 'app.navigation.forward', defaultMessage: 'Forward' },
})

interface TopTab {
    id: string
    label: MessageDescriptor
    icon: Component
    to: string
    matches: (path: string) => boolean
}

const PREFIXES: Record<string, string[]> = {
    launch: ['/launch', '/instance', '/create', '/library', '/'],
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

const tabs: TopTab[] = [
    {
        id: 'launch',
        label: messages.tabLaunch,
        icon: PlayIcon,
        to: '/launch',
        matches: (path) =>
            PREFIXES.launch.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
    },
    {
        id: 'download',
        label: messages.tabDownload,
        icon: DownloadIcon,
        to: '/download/vanilla',
        matches: (path) =>
            PREFIXES.download.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
    },
    {
        id: 'settings',
        label: messages.tabSettings,
        icon: SettingsIcon,
        to: '/settings',
        matches: (path) =>
            PREFIXES.settings.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
    },
    {
        id: 'more',
        label: messages.tabMore,
        icon: GridIcon,
        to: '/skins',
        matches: (path) =>
            PREFIXES.more.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
    },
]
</script>

<template>
    <div data-tauri-drag-region class="pcl-topbar flex min-w-0 items-center">
        <div
            data-tauri-drag-region
            class="pcl-brand flex h-full shrink-0 items-center gap-2 pl-3 pr-3"
        >
            <span
                class="relative flex shrink-0 items-center justify-center"
                style="width: 24px; height: 24px"
            >
                <MCLLogo icon-only />
            </span>
            <span
                v-if="isBetaBuild"
                class="inline-flex shrink-0 rounded-[3px] bg-white/20 px-1 py-px text-[10px] font-semibold leading-none text-white"
            >
                {{ formatMessage(messages.betaBuild) }}
            </span>
        </div>
        <nav
            data-tauri-drag-region-exclude
            class="pcl-tabs flex h-full min-w-0 shrink-0 items-center gap-1"
        >
            <router-link
                v-for="tab in tabs"
                :key="tab.id"
                :to="tab.to"
                class="pcl-tab flex h-7 shrink-0 items-center gap-1.5 rounded-[4px] px-2.5 text-[13px] font-medium"
                :class="{ 'is-active': tab.matches(route.path) }"
                :data-pcl-tab="tab.id"
            >
                <component :is="tab.icon" class="size-3.5 shrink-0" aria-hidden="true" />
                <span class="truncate">{{ formatMessage(tab.label) }}</span>
            </router-link>
        </nav>
        <div data-tauri-drag-region class="min-w-0 flex-1" />
        <section class="pcl-topbar-actions ml-auto flex min-w-0 shrink-0 items-center">
            <!-- 返回/前进：PCL 顶栏没有这组按钮，但浏览器式历史导航不能丢 -->
            <div class="flex shrink-0 items-center" data-tauri-drag-region-exclude>
                <button
                    type="button"
                    class="pcl-nav-history"
                    :aria-label="formatMessage(commonMessages.backButton)"
                    :title="formatMessage(commonMessages.backButton)"
                    @click="router.back()"
                >
                    <LeftArrowIcon class="size-3.5" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    class="pcl-nav-history"
                    :aria-label="formatMessage(messages.forward)"
                    :title="formatMessage(messages.forward)"
                    @click="router.forward()"
                >
                    <RightArrowIcon class="size-3.5" aria-hidden="true" />
                </button>
            </div>
            <McpConnectionStatus />
            <slot />
        </section>
    </div>
</template>
