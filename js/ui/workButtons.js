import { dom } from "../dom.js"
import { state } from "../state.js"
import { getMyRecords } from "../data.js"
import { getTimeValue } from "./attendanceGroups.js"

export function updateWorkButtons() {
    if (!dom.clockInBtn || !dom.clockOutBtn) return

    const records = [...getMyRecords()].sort((a, b) => {
        return getTimeValue(b) - getTimeValue(a)
    })

    if (state.isPunchBusy) {
        setButtonMode(dom.clockInBtn, "busy", "処理中...")
        setButtonMode(dom.clockOutBtn, "disabled", "退勤")
        renderCurrentWorkStatus(records, "処理中")
        return
    }

    const todayClockInCount = getTodayClockInCount(records)

    if (records.length === 0) {
        setButtonMode(dom.clockInBtn, "primary", "出勤する")
        setButtonMode(dom.clockOutBtn, "disabled", "退勤")
        renderCurrentWorkStatus(records, "未出勤")
        return
    }

    const latest = records[0]

    if (latest.type === "出勤") {
        setButtonMode(dom.clockInBtn, "completed", "出勤中")
        setButtonMode(dom.clockOutBtn, "primary", "退勤する")
        renderCurrentWorkStatus(records, "出勤中")
        return
    }

    if (todayClockInCount >= 2) {
        setButtonMode(dom.clockInBtn, "disabled", "本日は打刻済み")
        setButtonMode(dom.clockOutBtn, "disabled", "退勤")
        renderCurrentWorkStatus(records, "退勤済み")
        return
    }

    setButtonMode(dom.clockInBtn, "primary", "出勤する")
    setButtonMode(dom.clockOutBtn, "disabled", "退勤")
    renderCurrentWorkStatus(records, "未出勤")
}

function setButtonMode(button, mode, label) {
    button.classList.remove(
        "workBtnPrimary",
        "workBtnDisabled",
        "workBtnCompleted",
        "workBtnBusy"
    )

    const isDisabled = mode === "disabled" || mode === "completed" || mode === "busy"

    button.disabled = isDisabled
    button.classList.add(`workBtn${capitalize(mode)}`)

    const icon = getButtonIcon(button.id, mode)

    button.innerHTML = `
        <span class="workBtnIcon" aria-hidden="true">${icon}</span>
        <span>${label}</span>
    `
}

function renderCurrentWorkStatus(records, statusLabel) {
    if (!dom.currentWorkStatusCard) return

    const latestClockIn = records.find((record) => record.type === "出勤")
    const clockInDate = latestClockIn ? getRecordDate(latestClockIn) : null
    const clockInText = clockInDate ? formatTimeOnly(clockInDate) : "未打刻"
    const workTimeText = statusLabel === "出勤中" && clockInDate
        ? formatDuration(Date.now() - clockInDate.getTime())
        : "-"

    const statusClass = statusLabel === "出勤中"
        ? "working"
        : statusLabel === "退勤済み"
            ? "left"
            : statusLabel === "処理中"
                ? "busy"
                : "none"

    dom.currentWorkStatusCard.className = `currentWorkStatusCard ${statusClass}`
    dom.currentWorkStatusCard.innerHTML = `
        <div class="currentStatusIcon" aria-hidden="true">
            ${getStatusIcon(statusLabel)}
        </div>
        <div class="currentStatusText">
            <span>現在の状態</span>
            <strong>${statusLabel}</strong>
            <small>出勤時刻：${clockInText} / 勤務時間：${workTimeText}</small>
        </div>
    `
}

function getStatusIcon(statusLabel) {
    if (statusLabel === "出勤中") {
        return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>`
    }

    if (statusLabel === "退勤済み") {
        return `<svg viewBox="0 0 24 24"><path d="M5 12l4 4L19 6"/><circle cx="12" cy="12" r="8"/></svg>`
    }

    return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5"/></svg>`
}

function getButtonIcon(buttonId, mode) {
    if (mode === "busy") {
        return `
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="22 12"/></svg>
        `
    }

    if (mode === "completed") {
        return `
        <svg viewBox="0 0 24 24"><path d="M5 12l4 4L19 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        `
    }

    if (buttonId === "clockOutBtn") {
        return `
        <svg viewBox="0 0 24 24"><path d="M9 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 12h10M11 9l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        `
    }

    return `
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    `
}

function getTodayClockInCount(records) {
    const today = new Date()

    return records.filter((record) => {
        if (record.type !== "出勤") return false

        const date = getRecordDate(record)
        if (!date) return false

        return (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        )
    }).length
}

function getRecordDate(record) {
    if (record?.time?.seconds) return new Date(record.time.seconds * 1000)
    if (record?.time instanceof Date) return record.time
    return null
}

function formatTimeOnly(date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function formatDuration(ms) {
    if (!ms || ms < 0) return "-"
    const minutes = Math.floor(ms / 60000)
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}時間${m}分`
}

function capitalize(text) {
    return String(text).charAt(0).toUpperCase() + String(text).slice(1)
}
