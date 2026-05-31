function escapeHtml(text) {
    return String(text || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")
}

export function renderSystemLog() {
    const target = document.getElementById("systemLogList")
    if (!target) return
    let logs = []
    try { logs = JSON.parse(localStorage.getItem("kings:systemLogs") || "[]") } catch (_) {}
    if (!logs.length) {
        target.innerHTML = '<div class="noticeEmpty">エラーログはありません</div>'
        return
    }
    target.innerHTML = logs.map((log) => {
        const d = new Date(log.at)
        const time = Number.isNaN(d.getTime()) ? '-' : d.toLocaleString()
        return `<div class="systemLogItem"><strong>${escapeHtml(log.code)}</strong><span>${escapeHtml(time)}</span><p>${escapeHtml(log.message)}</p></div>`
    }).join("")
}

export function setupSystemLogRenderer() {
    renderSystemLog()
    window.addEventListener("kings:system-log-updated", renderSystemLog)
    document.addEventListener("click", (event) => {
        if (event.target?.closest?.('[data-admin-tab="systemLog"]')) {
            window.setTimeout(renderSystemLog, 50)
        }
    })
}
