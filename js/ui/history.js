import { dom } from "../dom.js"
import { state, pageSize } from "../state.js"
import { formatTime, escapeHtml } from "../utils.js"
import { getMyRecords } from "../data.js"

import {
    groupMyAttendanceByDate,
    getVisibleSets
} from "./attendanceGroups.js"

import { createAttendanceEditSetBlock } from "./attendanceEditParts.js"

import {
    calculateDailyWorkTime,
    createHolidayMap,
    formatMinutes
} from "../attendance/workTime.js"

import {
    findHolidayByDate,
    deleteHoliday
} from "../attendance/holiday.js"

import { renderMySummary } from "./summary.js"
import { renderIncompleteAttendanceAlert } from "../unclosedAttendance.js"

export function renderHistory() {
    if (!state.hasAppliedMyHistoryFilter) {
        dom.history.innerHTML = `<div class="emptyStateCard historyInitialHiddenCard">表示条件を選択して「表示する」を押すと勤務履歴を表示します</div>`
        if (dom.prevPageBtn) dom.prevPageBtn.disabled = true
        if (dom.nextPageBtn) dom.nextPageBtn.disabled = true
        renderMySummary()
        renderIncompleteAttendanceAlert()
        return
    }

    const allGroups = groupMyAttendanceByDate(getMyRecords(), {
        rangeType: dom.myHistoryRangeType.value,
        monthValue: dom.myHistoryMonth.value,
        yearValue: dom.myHistoryYear.value
    })

    const filteredGroups = filterGroupsByRange(
        allGroups,
        dom.myHistoryRangeType.value,
        dom.myHistoryMonth.value,
        dom.myHistoryYear.value
    )

    const todayKey = getTodayKey()

    const visibleGroups = filteredGroups.filter((group) => {
        return group.dateKey <= todayKey
    })

    const holidayMap = createHolidayMap(null, state.allHolidays)

    const maxPage = Math.max(
        0,
        Math.ceil(visibleGroups.length / pageSize) - 1
    )

    if (state.currentPage < 0) state.currentPage = 0
    if (state.currentPage > maxPage) state.currentPage = maxPage

    const pageRecords = visibleGroups.slice(
        state.currentPage * pageSize,
        state.currentPage * pageSize + pageSize
    )

    dom.history.innerHTML = ""

    if (pageRecords.length === 0) {
        dom.history.innerHTML = `<div class="emptyStateCard">この期間の勤務履歴はありません</div>`
    } else {
        pageRecords.forEach((dayData) => {
            const dailyResult = calculateDailyWorkTime({
                records: dayData.records,
                holidayMap,
                dateKey: dayData.dateKey
            })

            const holiday = findHolidayByDate(dayData.dateKey)
            const item = document.createElement("div")
            item.className = `historyItem ${getDailyStatusClass(dailyResult.status)}`

            const hasAnyAttendanceRecord = Array.isArray(dayData.records) && dayData.records.length > 0

            if (
                !hasAnyAttendanceRecord &&
                (dailyResult.status === "holiday" ||
                dailyResult.status === "autoHoliday")
            ) {
                renderHolidayHistoryItem({
                    item,
                    dayData,
                    dailyResult,
                    holiday
                })
            } else {
                renderWorkHistoryItem({
                    item,
                    dayData,
                    dailyResult
                })
            }

            dom.history.appendChild(item)
        })
    }

    dom.prevPageBtn.disabled = state.currentPage <= 0
    dom.nextPageBtn.disabled = state.currentPage >= maxPage

    renderMySummary()
    renderIncompleteAttendanceAlert()
}

function renderHolidayHistoryItem({
    item,
    dayData,
    dailyResult,
    holiday
}) {
    const isRegisteredHoliday = dailyResult.status === "holiday"

    item.innerHTML = `
    ${renderEditButton()}

    <div class="historyMainText">
        <div class="historyCardHead">
            <strong>${escapeHtml(dayData.dateLabel)}</strong>
            <span class="statusBadge">${getStatusLabel(dailyResult.status)}</span>
        </div>

        <div class="holidaySimpleBox">
            ${isRegisteredHoliday
                ? "この日は休みとして登録されています。"
                : "出勤・退勤がないため、自動で休みとして扱われています。"
            }
        </div>
    </div>
    `

    const editArea = document.createElement("div")
    editArea.className = "historyEditArea"

    if (holiday) {
        const holidayDeleteBtn = document.createElement("button")
        holidayDeleteBtn.className = "holidayDeleteBtn"
        holidayDeleteBtn.innerHTML = "休み登録を削除"

        holidayDeleteBtn.addEventListener("click", () => {
            deleteHoliday(holiday.id)
        })

        editArea.appendChild(holidayDeleteBtn)
    } else {
        const info = document.createElement("div")
        info.className = "holidayAutoInfo"
        info.innerHTML = "自動休みは削除できません。出勤・退勤を追加すると勤務日として表示されます。"
        editArea.appendChild(info)
    }

    item.appendChild(editArea)

    item.querySelector(".historySettingBtn").addEventListener("click", () => {
        editArea.classList.toggle("show")
    })
}

