let toastArea = null
let notificationPaused = false
let flushTimer = null
let lastMessageKey = ""
let lastMessageAt = 0
const queue = []
const MAX_VISIBLE_TOASTS = 2
const DEDUPE_MS = 4500

const typeMeta = {
    success: { icon: "✓", label: "完了" },
    error: { icon: "!", label: "エラー" },
    warning: { icon: "!", label: "確認" },
    info: { icon: "i", label: "通知" }
}

function createToastArea() {
    if (toastArea) return toastArea

    toastArea = document.createElement("div")
    toastArea.id = "toastArea"
    toastArea.setAttribute("aria-live", "polite")
    toastArea.setAttribute("aria-atomic", "false")

    document.body.appendChild(toastArea)

    return toastArea
}

function isTransitionActive() {
    return Boolean(
        notificationPaused ||
        document.body.classList.contains("kt-booting") ||
        document.body.classList.contains("kt-transitioning") ||
        document.body.classList.contains("kt-real-main-start") ||
        document.body.classList.contains("kt-screen-switching") ||
        document.body.classList.contains("kings-c-transitioning") ||
        document.body.classList.contains("auto-auth-checking")
    )
}

function shouldDedupe(message, type) {
    const now = Date.now()
    const key = `${type}:${String(message || "")}`

    if (key === lastMessageKey && now - lastMessageAt < DEDUPE_MS) {
        return true
    }

    lastMessageKey = key
    lastMessageAt = now
    return false
}

function normalizeMessage(message) {
    return String(message || "").trim() || "通知があります"
}

export function pauseNotifications() {
    notificationPaused = true
}

export function resumeNotifications(delay = 180) {
    notificationPaused = false
    window.clearTimeout(flushTimer)
    flushTimer = window.setTimeout(flushNotifications, delay)
}

export function showToast(message, type = "info", options = {}) {
    const normalizedType = typeMeta[type] ? type : "info"
    const text = normalizeMessage(message)

    if (shouldDedupe(text, normalizedType)) return

    const payload = {
        message: text,
        type: normalizedType,
        duration: options.duration || getDuration(normalizedType, text),
        important: Boolean(options.important || normalizedType === "error")
    }

    if (isTransitionActive() && !payload.important) {
        queueToast(payload)
        return
    }

    renderToast(payload)
}

function queueToast(payload) {
    const exists = queue.some((item) => item.message === payload.message && item.type === payload.type)
    if (!exists) queue.push(payload)

    if (queue.length > 4) queue.shift()
    scheduleFlush()
}

function scheduleFlush() {
    window.clearTimeout(flushTimer)
    flushTimer = window.setTimeout(flushNotifications, 420)
}

function flushNotifications() {
    if (isTransitionActive()) {
        scheduleFlush()
        return
    }

    const next = queue.splice(0, 1)[0]
    if (!next) return

    renderToast(next)

    if (queue.length) {
        window.clearTimeout(flushTimer)
        flushTimer = window.setTimeout(flushNotifications, 520)
    }
}

function renderToast(payload) {
    const area = createToastArea()

    while (area.children.length >= MAX_VISIBLE_TOASTS) {
        area.firstElementChild?.remove()
    }

    const meta = typeMeta[payload.type] || typeMeta.info
    const toast = document.createElement("div")
    toast.className = `toast ${payload.type}`
    toast.setAttribute("role", payload.type === "error" ? "alert" : "status")
    toast.innerHTML = `
        <span class="toastIcon" aria-hidden="true">${meta.icon}</span>
        <span class="toastBody">
            <span class="toastLabel">${meta.label}</span>
            <span class="toastMessage">${escapeHtml(payload.message)}</span>
        </span>
    `

    area.appendChild(toast)

    requestAnimationFrame(() => {
        toast.classList.add("show")
    })

    window.setTimeout(() => {
        toast.classList.add("hide")

        window.setTimeout(() => {
            toast.remove()
        }, 280)

    }, payload.duration)
}

function getDuration(type, message) {
    if (type === "error") return 5200
    if (type === "warning") return 4200
    return message.length > 32 ? 3800 : 2800
}

export function showSuccess(message) {
    showToast(message, "success")
}

export function showError(message, code = "") {
    showToast(formatErrorMessage(message, code), "error", { important: true })
}

function formatErrorMessage(message, code = "") {
    const text = String(message || "エラーが発生しました")

    if (/^\[[A-Z]+-[0-9]{3}\]/.test(text)) {
        return text
    }

    const resolvedCode = code || inferErrorCode(text)
    return `[${resolvedCode}] ${text}`
}

function inferErrorCode(message) {
    if (message.includes("管理者のみアクセス")) return "ROLE-002"
    if (message.includes("管理者のみ")) return "ROLE-003"
    if (message.includes("権限情報が不正")) return "ROLE-001"
    if (message.includes("Firestore") || message.includes("permission")) return "PERM-001"
    if (message.includes("ユーザー情報")) return "AUTH-007"
    if (message.includes("自動ログイン")) return "AUTH-010"
    if (message.includes("メールアドレス") && message.includes("既に")) return "ACC-001"
    if (message.includes("Authentication") && message.includes("登録")) return "ACC-004"
    if (message.includes("アカウント") && message.includes("作成")) return "ACC-002"
    if (message.includes("補完")) return "ACC-009"
    if (message.includes("勤怠登録")) return "ATT-001"
    if (message.includes("出勤")) return "ATT-002"
    if (message.includes("退勤")) return "ATT-003"
    if (message.includes("休み") || message.includes("休日")) return "HOL-001"
    if (message.includes("お知らせ")) return "NOTICE-001"
    if (message.includes("メンテナンス")) return "MAINT-001"
    if (message.includes("ログイン") || message.includes("認証")) return "AUTH-999"
    return "APP-999"
}

export function showWarning(message) {
    showToast(message, "warning")
}

export function showInfo(message) {
    showToast(message, "info")
}

export function showErrors(messages) {
    messages.forEach((message) => {
        showError(message)
    })
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}
