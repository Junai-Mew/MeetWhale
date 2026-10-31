<script setup lang="ts">
import { ExternalIcon, LanguagesIcon, ScaleIcon } from '@modrinth/assets'
import { Button, defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { getVersion } from '@tauri-apps/api/app'
import { open } from '@tauri-apps/plugin-dialog'
import { openUrl } from '@tauri-apps/plugin-opener'
import { inject, onMounted, onScopeDispose, ref } from 'vue'

import EasterEggGameModal from '@/components/ui/easteregg/EasterEggGameModal.vue'
import { MCLBrandConfig } from '@/config'
import { localizerLicenseText, type LocalizerStatus, localizerStatus } from '@/helpers/localizer'
import { get as getSettings, update as updateSettings } from '@/helpers/settings'

import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'

const { formatMessage } = useVIntl()
const { addNotification } = injectNotificationManager()
const version = ref('')
const localizerPath = ref<string | null>(null)
const localizerStatusInfo = ref<LocalizerStatus | null>(null)
const localizerLicense = ref<string | null>(null)
const localizerLicenseOpen = ref(false)
const replayOnboarding = inject<(mode: 'main' | 'instance') => Promise<void>>('replayOnboarding')

const LOCALIZER_PROJECT_URL = 'https://github.com/adssadax-1/mc-content-localizer'
const LOCALIZER_RELEASES_URL = `${LOCALIZER_PROJECT_URL}/releases`
const localizerBundledVersion = ref<string | null>(null)

const licenseUrl = `${MCLBrandConfig.repositoryUrl}/blob/main/LICENSE`
const copyingUrl = `${MCLBrandConfig.repositoryUrl}/blob/main/COPYING.md`
const thirdPartyLicensesUrl = `${MCLBrandConfig.repositoryUrl}/tree/main/third-party/licenses`

async function refreshLocalizer() {
    try {
        const status = await localizerStatus()
        localizerStatusInfo.value = status
        if (status.version) localizerBundledVersion.value = status.version
    } catch {
        // keep the row usable even if resolution fails
    }
}

onMounted(() => {
    void getVersion()
        .then((resolved) => {
            version.value = resolved
        })
        .catch(() => {
            // keep empty version string; do not fail the settings category
        })
    void getSettings()
        .then((settings) => {
            localizerPath.value = settings.localizer_path ?? null
        })
        .catch(() => {
            // keep the row usable even if the settings read fails
        })
    void refreshLocalizer()
})

async function toggleLocalizerLicense() {
    localizerLicenseOpen.value = !localizerLicenseOpen.value
    if (localizerLicenseOpen.value && !localizerLicense.value) {
        try {
            localizerLicense.value = await localizerLicenseText()
        } catch {
            localizerLicense.value = null
        }
    }
}

function localizerSourceLabel() {
    switch (localizerStatusInfo.value?.source) {
        case 'configured':
            return formatMessage(messages.localizerSourceConfigured)
        case 'bundled':
            return formatMessage(messages.localizerSourceBundled)
        case 'detected':
            return formatMessage(messages.localizerSourceDetected)
        default:
            return formatMessage(messages.localizerNotConfigured)
    }
}

async function chooseLocalizerPath() {
    const selected = await open({
        multiple: false,
        directory: false,
        title: formatMessage(messages.localizerChooseTitle),
        filters: [{ name: 'mc-content-localizer.exe', extensions: ['exe'] }],
    })
    if (!selected || Array.isArray(selected)) return
    await updateSettings({ localizer_path: selected })
    localizerPath.value = selected
    await refreshLocalizer()
    addNotification({
        title: formatMessage(messages.externalTools),
        text: formatMessage(messages.localizerSaved),
        type: 'success',
    })
}

async function clearLocalizerPath() {
    await updateSettings({ localizer_path: null })
    localizerPath.value = null
    await refreshLocalizer()
}

const gameModal = ref<InstanceType<typeof EasterEggGameModal> | null>(null)

let typedBuffer = ''
const secretCodes = ['mclaunch', 'mcsecret']

function handleEasterEggKeydown(event: KeyboardEvent) {
    typedBuffer = (typedBuffer + event.key).toLowerCase()
    const maxCodeLen = Math.max(...secretCodes.map((c) => c.length))
    if (typedBuffer.length > maxCodeLen) {
        typedBuffer = typedBuffer.slice(-maxCodeLen)
    }
    if (secretCodes.some((code) => typedBuffer.endsWith(code))) {
        typedBuffer = ''
        gameModal.value?.show()
    }
}

document.addEventListener('keydown', handleEasterEggKeydown)
onScopeDispose(() => document.removeEventListener('keydown', handleEasterEggKeydown))

const messages = defineMessages({
    productTitle: {
        id: 'app.settings.about.product-title',
        defaultMessage: 'About {productName}',
    },
    version: {
        id: 'app.settings.about.version',
        defaultMessage: 'Version {version}',
    },
    replayOnboarding: {
        id: 'app.settings.about.replay-onboarding',
        defaultMessage: 'Replay tour',
    },
    licenseAttribution: {
        id: 'app.settings.about.license-attribution',
        defaultMessage: 'License & attribution',
    },
    attribution: {
        id: 'app.settings.about.attribution',
        defaultMessage: 'MeetWhale is a modified version of the open-source Modrinth codebase.',
    },
    notAffiliated: {
        id: 'app.settings.about.not-affiliated',
        defaultMessage:
            'Modrinth is a trademark of Rinth, Inc. MeetWhale is not affiliated with or endorsed by Rinth, Inc.',
    },
    originalSource: {
        id: 'app.settings.about.original-source',
        defaultMessage: 'Original Modrinth source',
    },
    projectLicense: {
        id: 'app.settings.about.project-license',
        defaultMessage: 'Project license (GPL-3.0)',
    },
    copyingGuidelines: {
        id: 'app.settings.about.copying-guidelines',
        defaultMessage: 'Copying guidelines',
    },
    thirdPartyLicenses: {
        id: 'app.settings.about.third-party-licenses',
        defaultMessage: 'Third-party licenses',
    },
    externalTools: {
        id: 'app.settings.about.external-tools',
        defaultMessage: 'External tools',
    },
    localizerTitle: {
        id: 'app.settings.about.localizer.title',
        defaultMessage: 'Mod localization',
    },
    localizerDescription: {
        id: 'app.settings.about.localizer.description',
        defaultMessage:
            'Opens the external "MC Content Localizer" workshop; download it separately, the launcher only starts it.',
    },
    localizerPath: {
        id: 'app.settings.about.localizer.path',
        defaultMessage: 'Tool path',
    },
    localizerNotConfigured: {
        id: 'app.settings.about.localizer.not-configured',
        defaultMessage: 'Not configured',
    },
    localizerChoose: {
        id: 'app.settings.about.localizer.choose',
        defaultMessage: 'Choose',
    },
    localizerClear: {
        id: 'app.settings.about.localizer.clear',
        defaultMessage: 'Clear',
    },
    localizerChooseTitle: {
        id: 'app.settings.about.localizer.choose-title',
        defaultMessage: 'Select mc-content-localizer.exe',
    },
    localizerProjectPage: {
        id: 'app.settings.about.oss.project-page',
        defaultMessage: 'Project page',
    },
    localizerReleasePage: {
        id: 'app.settings.about.oss.release-page',
        defaultMessage: 'Releases',
    },
    localizerSaved: {
        id: 'app.settings.about.localizer.saved',
        defaultMessage: 'Tool path saved',
    },
    localizerSourceConfigured: {
        id: 'app.settings.about.localizer.source.configured',
        defaultMessage: 'Manual path',
    },
    localizerSourceBundled: {
        id: 'app.settings.about.localizer.source.bundled',
        defaultMessage: 'Bundled version',
    },
    localizerSourceDetected: {
        id: 'app.settings.about.localizer.source.detected',
        defaultMessage: 'System install',
    },
    ossComponents: {
        id: 'app.settings.about.oss.title',
        defaultMessage: 'Open-source components',
    },
    ossComponentsDescription: {
        id: 'app.settings.about.oss.description',
        defaultMessage:
            'Third-party components redistributed with the launcher, with their licenses and upstream sources.',
    },
    localizerComponentName: {
        id: 'app.settings.about.oss.localizer.name',
        defaultMessage: 'MC Content Localizer (MC 汉化工坊)',
    },
    localizerComponentDescription: {
        id: 'app.settings.about.oss.localizer.description',
        defaultMessage:
            'External mod localization tool bundled as an unmodified official release. Runs as a separate process and is only started by the launcher.',
    },
    localizerComponentAuthor: {
        id: 'app.settings.about.oss.localizer.author',
        defaultMessage: 'Author: Mod Translator contributors (adssadax-1)',
    },
    localizerComponentVersion: {
        id: 'app.settings.about.oss.localizer.version',
        defaultMessage: 'Bundled version: {version}',
    },
    localizerComponentLicense: {
        id: 'app.settings.about.oss.localizer.license',
        defaultMessage: 'MIT License',
    },
    showLicense: {
        id: 'app.settings.about.oss.show-license',
        defaultMessage: 'Show license text',
    },
    hideLicense: {
        id: 'app.settings.about.oss.hide-license',
        defaultMessage: 'Hide license text',
    },
    licenseUnavailable: {
        id: 'app.settings.about.oss.license-unavailable',
        defaultMessage: 'The bundled license file could not be read.',
    },
})
</script>

<template>
    <div class="about-page flex flex-col gap-6">
        <!-- The hero carries the 3D experience host and has no heading, so it
                            stays its own panel rather than a `SettingsSection` (which would
                            render no anchor without a title). -->
        <section id="settings-target-about-product" tabindex="-1" class="about-panel">
            <div class="flex items-center gap-4">
                <img
                    class="brand-logo size-20 shrink-0 rounded-2xl object-contain"
                    src="@/assets/mcl.png"
                    alt=""
                />
                <div class="min-w-0">
                    <h2 class="m-0 text-xl font-semibold text-[var(--color-text-primary)]">
                        {{
                            formatMessage(messages.productTitle, {
                                productName: MCLBrandConfig.productName,
                            })
                        }}
                    </h2>
                    <p class="m-0 mt-0.5 text-sm text-[var(--color-text-tertiary)]">
                        {{ formatMessage(messages.version, { version }) }}
                    </p>
                </div>
            </div>
        </section>

        <SettingsSection>
            <template #header>
                <h3
                    class="m-0 flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]"
                >
                    <ScaleIcon class="size-5 text-[var(--color-text-tertiary)]" />
                    {{ formatMessage(messages.licenseAttribution) }}
                </h3>
            </template>
            <div class="flex flex-col gap-3 p-4">
                <p class="m-0 text-[var(--color-text-default)]">
                    {{ formatMessage(messages.attribution) }}
                </p>
                <p class="m-0 mt-2 text-sm text-[var(--color-text-tertiary)]">
                    {{ formatMessage(messages.notAffiliated) }}
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                    <a
                        :href="licenseUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 rounded-lg bg-surface-4 px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-surface-5"
                    >
                        {{ formatMessage(messages.projectLicense) }}
                        <ExternalIcon class="size-4 text-[var(--color-text-tertiary)]" />
                    </a>
                    <a
                        :href="copyingUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 rounded-lg bg-surface-4 px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-surface-5"
                    >
                        {{ formatMessage(messages.copyingGuidelines) }}
                        <ExternalIcon class="size-4 text-[var(--color-text-tertiary)]" />
                    </a>
                    <a
                        :href="thirdPartyLicensesUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 rounded-lg bg-surface-4 px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-surface-5"
                    >
                        {{ formatMessage(messages.thirdPartyLicenses) }}
                        <ExternalIcon class="size-4 text-[var(--color-text-tertiary)]" />
                    </a>
                    <a
                        href="https://github.com/modrinth/code"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 rounded-lg bg-surface-4 px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-surface-5"
                    >
                        {{ formatMessage(messages.originalSource) }}
                        <ExternalIcon class="size-4 text-[var(--color-text-tertiary)]" />
                    </a>
                </div>
            </div>
        </SettingsSection>

        <SettingsSection>
            <template #header>
                <h3
                    class="m-0 flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]"
                >
                    <LanguagesIcon class="size-5 text-[var(--color-text-tertiary)]" />
                    {{ formatMessage(messages.externalTools) }}
                </h3>
                <p class="m-0 mt-1 text-sm leading-relaxed text-[var(--color-text-tertiary)]">
                    {{ formatMessage(messages.localizerDescription) }}
                </p>
            </template>
            <SettingsRow>
                <template #label>{{ formatMessage(messages.localizerTitle) }}</template>
                <template #description>
                    <span class="break-all">
                        {{
                            localizerPath ??
                            localizerStatusInfo?.path ??
                            formatMessage(messages.localizerNotConfigured)
                        }}
                    </span>
                    <span
                        v-if="localizerStatusInfo?.path"
                        class="mt-0.5 block text-xs text-[var(--color-text-tertiary)]"
                    >
                        {{ localizerSourceLabel() }}
                        <template v-if="localizerBundledVersion">
                            · v{{ localizerBundledVersion }}
                        </template>
                    </span>
                </template>
                <template #control>
                    <div class="flex shrink-0 flex-wrap justify-end gap-2">
                        <Button type="base" size="sm" @click="chooseLocalizerPath">
                            {{ formatMessage(messages.localizerChoose) }}
                        </Button>
                        <Button
                            type="base"
                            size="sm"
                            :disabled="!localizerPath"
                            @click="clearLocalizerPath"
                        >
                            {{ formatMessage(messages.localizerClear) }}
                        </Button>
                    </div>
                </template>
            </SettingsRow>
        </SettingsSection>

        <SettingsSection>
            <template #header>
                <h3
                    class="m-0 flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]"
                >
                    <ScaleIcon class="size-5 text-[var(--color-text-tertiary)]" />
                    {{ formatMessage(messages.ossComponents) }}
                </h3>
                <p class="m-0 mt-1 text-sm leading-relaxed text-[var(--color-text-tertiary)]">
                    {{ formatMessage(messages.ossComponentsDescription) }}
                </p>
            </template>
            <div class="flex flex-col gap-3 p-4">
                <div class="rounded-lg border border-surface-4 bg-surface-2 p-4">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                        <div class="min-w-0">
                            <h4 class="m-0 text-sm font-semibold text-[var(--color-text-primary)]">
                                {{ formatMessage(messages.localizerComponentName) }}
                            </h4>
                            <p class="m-0 mt-1 text-xs text-[var(--color-text-tertiary)]">
                                {{ formatMessage(messages.localizerComponentAuthor) }}
                            </p>
                            <p class="m-0 mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                                {{
                                    formatMessage(messages.localizerComponentVersion, {
                                        version: `v${localizerBundledVersion ?? '4.0.1'}`,
                                    })
                                }}
                                · {{ formatMessage(messages.localizerComponentLicense) }}
                            </p>
                        </div>
                        <div class="flex shrink-0 flex-wrap gap-2">
                            <Button type="base" size="sm" @click="openUrl(LOCALIZER_PROJECT_URL)">
                                {{ formatMessage(messages.localizerProjectPage) }}
                                <ExternalIcon class="ml-1 size-3.5" />
                            </Button>
                            <Button type="base" size="sm" @click="openUrl(LOCALIZER_RELEASES_URL)">
                                {{ formatMessage(messages.localizerReleasePage) }}
                                <ExternalIcon class="ml-1 size-3.5" />
                            </Button>
                        </div>
                    </div>
                    <p class="m-0 mt-2 text-xs leading-relaxed text-[var(--color-text-tertiary)]">
                        {{ formatMessage(messages.localizerComponentDescription) }}
                    </p>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            class="inline-flex items-center gap-1 rounded-md border border-surface-4 bg-surface-3 px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-surface-4"
                            :aria-expanded="localizerLicenseOpen"
                            @click="toggleLocalizerLicense"
                        >
                            {{
                                localizerLicenseOpen
                                    ? formatMessage(messages.hideLicense)
                                    : formatMessage(messages.showLicense)
                            }}
                        </button>
                    </div>
                    <pre
                        v-if="localizerLicenseOpen"
                        class="m-0 mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface-3 p-3 text-xs leading-relaxed text-[var(--color-text-secondary)]"
                        >{{ localizerLicense ?? formatMessage(messages.licenseUnavailable) }}</pre>
                </div>
            </div>
        </SettingsSection>

        <div id="settings-target-about-replay-tour" tabindex="-1" class="flex flex-wrap gap-2">
            <Button type="base" @click="replayOnboarding?.('main')">
                {{ formatMessage(messages.replayOnboarding) }}
            </Button>
        </div>
    </div>

    <EasterEggGameModal ref="gameModal" />
</template>

<style scoped>
.about-settings-details {
    border-top: 1px solid
        var(--settings-divider, color-mix(in srgb, var(--surface-4) 55%, transparent));
}

.about-panel {
    padding: 1.25rem;
    border: 1px solid var(--surface-4);
    border-radius: var(--radius-md);
    background: var(--surface-3);
}
</style>
