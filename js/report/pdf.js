import { auth } from "../firebase.js"
import { dom } from "../dom.js"
import { state } from "../state.js"

import {
    groupMyAttendanceByDate,
    groupAdminAttendanceByUserAndDate
} from "../ui/attendanceGroups.js"

import {
    calculateDailyWorkTime,
    createHolidayMap,
    formatMinutes
} from "../attendance/workTime.js"

import {
    calculateSummary,
    filterGroupsByRange
} from "../ui/summary.js"

import {
    showWarning
} from "../notify.js"

export function downloadMyMonthlyPdf() {
    const user = auth.currentUser

    if (!user) {
        showWarning("ログインしてください")
        return
    }

    if (dom.myHistoryRangeType.value !== "month") {
        showWarning("PDF出力は月別表示で利用してください")
        return
    }

    const groups = groupMyAttendanceByDate(getMyRecords(), {
        rangeType: "month",
        monthValue: dom.myHistoryMonth.value,
        yearValue: dom.myHistoryYear.value
    })

    const filteredGroups = filterGroupsByRange(
        groups,
        "month",
        dom.myHistoryMonth.value,
        dom.myHistoryYear.value
    )

    const holidayMap = createHolidayMap(null, state.allHolidays)
    const summary = calculateSummary(filteredGroups)

    openPrintReport({
        title: "月次勤怠レポート",
        employeeName: getMyDisplayName(),
        period: dom.myHistoryMonth.value,
        groups: filteredGroups,
        summary,
        holidayMap
    })
}

export function downloadAdminMonthlyPdf() {
    if (state.currentUserRole !== "admin") {
        showWarning("管理者のみPDFを作成できます")
        return
    }

    if (dom.adminHistoryRangeType.value !== "month") {
        showWarning("PDF出力は月別表示で利用してください")
        return
    }

    const targetUser = getSelectedAdminUser()

    if (!targetUser) {
        showWarning("社員を選択してください")
        return
    }

    const records = state.allRecords.filter((record) => {
        return isSameUser(record, targetUser)
    })

    const groups = groupAdminAttendanceByUserAndDate(records, {
        rangeType: "month",
        monthValue: dom.adminHistoryMonth.value,
        yearValue: dom.adminHistoryYear.value,
        targetUser
    })

    const filteredGroups = filterGroupsByRange(
        groups,
        "month",
        dom.adminHistoryMonth.value,
        dom.adminHistoryYear.value
    )

    const holidayMap = createHolidayMap(targetUser, state.allHolidays)
    const summary = calculateSummary(filteredGroups, targetUser)

    openPrintReport({
        title: "月次勤怠レポート",
        employeeName: targetUser.name || targetUser.email,
        period: dom.adminHistoryMonth.value,
        groups: filteredGroups,
        summary,
        holidayMap
    })
}

