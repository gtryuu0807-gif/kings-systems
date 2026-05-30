import { dom } from "../dom.js"
import { state, pageSize } from "../state.js"
import { formatTime, escapeHtml } from "../utils.js"

import {
    groupAdminAttendanceByUserAndDate,
    getVisibleSets
} from "./attendanceGroups.js"

import { createAdminEditBlock } from "./attendanceEditParts.js"

import {
    calculateDailyWorkTime,
    createHolidayMap,
    formatMinutes
} from "../attendance/workTime.js"

import {
    findHolidayByDate,
    deleteHoliday
} from "../attendance/holiday.js"

import { renderAdminSummary } from "./summary.js"
import { renderAdminWorkChart } from "./charts.js"

export function renderAdminHistory() {
    const targetUser = getSelectedAdminUser()

    if (!targetUser) {
        dom.adminHistory.innerHTML = `<div class="emptyStateCard">社員を選択してください</div>`
        dom.adminPrevPageBtn.disabled = true
        dom.adminNextPageBtn.disabled = true
        renderAdminSummary()
        renderAdminWorkChart()
        return
    }

    const records = state.allRecords.filter((record) => {
        return isSameUser(record, targetUser)
    })

    const allGroups = groupAdminAttendanceByUserAndDate(records, {
        rangeType: dom.adminHistoryRangeType.value,
        monthValue: dom.adminHistoryMonth.value,
        yearValue: dom.adminHistoryYear.value,
        targetUser
    })

    const filteredGroups = filterGroupsByRange(
        allGroups,
        dom.adminHistoryRangeType.value,
        dom.adminHistoryMonth.value,
        dom.adminHistoryYear.value
    )

    const todayKey = getTodayKey()

    const visibleGroups = filteredGroups.filter((group) => {
        return group.dateKey <= todayKey
    })

    const holidayMap = createHolidayMap(targetUser, state.allHolidays)

    const maxPage = Math.max(
        0,
        Math.ceil(visibleGroups.length / pageSize) - 1
    )

    if (state.adminCurrentPage < 0) state.adminCurrentPage = 0
    if (state.adminCurrentPage > maxPage) state.adminCurrentPage = maxPage

    const pageRecords = visibleGroups.slice(
        state.adminCurrentPage * pageSize,
        state.adminCurrentPage * pageSize + pageSize
    )

    dom.adminHistory.innerHTML = ""

    if (pageRecords.length === 0) {
        dom.adminHistory.innerHTML = `<div class="emptyStateCard">履歴がありません</div>`
    } else {
        pageRecords.forEach((dayData) => {
            const targetUserData = {
                uid: targetUser.uid || dayData.uid || "",
                email: targetUser.email || dayData.email || dayData.userKey || ""
            }

            const dailyResult = calculateDailyWorkTime({
                records: dayData.records,
                holidayMap,
                dateKey: dayData.dateKey
            })

            const holiday = findHolidayByDate(dayData.dateKey, targetUserData)

            const item = document.createElement("div")
            item.className = `adminItem historyItem ${getDailyStatusClass(dailyResult.status)}`

            if (
                dailyResult.status === "holiday" ||
                dailyResult.status === "autoHoliday"
            ) {
                renderHolidayAdminHistoryItem({
                    item,
                    dayData,
                    dailyResult,
                    holiday
                })
            } else {
                renderWorkAdminHistoryItem({
                    item,
                    dayData,
                    dailyResult,
                    targetUserData
                })
            }

            dom.adminHistory.appendChild(item)
        })
    }

    dom.adminPrevPageBtn.disabled = state.adminCurrentPage <= 0
    dom.adminNextPageBtn.disabled = state.adminCurrentPage >= maxPage

    renderAdminSummary()
    renderAdminWorkChart()
}

function renderHolidayAdminHistoryItem({
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
            <strong>${escapeHtml(dayData.displayName)}</strong>
            <span class="statusBadge">${getStatusLabel(dailyResult.status)}</span>
        </div>
        <div class="historyDateLine">${escapeHtml(dayData.dateLabel)}</div>

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

function renderWorkAdminHistoryItem({
    item,
    dayData,
    dailyResult,
    targetUserData
}) {
    const visibleSets = getVisibleSets(dayData.sets)

    const firstSet = visibleSets[0] || {
        setNumber: 1,
        clockIn: null,
        clockOut: null
    }

    const secondSet = visibleSets[1]

    item.innerHTML = `
    ${renderEditButton()}

    <div class="historyMainText">
        <div class="historyCardHead">
            <strong>${escapeHtml(dayData.displayName)}</strong>
            <span class="statusBadge">${getStatusLabel(dailyResult.status)}</span>
        </div>
        <div class="historyDateLine">${escapeHtml(dayData.dateLabel)}</div>

        <div class="historyCompactSummary">
            総勤務 ${formatMinutes(dailyResult.workedMinutes)} / 残業 ${formatMinutes(dailyResult.overtimeMinutes)}
        </div>

        <button type="button" class="historyDetailToggle">▼ 詳細を見る</button>

        <div class="historyDetailPanel">
            <div class="historySetLines">
                ${renderSetLine(firstSet, 1, dayData.dateKey)}
                ${secondSet ? renderSetLine(secondSet, 2, dayData.dateKey) : ""}
            </div>

            <div class="workTimeInfo">
                総勤務時間：${formatMinutes(dailyResult.workedMinutes)}<br>
                休憩時間：${formatMinutes(dailyResult.breakMinutes)}<br>
                残業時間：${formatMinutes(dailyResult.overtimeMinutes)}
            </div>
        </div>
    </div>
    `

    const editArea = document.createElement("div")
    editArea.className = "historyEditArea"

    editArea.appendChild(
        createAdminEditBlock(
            "1回目 出勤",
            firstSet.clockIn,
            "出勤",
            targetUserData,
            1
        )
    )

    editArea.appendChild(
        createAdminEditBlock(
            "1回目 退勤",
            firstSet.clockOut,
            "退勤",
            targetUserData,
            1
        )
    )

    if (secondSet) {
        editArea.appendChild(
            createAdminEditBlock(
                "2回目 出勤",
                secondSet.clockIn,
                "出勤",
                targetUserData,
                2
            )
        )

        editArea.appendChild(
            createAdminEditBlock(
                "2回目 退勤",
                secondSet.clockOut,
                "退勤",
                targetUserData,
                2
            )
        )
    }

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
        ${setNumber === 1 ? "①" : "②"} ${escapeHtml(clockInText)} → ${escapeHtml(clockOutText)}${nextDayLabel}
    </div>
    `
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

function getSelectedAdminUser() {
    const userId = dom.adminHistoryEmployeeSelect.value

    if (!userId) return null

    return state.allUsers.find((user) => {
        return user.id === userId
    }) || null
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
