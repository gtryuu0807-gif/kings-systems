const CHECK_INTERVAL_MS = 30000
let currentVersionKey = sessionStorage.getItem("kings:versionKey") || ""

async function fetchVersion() {
    const response = await fetch(`./version.json?ts=${Date.now()}`, { cache: "no-store" })
    if (!response.ok) throw new Error("version check failed")
    return response.json()
}

function getKey(info) {
    return `${info?.version || ""}:${info?.build || ""}`
}

async function clearAppCaches() {
    if (!("caches" in window)) return
    const names = await caches.keys()
    await Promise.all(names.map((name) => caches.delete(name)))
}

export async function initCacheRealtimeUpdate() {
    try {
        const info = await fetchVersion()
        const key = getKey(info)
        if (!currentVersionKey) {
            currentVersionKey = key
            sessionStorage.setItem("kings:versionKey", key)
        }
    } catch (_) {}

    async function check() {
        if (document.body.classList.contains("kt-booting") || document.body.classList.contains("kt-transitioning") || document.body.classList.contains("auto-auth-checking")) return
        try {
            const info = await fetchVersion()
            const key = getKey(info)
            if (currentVersionKey && key && key !== currentVersionKey) {
                sessionStorage.setItem("kings:forceBoot", "true")
                sessionStorage.setItem("kings:versionKey", key)
                await clearAppCaches()
                location.reload()
            } else if (key) {
                currentVersionKey = key
                sessionStorage.setItem("kings:versionKey", key)
            }
        } catch (_) {}
    }

    window.setInterval(check, CHECK_INTERVAL_MS)
    document.addEventListener("visibilitychange", () => { if (!document.hidden) check() })
    window.addEventListener("focus", check)
}
