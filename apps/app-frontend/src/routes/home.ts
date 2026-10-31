import './meta'

import type { RouteRecordRaw } from 'vue-router'

/**
 * The Modrinth-style dashboard home was replaced by the PCL 启动 page, so `/`
 * now forwards to it. The old dashboard page is intentionally no longer routed:
 * its widgets, minimal-home layout and floating edit toolbar were removed as
 * part of the PCL information-architecture change.
 */
export const homeRoutes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: '/launch',
    },
]
