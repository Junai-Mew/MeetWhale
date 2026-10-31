<script setup lang="ts">
import { ChevronDownIcon } from '@modrinth/assets'
import type { Component } from 'vue'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export interface PclSidebarChild {
    id: string
    label: string
    to: string
    /** Extra path prefix that should also count as active (e.g. `/browse/`). */
    matchPrefix?: string
    /** Route hash that marks this child active (settings categories). */
    hash?: string
    /** `route.params.projectType` that marks this child active (browse types). */
    projectType?: string
}

export interface PclSidebarItem {
    id: string
    label: string
    to?: string
    icon?: Component
    matchPrefix?: string
    hash?: string
    children?: PclSidebarChild[]
}

export interface PclSidebarGroup {
    id: string
    title?: string
    items: PclSidebarItem[]
}

const props = defineProps<{
    groups: PclSidebarGroup[]
}>()

const route = useRoute()

// 带子项的父级默认展开，否则「社区资源」的五个子项会被折叠隐藏。
const initialExpanded = () =>
    new Set(
        props.groups.flatMap((group) =>
            group.items.filter((item) => item.children?.length).map((item) => item.id),
        ),
    )

const expanded = ref<Set<string>>(initialExpanded())

function childIsActive(child: PclSidebarChild): boolean {
    if (child.projectType && route.params.projectType === child.projectType) return true
    if (child.to === route.path) return true
    if (child.hash && route.path === child.to.split('#')[0] && route.hash === `#${child.hash}`) {
        return true
    }
    if (child.matchPrefix && route.path.startsWith(child.matchPrefix)) {
        // A child with a bare prefix (browse) stays active for project pages too.
        return true
    }
    return false
}

function itemIsActive(item: PclSidebarItem): boolean {
    if (
        item.hash &&
        route.path === (item.to ?? '').split('#')[0] &&
        route.hash === `#${item.hash}`
    ) {
        return true
    }
    if (item.to && !item.children) {
        if (route.path === item.to.split('#')[0])
            return !item.hash || route.hash === `#${item.hash}`
    }
    return (item.children ?? []).some(childIsActive)
}

// Groups containing the active child open themselves, and a manual toggle is
// remembered for the rest of the session.
const autoExpanded = computed(() => {
    const ids = new Set<string>()
    for (const group of props.groups) {
        for (const item of group.items) {
            if ((item.children ?? []).some(childIsActive)) ids.add(item.id)
        }
    }
    return ids
})

watch(
    () => route.fullPath,
    () => {
        for (const id of autoExpanded.value) expanded.value.add(id)
    },
    { immediate: true },
)

watch(
    () => props.groups,
    () => {
        const next = new Set(expanded.value)
        for (const id of initialExpanded()) next.add(id)
        expanded.value = next
    },
    { immediate: true },
)

function isExpanded(item: PclSidebarItem): boolean {
    return expanded.value.has(item.id) || autoExpanded.value.has(item.id)
}

function toggle(item: PclSidebarItem) {
    if (expanded.value.has(item.id)) {
        expanded.value.delete(item.id)
    } else {
        expanded.value.add(item.id)
    }
    // Reassign so the template reacts to the Set mutation.
    expanded.value = new Set(expanded.value)
}
</script>

<template>
    <nav class="pcl-sidebar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 py-2">
        <section v-for="group in groups" :key="group.id" class="flex min-w-0 flex-col gap-0.5">
            <h2
                v-if="group.title"
                class="pcl-sidebar-group-title m-0 px-2 pb-1 pt-2 text-[11px] font-semibold leading-none"
            >
                {{ group.title }}
            </h2>
            <template v-for="item in group.items" :key="item.id">
                <component
                    :is="item.children ? 'button' : 'router-link'"
                    v-bind="item.children ? { type: 'button' } : { to: item.to }"
                    class="pcl-sidebar-item flex w-full min-w-0 items-center gap-2 rounded-[4px] px-2 text-[13px] leading-none"
                    :class="{ 'is-active': itemIsActive(item) }"
                    :aria-expanded="item.children ? isExpanded(item) : undefined"
                    @click="item.children ? toggle(item) : undefined"
                >
                    <component
                        :is="item.icon"
                        v-if="item.icon"
                        class="size-3.5 shrink-0"
                        aria-hidden="true"
                    />
                    <span class="truncate">{{ item.label }}</span>
                    <ChevronDownIcon
                        v-if="item.children"
                        class="ml-auto size-3 shrink-0 transition-transform"
                        :class="{ 'rotate-180': isExpanded(item) }"
                        aria-hidden="true"
                    />
                </component>
                <div v-if="item.children && isExpanded(item)" class="flex flex-col gap-0.5 pl-4">
                    <router-link
                        v-for="child in item.children"
                        :key="child.id"
                        :to="child.to"
                        class="pcl-sidebar-child flex min-w-0 items-center truncate rounded-[4px] px-2 text-[12px] leading-none"
                        :class="{ 'is-active': childIsActive(child) }"
                    >
                        {{ child.label }}
                    </router-link>
                </div>
            </template>
        </section>
    </nav>
</template>
