/**
 * 前端启动兜底。
 *
 * 启动器窗口是 `decorations: false` + 透明窗口：一旦前端在 mount 之前抛错，
 * `#app` 就是空的，没有 body 背景 → 整窗完全透明，看起来像「应用没启动」。
 *
 * 因此兜底层**只在应用还没挂载成功**时展示（`#app` 仍无子节点），并且：
 * - 忽略浏览器的良性布局警告（ResizeObserver 循环等），它们不算致命错误；
 * - 应用已正常运行后的运行时错误只写入控制台，不遮挡界面；
 * - 即使展示，也支持 Esc / 点击关闭，并在 15 秒后自动消失。
 */
const MAX_LOGGED = 3
const OVERLAY_AUTO_CLOSE_MS = 15000

/** 浏览器自身发出的、与业务无关的良性警告。 */
const BENIGN_PATTERNS = [
    /resizeobserver loop (completed with undelivered notifications|limit exceeded)/i,
    /^script error\.?$/i,
    /ignoring unsupported entrytypes?/i,
    /non-error promise rejection/i,
]

function isBenign(message: string): boolean {
    const text = message.trim()
    return BENIGN_PATTERNS.some((pattern) => pattern.test(text))
}

function isAppMounted(): boolean {
    if (typeof document === 'undefined') return false
    const app = document.getElementById('app')
    return !!app && app.children.length > 0
}

let logged = 0
let autoCloseTimer: ReturnType<typeof setTimeout> | undefined

function closeOverlay(): void {
    if (autoCloseTimer) clearTimeout(autoCloseTimer)
    autoCloseTimer = undefined
    document.getElementById('boot-failure')?.remove()
}

function renderFailure(text: string): void {
    if (typeof document === 'undefined' || !document.body) return
    try {
        let box = document.getElementById('boot-failure')
        if (!box) {
            box = document.createElement('div')
            box.id = 'boot-failure'
            Object.assign(box.style, {
                position: 'fixed',
                inset: '0',
                zIndex: '2147483647',
                overflow: 'auto',
                padding: '16px 20px',
                background: '#f4f4f5',
                color: '#7a1f1f',
                font: '12px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace',
                whiteSpace: 'pre-wrap',
                cursor: 'pointer',
                pointerEvents: 'auto',
            })
            box.title = 'Close (Esc)'
            // 点击 / Esc 都能关掉，绝不让兜底层长期挡住界面。
            box.addEventListener('click', closeOverlay)
            document.addEventListener(
                'keydown',
                (event) => {
                    if (event.key === 'Escape') closeOverlay()
                },
                { once: false },
            )
            document.body.appendChild(box)
            if (autoCloseTimer) clearTimeout(autoCloseTimer)
            autoCloseTimer = setTimeout(closeOverlay, OVERLAY_AUTO_CLOSE_MS)
        }
        box.textContent += `${box.textContent ? '\n\n' : ''}${text}`
    } catch {
        // 渲染兜底本身失败时保持安静，避免影响正常流程。
    }
}

function report(text: string): void {
    if (isBenign(text)) return

    if (isAppMounted()) {
        // 应用已经正常渲染：只记录，不遮挡任何交互。
        if (logged < MAX_LOGGED) {
            logged += 1
            console.warn('[mount-guard] runtime error (not shown as overlay):', text)
        }
        return
    }

    renderFailure(text)
}

export function installMountGuard(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('error', (event) => {
        const error = event.error as Error | undefined
        report(
            `[error] ${event.message || error?.message || 'unknown error'}\n${error?.stack ?? ''}`,
        )
    })

    window.addEventListener('unhandledrejection', (event) => {
        const reason = (event as PromiseRejectionEvent).reason as
            { stack?: string; message?: string } | undefined
        report(`[unhandled rejection] ${reason?.message ?? String(reason)}\n${reason?.stack ?? ''}`)
    })

    window.setTimeout(() => {
        if (isAppMounted()) return
        renderFailure(
            '[boot] The interface did not mount within 8 seconds. Press Esc or click to dismiss. Check the WebView console for the underlying error.',
        )
    }, 8000)
}
