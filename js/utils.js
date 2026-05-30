export function getTimeMs(data) {
    if (data.time && data.time.seconds) return data.time.seconds * 1000
    if (data.time instanceof Date) return data.time.getTime()
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