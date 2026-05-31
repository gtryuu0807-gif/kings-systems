export function getTimeMs(data) {
    const value = data?.time ?? data
    if (!value) return 0
    if (typeof value === "number") return value
    if (value instanceof Date) return value.getTime()
    if (typeof value === "string") {
        const date = new Date(value)
        return isNaN(date.getTime()) ? 0 : date.getTime()
    }
    if (typeof value.toMillis === "function") return value.toMillis()
    if (typeof value.toDate === "function") return value.toDate().getTime()
    if (typeof value.seconds === "number") return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000)
    return 0
}

export function getNoticeTimeMs(data) {
    if (data.createdAt && data.createdAt.seconds) return data.createdAt.seconds * 1000
    if (data.createdAt instanceof Date) return data.createdAt.getTime()
    return 0
}

export function getUserTimeMs(data) {
    if (data.createdAt && data.createdAt.seconds) return data.createdAt.seconds * 1000
    if (data.createdAt instanceof Date) return data.createdAt.getTime()
    return 0
}

export function formatTime(data) {
    const date = new Date(getTimeMs(data))

    if (isNaN(date.getTime())) return "--:--"

    return [
        String(date.getHours()).padStart(2, "0"),
        String(date.getMinutes()).padStart(2, "0")
    ].join(":")
}

export function formatNoticeTime(data) {
    return new Date(getNoticeTimeMs(data)).toLocaleString()
}

export function formatUserTime(data) {
    return new Date(getUserTimeMs(data)).toLocaleString()
}

export function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}