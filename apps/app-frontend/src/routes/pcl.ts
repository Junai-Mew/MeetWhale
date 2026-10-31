import './meta'

import type { RouteRecordRaw } from 'vue-router'

/**
 * PCL-style information architecture.
 *
 * The launcher is organised like Plain Craft Launcher: a top-level tab bar
 * (launch / download / settings / more) with a contextual secondary sidebar.
 * The existing feature pages are reused as-is — only their entry points move.
 * Legacy URLs (`/browse`, `/skins`, `/multiplayer`, `/screenshots`, `/lab`,
 * `/settings`, `/library`, `/instance`, `/project`, …) keep working so deep
 * links, keyboard shortcuts and the browser history stay valid.
 */
export const pclRoutes: RouteRecordRaw[] = [
    {
        path: '/launch',
        name: 'Launch',
        component: () => import('@/pages/pcl/Launch.vue'),
        meta: {
            breadcrumb: [{ name: 'Launch' }],
            discordActivity: 'Idling...',
            pageTransitionGroup: 'launch',
        },
    },
    {
        path: '/launch/personalize',
        name: 'LaunchPersonalize',
        component: () => import('@/pages/pcl/LaunchPersonalize.vue'),
        meta: {
            breadcrumb: [{ name: 'Launch' }, { name: 'Personalization' }],
            discordActivity: 'Idling...',
            pageTransitionGroup: 'launch',
        },
    },
    {
        path: '/launch/other',
        name: 'LaunchOther',
        component: () => import('@/pages/pcl/LaunchOther.vue'),
        meta: {
            breadcrumb: [{ name: 'Launch' }, { name: 'Other' }],
            discordActivity: 'Idling...',
            pageTransitionGroup: 'launch',
        },
    },
    {
        path: '/download',
        redirect: '/download/vanilla',
    },
    {
        path: '/download/vanilla',
        name: 'DownloadVanilla',
        component: () => import('@/pages/pcl/DownloadVanilla.vue'),
        meta: {
            breadcrumb: [{ name: 'Download' }, { name: 'Vanilla game' }],
            discordActivity: 'Browsing versions...',
            pageTransitionGroup: 'download',
        },
    },
    {
        path: '/more',
        redirect: '/skins',
    },
    {
        path: '/more/skins',
        redirect: '/skins',
    },
    {
        path: '/more/help',
        name: 'MoreHelp',
        component: () => import('@/pages/pcl/MoreAbout.vue'),
        meta: {
            breadcrumb: [{ name: 'More' }, { name: 'Help & about' }],
            pageTransitionGroup: 'more',
        },
    },
    {
        path: '/more/logs',
        name: 'MoreLogs',
        component: () => import('@/pages/pcl/MoreLogs.vue'),
        meta: {
            breadcrumb: [{ name: 'More' }, { name: 'Logs' }],
            pageTransitionGroup: 'more',
        },
    },
]
