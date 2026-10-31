<template>
    <RouterLink
        v-if="typeof to === 'string' && !disabled"
        :to="to"
        v-bind="$attrs"
        active-class="nav-router-active"
        :class="activeClasses"
        class="nav-item relative flex h-9 w-full shrink-0 items-center gap-2.5 rounded-md bg-transparent px-2.5 text-[var(--color-text-default)] transition-colors hover:bg-surface-4 hover:text-[var(--color-text-primary)]"
    >
        <span class="nav-item-icon flex shrink-0 items-center justify-center text-xl">
            <slot />
        </span>
        <span v-if="label" class="nav-item-label truncate text-[13px] leading-none">
            {{ label }}
        </span>
    </RouterLink>
    <button
        v-else-if="typeof to === 'string'"
        v-bind="$attrs"
        type="button"
        aria-disabled="true"
        tabindex="-1"
        :class="activeClasses"
        class="nav-item relative flex h-9 w-full shrink-0 items-center gap-2.5 rounded-md bg-transparent px-2.5 text-[var(--color-text-default)] transition-colors hover:bg-surface-4 hover:text-[var(--color-text-primary)]"
        @click.prevent
        @keydown.enter.prevent
        @keyup.enter.prevent
        @keydown.space.prevent
        @keyup.space.prevent
    >
        <span class="nav-item-icon flex shrink-0 items-center justify-center text-xl">
            <slot />
        </span>
        <span v-if="label" class="nav-item-label truncate text-[13px] leading-none">
            {{ label }}
        </span>
    </button>
    <button
        v-else
        v-bind="$attrs"
        class="nav-item button-animation relative flex h-9 w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-md border-none bg-transparent px-2.5 text-[var(--color-text-default)] transition-colors hover:bg-surface-4 hover:text-[var(--color-text-primary)]"
        :disabled="disabled"
        @click="to"
    >
        <span class="nav-item-icon flex shrink-0 items-center justify-center text-xl">
            <slot />
        </span>
        <span v-if="label" class="nav-item-label truncate text-[13px] leading-none">
            {{ label }}
        </span>
    </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { RouterLink, useLink, useRoute } from 'vue-router'

const route = useRoute()

type RouteFunction = (route: RouteLocationNormalizedLoaded) => boolean

const props = withDefaults(
    defineProps<{
        to: (() => void) | string
        /** 导航项文字。PCL2 外壳是「图标 + 文字」的竖向导航。 */
        label?: string
        isPrimary?: RouteFunction
        isSubpage?: RouteFunction
        highlightOverride?: boolean
        disabled?: boolean
    }>(),
    {
        label: undefined,
        disabled: false,
        isPrimary: undefined,
        isSubpage: undefined,
    },
)

const link = useLink({ to: computed(() => (typeof props.to === 'string' ? props.to : '/')) })
const activeClasses = computed(() => {
    const primary = props.isPrimary ? props.isPrimary(route) : link.isActive.value
    return {
        'router-link-active': primary,
        'subpage-active': !primary && !!props.isSubpage?.(route),
    }
})

defineOptions({
    inheritAttrs: false,
})
</script>

<style lang="scss" scoped>
.nav-item-icon :deep(svg) {
    width: 1.125rem;
    height: 1.125rem;
}

.router-link-active {
    @apply text-[--color-button-text-selected] bg-[--color-button-bg-selected];
}

.subpage-active {
    @apply text-[var(--color-text-primary)] bg-surface-4;
}

.router-link-active,
.subpage-active {
    font-weight: 600;
}
</style>
