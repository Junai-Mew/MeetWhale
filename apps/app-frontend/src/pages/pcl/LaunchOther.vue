<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'
import { defineAsyncComponent } from 'vue'

const JavaSettings = defineAsyncComponent(() => import('@/components/ui/settings/JavaSettings.vue'))
const DefaultInstanceSettings = defineAsyncComponent(
    () => import('@/components/ui/settings/DefaultInstanceSettings.vue'),
)

const { formatMessage } = useVIntl()

const messages = defineMessages({
    title: { id: 'app.pcl.other.title', defaultMessage: 'Other launch settings' },
    description: {
        id: 'app.pcl.other.description',
        defaultMessage:
            'Memory, Java runtime, game window and the defaults every new instance starts with.',
    },
    java: { id: 'app.pcl.other.java', defaultMessage: 'Java & memory' },
    defaults: { id: 'app.pcl.other.defaults', defaultMessage: 'Launch defaults' },
})
</script>

<template>
    <div class="pcl-page flex min-h-full w-full flex-col gap-3 p-4">
        <section class="pcl-card">
            <header class="pcl-card-header">
                <div class="flex min-w-0 flex-col gap-0.5">
                    <h2 class="pcl-card-title">{{ formatMessage(messages.title) }}</h2>
                    <p class="pcl-muted m-0 text-[11px] leading-none">
                        {{ formatMessage(messages.description) }}
                    </p>
                </div>
            </header>
        </section>

        <section class="pcl-card">
            <header class="pcl-card-header">
                <h2 class="pcl-card-title">{{ formatMessage(messages.java) }}</h2>
            </header>
            <div class="pcl-card-body">
                <Suspense>
                    <JavaSettings />
                    <template #fallback>
                        <div class="flex flex-col gap-2 p-2">
                            <div class="h-4 w-1/3 animate-pulse rounded bg-surface-3" />
                            <div class="h-3 w-1/2 animate-pulse rounded bg-surface-2" />
                        </div>
                    </template>
                </Suspense>
            </div>
        </section>

        <section class="pcl-card">
            <header class="pcl-card-header">
                <h2 class="pcl-card-title">{{ formatMessage(messages.defaults) }}</h2>
            </header>
            <div class="pcl-card-body">
                <Suspense>
                    <DefaultInstanceSettings />
                    <template #fallback>
                        <div class="flex flex-col gap-2 p-2">
                            <div class="h-4 w-1/3 animate-pulse rounded bg-surface-3" />
                            <div class="h-3 w-1/2 animate-pulse rounded bg-surface-2" />
                        </div>
                    </template>
                </Suspense>
            </div>
        </section>
    </div>
</template>
