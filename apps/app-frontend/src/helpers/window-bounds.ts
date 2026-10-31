import {
    availableMonitors,
    getCurrentWindow,
    PhysicalPosition,
    PhysicalSize,
} from '@tauri-apps/api/window'
import { saveWindowState, StateFlags } from '@tauri-apps/plugin-window-state'

/** 恢复默认值的窗口尺寸（逻辑像素）。 */
const DEFAULT_WIDTH = 1280
const DEFAULT_HEIGHT = 800
/** 小于这个尺寸的恢复值视为脏数据。 */
const MIN_WIDTH = 400
const MIN_HEIGHT = 300
/** 坐标/尺寸超过这个值视为脏数据（例如 -21333 这种离屏坐标）。 */
const MAX_ABS_COORDINATE = 10000

interface Geometry {
    x: number
    y: number
    width: number
    height: number
}

interface Area {
    x: number
    y: number
    width: number
    height: number
}

function isSaneSize(width: number, height: number): boolean {
    return (
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width >= MIN_WIDTH &&
        height >= MIN_HEIGHT &&
        width <= MAX_ABS_COORDINATE &&
        height <= MAX_ABS_COORDINATE
    )
}

function isSanePosition(x: number, y: number): boolean {
    return (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Math.abs(x) <= MAX_ABS_COORDINATE &&
        Math.abs(y) <= MAX_ABS_COORDINATE
    )
}

function intersects(rect: Geometry, area: Area): boolean {
    const overlapX = Math.max(
        0,
        Math.min(rect.x + rect.width, area.x + area.width) - Math.max(rect.x, area.x),
    )
    const overlapY = Math.max(
        0,
        Math.min(rect.y + rect.height, area.y + area.height) - Math.max(rect.y, area.y),
    )
    // 至少有约 64x64 的可见区域才算落在某个显示器上。
    return overlapX >= 64 && overlapY >= 64
}

async function monitorAreas(): Promise<Area[]> {
    const monitors = await availableMonitors().catch(() => [])
    return monitors.map((monitor) => {
        const area = monitor.workArea ?? monitor
        return {
            x: area.position.x,
            y: area.position.y,
            width: area.size.width,
            height: area.size.height,
        }
    })
}

/**
 * 把恢复出来的窗口尺寸/位置校正到可用状态。
 *
 * 窗口状态由 `tauri-plugin-window-state` 在 Rust 侧恢复。脏数据（比如
 * `-21333,-21333` / `158x26`）会让窗口完全跑到屏幕外，表现为「启动后看不到窗口」。
 * 这里在窗口畸形时直接重置为默认尺寸并居中到主显示器，正常值只做边界夹取。
 */
export async function clampWindowToMonitor(): Promise<void> {
    const window = getCurrentWindow()

    try {
        if (await window.isMaximized()) return
    } catch {
        return
    }

    const areas = await monitorAreas()
    if (!areas.length) return

    const [position, size] = await Promise.all([window.outerPosition(), window.outerSize()])
    const rect: Geometry = {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
    }

    const sane =
        isSaneSize(rect.width, rect.height) &&
        isSanePosition(rect.x, rect.y) &&
        areas.some((area) => intersects(rect, area))

    if (!sane) {
        const primary = areas[0]
        const width = Math.min(DEFAULT_WIDTH, primary.width)
        const height = Math.min(DEFAULT_HEIGHT, primary.height)
        const x = Math.round(primary.x + Math.max(0, (primary.width - width) / 2))
        const y = Math.round(primary.y + Math.max(0, (primary.height - height) / 2))
        await window.setSize(new PhysicalSize(width, height)).catch(() => undefined)
        await window.setPosition(new PhysicalPosition(x, y)).catch(() => undefined)
        return
    }

    const monitor = areas.find((area) => intersects(rect, area)) ?? areas[0]
    const width = Math.min(rect.width, monitor.width)
    const height = Math.min(rect.height, monitor.height)
    const x = Math.min(Math.max(rect.x, monitor.x), monitor.x + monitor.width - width)
    const y = Math.min(Math.max(rect.y, monitor.y), monitor.y + monitor.height - height)

    const changed = width !== rect.width || height !== rect.height || x !== rect.x || y !== rect.y
    if (!changed) return

    await window.setSize(new PhysicalSize(width, height)).catch(() => undefined)
    await window.setPosition(new PhysicalPosition(x, y)).catch(() => undefined)
}

/**
 * 保存窗口状态前的校验：最小化时的坐标不可信，畸形尺寸/坐标也不落盘。
 */
export async function saveWindowStateSafely(): Promise<void> {
    const window = getCurrentWindow()

    try {
        if (await window.isMinimized()) return
    } catch {
        return
    }

    const [position, size] = await Promise.all([window.outerPosition(), window.outerSize()])
    if (!isSaneSize(size.width, size.height) || !isSanePosition(position.x, position.y)) return

    await saveWindowState(StateFlags.ALL)
}
