<template>
    <div
        aria-label="遇见神鲸"
        title="遇见神鲸"
        class="flex h-full items-center justify-center gap-2 font-extrabold text-[var(--color-text-primary)]"
    >
        <img
            class="shrink-0 object-contain"
            style="width: 24px; height: 24px"
            :src="logo48"
            width="24"
            height="24"
            alt="遇见神鲸"
            draggable="false"
            data-testid="brand-logo"
        />
        <span v-if="!iconOnly" class="hidden text-sm tracking-wide xl:inline">遇见神鲸</span>
    </div>
</template>

<script setup lang="ts">
import logo48 from '@/assets/mascot/logo-48.png'

defineProps<{
    iconOnly?: boolean
}>()
</script>