function renderWorkHistoryItem({
    item,
    dayData,
    dailyResult
}) {
    const visibleSets = getVisibleSets(dayData.sets)

        item.innerHTML = `
    ${renderEditButton()}

    <div class="historyMainText">
        <div class="historyCardHead">
            <strong>${escapeHtml(dayData.dateLabel)}</strong>
            <span class="statusBadge">${getStatusLabel(dailyResult.status)}</span>
        </div>

        <div class="historyCompactSummary">
            総勤務 ${formatMinutes(dailyResult.workedMinutes)}
        </div>

        <div class="historyAlwaysSetLines">
            ${visibleSets.map((set, index) => renderSetLine(set, index + 1, dayData.dateKey)).join("")}
        </div>

        <button type="button" class="historyDetailToggle">▼ 詳細を見る</button>

        <div class="historyDetailPanel">
            <div class="historySetLines">
                ${visibleSets.map((set, index) => renderSetLine(set, index + 1, dayData.dateKey)).join("")}
            </div>

            <div class="workTimeInfo">
                総勤務時間：${formatMinutes(dailyResult.workedMinutes)}<br>
                休憩時間：${formatMinutes(dailyResult.breakMinutes)}
            </div>
        </div>
    </div>
    `

    const editArea = document.createElement("div")
    editArea.className = "historyEditArea"

    visibleSets.forEach((set, index) => {
        editArea.appendChild(
            createAttendanceEditSetBlock(
                set,
                index + 1
            )
        )
    })

    item.appendChild(editArea)

    item.querySelector(".historySettingBtn").addEventListener("click", () => {
        editArea.classList.toggle("show")
    })

    item.querySelector(".historyDetailToggle").addEventListener("click", (event) => {
        const isOpen = item.classList.toggle("detailOpen")
        event.currentTarget.textContent = isOpen ? "▲ 詳細を閉じる" : "▼ 詳細を見る"
    })
}

function renderEditButton() {
    return `
    <button class="historySettingBtn" aria-label="勤怠を編集">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M6 3h9l3 3v15H6z"/>
            <path d="M14 3v4h4"/>
            <path d="M9 13h4"/>
            <path d="M9 17h2"/>
            <path d="M14 18l5-5 2 2-5 5-3 1 1-3Z"/>
        </svg>
    </button>
    `
}

function renderSetLine(set, setNumber, dateKey) {
    const clockInText = set.clockIn ? formatTime(set.clockIn) : "未打刻"
    const clockOutText = set.clockOut ? formatTime(set.clockOut) : "未打刻"
    const nextDayLabel = set.clockOut && isNextDayRecord(set.clockOut, dateKey)
        ? "（翌日）"
        : ""

    return `
    <div class="historySetLine">
        ${getSetNumberLabel(setNumber)} ${escapeHtml(clockInText)} → ${escapeHtml(clockOutText)}${nextDayLabel}
    </div>
    `
}

function getSetNumberLabel(setNumber) {
    if (setNumber === 1) return "①"
    if (setNumber === 2) return "②"
    if (setNumber === 3) return "③"
    return `${setNumber}`
}

function isNextDayRecord(record, dateKey) {
    const timeMs = getRecordTimeMs(record)

    if (!timeMs || !dateKey) return false

    const [year, month, day] = String(dateKey).split("-").map(Number)

    if (!year || !month || !day) return false

    const base = new Date(year, month - 1, day)
    const recordDate = new Date(timeMs)

    return (
        recordDate.getFullYear() !== base.getFullYear() ||
        recordDate.getMonth() !== base.getMonth() ||
        recordDate.getDate() !== base.getDate()
    )
}

function getRecordTimeMs(record) {
    if (record?.time?.seconds) return record.time.seconds * 1000
    if (record?.time instanceof Date) return record.time.getTime()
    return 0
}

function filterGroupsByRange(groups, rangeType, monthValue, yearValue) {
    return groups.filter((group) => {
        if (rangeType === "year") {
            return group.dateKey.startsWith(String(yearValue || ""))
        }

        return group.dateKey.startsWith(String(monthValue || ""))
    })
}

function getTodayKey() {
    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
}

function getStatusLabel(status) {
    if (status === "holiday") return "休み"
    if (status === "autoHoliday") return "自動休み"
    if (status === "missing") return "未打刻"
    if (status === "futureMissing") return "未打刻"
    if (status === "worked") return "勤務日"

    return "未記録"
}

function getDailyStatusClass(status) {
    if (status === "holiday") return "statusHoliday"
    if (status === "autoHoliday") return "statusAutoHoliday"
    if (status === "missing") return "statusIncomplete"
    if (status === "futureMissing") return "statusIncomplete"
    if (status === "worked") return "statusNormal"

    return "statusEmpty"
}