function openPrintReport({
    title,
    employeeName,
    period,
    groups,
    summary,
    holidayMap
}) {
    const reportWindow = window.open("", "_blank")

    if (!reportWindow) {
        showWarning("ポップアップがブロックされました")
        return
    }

    const rows = groups
        .slice()
        .sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)))
        .map((group) => {
            const result = calculateDailyWorkTime({
                records: group.records,
                holidayMap,
                dateKey: group.dateKey
            })

            return `
            <tr class="${escapeHtml(result.status)}">
                <td>${escapeHtml(group.dateLabel)}</td>
                <td>${escapeHtml(getRecordText(group, "出勤"))}</td>
                <td>${escapeHtml(getRecordText(group, "退勤"))}</td>
                <td>${escapeHtml(formatMinutes(result.workedMinutes))}</td>
                <td>${escapeHtml(formatMinutes(result.actualMinutes))}</td>
                <td>${escapeHtml(formatMinutes(result.breakMinutes))}</td>
                <td>${escapeHtml(formatMinutes(result.overtimeMinutes))}</td>
                <td>${escapeHtml(getStatusLabel(result.status))}</td>
            </tr>
            `
        })
        .join("")

    reportWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(title)}</title>
        <style>
            *{
                box-sizing:border-box;
            }

            body{
                font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
                padding:16px;
                color:#111827;
                background:white;
            }

            .printButton{
                margin-bottom:20px;
                padding:10px 18px;
                border:none;
                border-radius:10px;
                background:#2563eb;
                color:white;
                font-weight:700;
            }

            h1{
                font-size:20px;
                margin:0 0 6px;
            }

            .meta{
                display:grid;
                grid-template-columns:repeat(3,1fr);
                gap:8px;
                color:#475569;
                margin-bottom:12px;
                line-height:1.5;
                font-size:12px;
                border:1px solid #cbd5e1;
                border-radius:10px;
                padding:8px;
                background:#f8fafc;
            }

            .summary{
                display:grid;
                grid-template-columns:repeat(4,1fr);
                gap:6px;
                margin-bottom:12px;
            }

            .summary div{
                border:1px solid #cbd5e1;
                border-radius:10px;
                padding:4px;
                background:#f8fafc;
            }

            .summary span{
                display:block;
                font-size:12px;
                color:#64748b;
            }

            .summary strong{
                display:block;
                margin-top:3px;
                font-size:14px;
            }

            table{
                width:100%;
                border-collapse:collapse;
                font-size:8.5px;
                table-layout:fixed;
            }

            th,
            td{
                border:1px solid #cbd5e1;
                padding:4px;
                text-align:left;
                vertical-align:top;
                word-break:break-word;
            }

            th{
                background:#eff6ff;
                color:#1e3a8a;
            }

            tr.holiday,
            tr.autoHoliday{
                background:#f1f5f9;
            }

            tr.missing,
            tr.futureMissing{
                background:#fffbeb;
            }

            @page{
                size:A4 portrait;
                margin:9mm;
            }

            @media print{
                body{
                    padding:0;
                }

                .printButton{
                    display:none;
                }

                table{
                    font-size:8px;
                }

                th,
                td{
                    padding:3px;
                }
            }
        </style>
    </head>

    <body>
        <button class="printButton" onclick="window.print()">PDF保存 / 印刷</button>

        <h1>${escapeHtml(title)}</h1>

        <div class="meta">
            社員：${escapeHtml(employeeName)}<br>
            対象月：${escapeHtml(period)}
        </div>

        <div class="summary">
            <div>
                <span>総勤務時間</span>
                <strong>${escapeHtml(summary.totalWorkLabel)}</strong>
            </div>

            <div>
                <span>累計残業</span>
                <strong>${escapeHtml(summary.overtimeLabel)}</strong>
            </div>

            <div>
                <span>出勤日数</span>
                <strong>${summary.workDays}日</strong>
            </div>

            <div>
                <span>休日日数</span>
                <strong>${summary.holidays}日</strong>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>日付</th>
                    <th>出勤</th>
                    <th>退勤</th>
                    <th>総時間</th>
                    <th>実勤務</th>
                    <th>休憩</th>
                    <th>残業</th>
                    <th>状態</th>
                </tr>
            </thead>

            <tbody>
                ${rows || `
                <tr>
                    <td colspan="8">データがありません</td>
                </tr>
                `}
            </tbody>
        </table>
    </body>
    </html>
    `)

    reportWindow.document.close()
}

function getRecordText(group, type) {
    const records = group.records
        .filter((record) => record.type === type)
        .sort((a, b) => getTimeValue(a) - getTimeValue(b))

    if (records.length === 0) return "-"

    return records
        .map((record) => {
            const date = getDate(record.time)

            if (!date) return "-"

            return date.toLocaleString()
        })
        .join(" / ")
}

function getMyRecords() {
    const user = auth.currentUser

    if (!user) return []

    return state.allRecords.filter((record) => {
        return (
            record.uid === user.uid ||
            String(record.email || "").toLowerCase() ===
            String(user.email || "").toLowerCase()
        )
    })
}

function getMyDisplayName() {
    const user = auth.currentUser

    if (!user) return "社員"

    const email = String(user.email || "").toLowerCase()

    const userData = state.allUsers.find((item) => {
        return String(item.email || "").toLowerCase() === email
    })

    return userData?.name || user.email || "社員"
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

function getDate(timeValue) {
    if (timeValue && timeValue.seconds) {
        return new Date(timeValue.seconds * 1000)
    }

    if (timeValue instanceof Date) {
        return timeValue
    }

    return null
}

function getTimeValue(record) {
    const date = getDate(record.time)

    if (!date) return 0

    return date.getTime()
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}

