import { dom } from "../dom.js"
import { state } from "../state.js"
import { getMyRecords } from "../data.js"

import {
    groupMyAttendanceByDate,
    groupAdminAttendanceByUserAndDate
} from "./attendanceGroups.js"

import {
    calculateDailyWorkTime,
    createHolidayMap,
    formatMinutes
} from "../attendance/workTime.js"

export function renderMySummary() {
    const groups = groupMyAttendanceByDate(getMyRecords(), {
        rangeType: dom.myHistoryRangeType.value,
        monthValue: dom.myHistoryMonth.value,
        yearValue: dom.myHistoryYear.value
    })

    const filteredGroups = filterGroupsByRange(
        groups,
        dom.myHistoryRangeType.value,
        dom.myHistoryMonth.value,
        dom.myHistoryYear.value
    )

    const summary = calculateSummary(filteredGroups)

    dom.mySummary.innerHTML = createMySummaryHtml(summary)
}

export function renderAdminSummary() {
    const targetUser = getSelectedAdminUser()

    if (!targetUser) {
        dom.adminSummary.innerHTML = `
        <div class="summaryCard">
            <span>社員選択</span>
            <strong>未選択</strong>
        </div>
        `
        renderMonthlyReportPreview(null, null)
        return
    }

    const records = state.allRecords.filter((record) => {
        return isSameUser(record, targetUser)
    })

    const groups = groupAdminAttendanceByUserAndDate(records, {
        rangeType: dom.adminHistoryRangeType.value,
        monthValue: dom.adminHistoryMonth.value,
        yearValue: dom.adminHistoryYear.value,
        targetUser
    })

    const filteredGroups = filterGroupsByRange(
        groups,
        dom.adminHistoryRangeType.value,
        dom.adminHistoryMonth.value,
        dom.adminHistoryYear.value
    )

    const summary = calculateSummary(filteredGroups, targetUser)

    dom.adminSummary.innerHTML = createAdminSummaryHtml(summary)
    renderMonthlyReportPreview(targetUser, summary)
}

export function calculateSummary(groups, targetUser = null) {
    const holidayMap = createHolidayMap(targetUser, state.allHolidays)

    let totalActualMinutes = 0
    let totalOvertimeMinutes = 0
    let workDays = 0
    let holidays = 0
    let missingDays = 0

    groups.forEach((group) => {
        const result = calculateDailyWorkTime({
            records: group.records,
            holidayMap,
            dateKey: group.dateKey
        })

        if (result.status === "worked") {
            workDays++
            totalActualMinutes += result.actualMinutes
            totalOvertimeMinutes += result.overtimeMinutes
        }

        if (result.status === "holiday" || result.status === "autoHoliday") {
            holidays++
        }

        if (result.status === "missing" || result.status === "futureMissing") {
            missingDays++
        }
    })

    return {
        totalActualMinutes,
        totalOvertimeMinutes,
        workDays,
        holidays,
        missingDays,
        totalWorkLabel: formatMinutes(totalActualMinutes),
        overtimeLabel: formatMinutes(totalOvertimeMinutes)
    }
}

export function filterGroupsByRange(groups, rangeType, monthValue, yearValue) {
    return groups.filter((group) => {
        if (rangeType === "year") {
            return group.dateKey.startsWith(String(yearValue || ""))
        }

        return group.dateKey.startsWith(String(monthValue || ""))
    })
}

function renderMonthlyReportPreview(targetUser, summary) {
    if (!dom.monthlyReportPreview) return

    if (!targetUser || !summary) {
        dom.monthlyReportPreview.innerHTML = `
        <div class="monthlyReportEmpty">
            社員と対象月を選択すると、PDF作成前のプレビューを表示します。
        </div>
        `
        return
    }

    const periodLabel = dom.adminHistoryRangeType?.value === "year"
        ? `${dom.adminHistoryYear?.value || "-"}年`
        : formatMonthLabel(dom.adminHistoryMonth?.value)

    dom.monthlyReportPreview.innerHTML = `
    <div class="monthlyReportPreviewHead">
        <div>
            <strong>${escapeHtml(targetUser.name || targetUser.email || "社員")}</strong>
            <span>${escapeHtml(periodLabel)}</span>
        </div>
        <span class="a4OptimizedBadge">A4最適化済</span>
    </div>

    <div class="monthlyReportPreviewGrid">
        <div><span>勤務日数</span><strong>${summary.workDays}日</strong></div>
        <div><span>総勤務</span><strong>${summary.totalWorkLabel}</strong></div>
        <div><span>残業</span><strong>${summary.overtimeLabel}</strong></div>
    </div>
    `
}

function formatMonthLabel(value) {
    const parts = String(value || "").split("-")
    if (parts.length === 2) return `${Number(parts[0])}年${Number(parts[1])}月`
    return "対象月未選択"
}

function createMySummaryHtml(summary) {
    return `
    <div class="summaryCard">
        <span>出勤日数</span>
        <strong>${summary.workDays}日</strong>
    </div>

    <div class="summaryCard">
        <span>休日日数</span>
        <strong>${summary.holidays}日</strong>
    </div>
    `
}

function createAdminSummaryHtml(summary) {
    return `
    <div class="summaryCard">
        <span>総勤務時間</span>
        <strong>${summary.totalWorkLabel}</strong>
    </div>

    <div class="summaryCard">
        <span>累計残業</span>
        <strong>${summary.overtimeLabel}</strong>
    </div>

    <div class="summaryCard">
        <span>出勤日数</span>
        <strong>${summary.workDays}日</strong>
    </div>

    <div class="summaryCard">
        <span>休日日数</span>
        <strong>${summary.holidays}日</strong>
    </div>
    `
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


function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}
