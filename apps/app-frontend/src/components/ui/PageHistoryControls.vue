<script setup lang="ts">
import { LeftArrowIcon, RightArrowIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { formatMessage } = useVIntl()

const messages = defineMessages({
    back: { id: 'app.pcl.history.back', defaultMessage: 'Back' },
    forward: { id: 'app.pcl.history.forward', defaultMessage: 'Forward' },
})

/**
 * Vue Router records the neighbouring entries of the current history entry in
 * its state (`back` / `forward`), so the buttons can expose the exact same
 * browser history the title bar uses without keeping a second stack.
 */
const historyBack = ref<string | null>(null)
const historyForward = ref<string | null>(null)

const canGoBack = computed(() => historyBack.value !== null)
const canGoForward = computed(() => historyForward.value !== null)

function syncHistoryState() {
    const state = router.options.history.state
    historyBack.value = state.back ?? null
    historyForward.value = state.forward ?? null
}

function goBack() {
    if (!canGoBack.value) return
    router.back()
}

function goForward() {
    if (!canGoForward.value) return
    router.forward()
}

let stopAfterEach: (() => void) | undefined

onMounted(() => {
    syncHistoryState()
    stopAfterEach = router.afterEach(syncHistoryState)
})

onUnmounted(() => stopAfterEach?.())
</script>

<template>
    <div class="pcl-page-history" data-pcl-page-history>
        <button
            type="button"
            class="pcl-page-history__button"
            data-pcl-history-back
            :disabled="!canGoBack"
            :aria-disabled="canGoBack ? undefined : 'true'"
            :title="formatMessage(messages.back)"
            :aria-label="formatMessage(messages.back)"
            @click="goBack"
        >
            <LeftArrowIcon class="pcl-page-history__icon" aria-hidden="true" />
        </button>
        <button
            type="button"
            class="pcl-page-history__button"
            data-pcl-history-forward
            :disabled="!canGoForward"
            :aria-disabled="canGoForward ? undefined : 'true'"
            :title="formatMessage(messages.forward)"
            :aria-label="formatMessage(messages.forward)"
            @click="goForward"
        >
            <RightArrowIcon class="pcl-page-history__icon" aria-hidden="true" />
        </button>
    </div>
</template>
