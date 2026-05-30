import { auth } from "./firebase.js"
import { state } from "./state.js"
import { formatTime } from "./utils.js"
import { groupMyAttendanceByDate, createAttendanceSets } from "./ui/attendanceGroups.js"

export function getMyIncompleteAttendances() {
    const user = auth.currentUser

    if (!user) return []

    const myRecords = state.allRecords.filter((record) => {
        return isSameUser(record, user)
    })

    const groups = groupMyAttendanceByDate(myRecords)
    const result = []

    groups.forEach((group) => {
        if (!shouldCheckIncompleteDate(group.dateKey, user)) return

        const sets = group.sets?.length ? group.sets : createAttendanceSets(group.records)

        sets.forEach((set) => {
            const hasClockIn = Boolean(set.clockIn)
            const hasClockOut = Boolean(set.clockOut)

            if (!hasClockIn && !hasClockOut) return
            if (hasClockIn && hasClockOut) return

            result.push({
                dateKey: group.dateKey,
                dateLabel: group.dateLabel,
                setNumber: set.setNumber,
                clockIn: set.clockIn,
                clockOut: set.clockOut,
                clockInText: set.clockIn ? formatTime(set.clockIn) : "未打刻",
                clockOutText: set.clockOut ? formatTime(set.clockOut) : "未打刻"
            })
        })
    })

    return result.sort((a, b) => String(b.dateKey).localeCompare(String(a.dateKey)))
}

export function getIncompleteAttendanceCountByUser(user) {
    if (!user) return 0

    const records = state.allRecords.filter((record) => {
        return isSameUser(record, user)
    })

    const groups = {}

    records.forEach((record) => {
        const dateKey = getDateKey(record)

        if (!groups[dateKey]) groups[dateKey] = []

        groups[dateKey].push(record)
    })

    let count = 0

    Object.entries(groups).forEach(([dateKey, recordsInDate]) => {
        if (!shouldCheckIncompleteDate(dateKey, user)) return

        const sets = createAttendanceSets(recordsInDate)

        sets.forEach((set) => {
            const hasClockIn = Boolean(set.clockIn)
            const hasClockOut = Boolean(set.clockOut)

            if (!hasClockIn && !hasClockOut) return
            if (hasClockIn && hasClockOut) return

            count++
        })
    })

    return count
}

export function renderIncompleteAttendanceAlert() {
    const alertBox = document.getElementById("incompleteAttendanceAlert")

    if (!alertBox) return

    const incompletes = getMyIncompleteAttendances()

    if (incompletes.length === 0) {
        alertBox.innerHTML = ""
        alertBox.classList.remove("show")
        return
    }

    alertBox.classList.add("show")

    if (incompletes.length === 1) {
        const item = incompletes[0]

        alertBox.innerHTML = `
        <div class="incompleteAlertTitle">
            <span class="inlineSvgIcon warningIcon" aria-hidden="true">${createWarningSvg()}</span>
            <span>未打刻の勤怠があります</span>
        </div>
        <div class="incompleteAlertBody">
            <strong>${escapeHtml(item.dateLabel)}</strong><br>
            出勤：${escapeHtml(item.clockInText)}<br>
            退勤：${escapeHtml(item.clockOutText)}
        </div>
        <div class="incompleteAlertHelp">勤務履歴から修正してください。</div>
        `
        return
    }

    const previewItems = incompletes.slice(0, 5)

    alertBox.innerHTML = `
    <div class="incompleteAlertTitle">
        <span class="inlineSvgIcon warningIcon" aria-hidden="true">${createWarningSvg()}</span>
        <span>未打刻の勤怠が${incompletes.length}件あります</span>
    </div>
    <div class="incompletePreviewList">
        ${previewItems.map((item) => `<div>・${escapeHtml(item.dateLabel)}</div>`).join("")}
    </div>
    ${incompletes.length > 5 ? `<div class="incompleteAlertHelp">直近5件を表示しています。</div>` : ""}
    <button type="button" class="incompleteToggleBtn">詳細を見る</button>
    <div class="incompleteDetailList">
        ${incompletes.map((item) => {
            return `
            <div class="incompleteDetailItem">
                <strong>${escapeHtml(item.dateLabel)}</strong><br>
                出勤：${escapeHtml(item.clockInText)}<br>
                退勤：${escapeHtml(item.clockOutText)}
            </div>
            `
        }).join("")}
    </div>
    <div class="incompleteAlertHelp">勤務履歴から修正してください。</div>
    `

    const toggleBtn = alertBox.querySelector(".incompleteToggleBtn")
    const detailList = alertBox.querySelector(".incompleteDetailList")

    toggleBtn?.addEventListener("click", () => {
        detailList.classList.toggle("show")
        toggleBtn.textContent = detailList.classList.contains("show") ? "閉じる" : "詳細を見る"
    })
}

function shouldCheckIncompleteDate(dateKey, user) {
    if (!dateKey || dateKey === "unknown") return false
    if (!isPastDateKey(dateKey)) return false
    if (isHolidayDate(dateKey, user)) return false
    return true
}

function isPastDateKey(dateKey) {
    const target = dateKeyToDate(dateKey)
    if (!target) return false

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    return target.getTime() < todayStart.getTime()
}

function isHolidayDate(dateKey, user) {
    return state.allHolidays.some((holiday) => {
        return holiday.date === dateKey && isSameUser(holiday, user)
    })
}

function dateKeyToDate(dateKey) {
    const parts = String(dateKey || "").split("-")
    if (parts.length !== 3) return null

    const year = Number(parts[0])
    const month = Number(parts[1])
    const day = Number(parts[2])

    if (!year || !month || !day) return null

    return new Date(year, month - 1, day)
}

function isSameUser(a, b) {
    const sameEmail =
        String(a.email || "").toLowerCase() ===
        String(b.email || "").toLowerCase()

    const sameUid =
        a.uid &&
        b.uid &&
        a.uid === b.uid

    return sameEmail || sameUid
}

function getDateKey(record) {
    if (record?.workDate) return record.workDate

    const date = getDate(record?.time)

    if (!date) return "unknown"

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-")
}

function getDate(value) {
    if (!value) return null
    if (value.seconds) return new Date(value.seconds * 1000)
    if (value instanceof Date) return value
    return null
}

function createWarningSvg() {
    return `
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M12 3 22 20H2L12 3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 9v5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="12" cy="17" r="1.2" fill="currentColor"/>
    </svg>
    `
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}
