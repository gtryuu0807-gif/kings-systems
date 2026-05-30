let toastArea = null

function createToastArea() {
    if (toastArea) return toastArea

    toastArea = document.createElement("div")
    toastArea.id = "toastArea"

    document.body.appendChild(toastArea)

    return toastArea
}

export function showToast(message, type = "info") {
    const area = createToastArea()

    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.textContent = message

    area.appendChild(toast)

    requestAnimationFrame(() => {
        toast.classList.add("show")
    })

    setTimeout(() => {
        toast.classList.add("hide")

        setTimeout(() => {
            toast.remove()
        }, 250)

    }, 3200)
}

export function showSuccess(message) {
    showToast(message, "success")
}

export function showError(message, code = "") {
    showToast(formatErrorMessage(message, code), "error")
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
