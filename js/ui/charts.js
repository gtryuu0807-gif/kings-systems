import { dom } from "../dom.js"
import { state } from "../state.js"
import { getMyRecords } from "../data.js"

import {
    groupMyAttendanceByDate,
    groupAdminAttendanceByUserAndDate
} from "./attendanceGroups.js"

import {
    calculateDailyWorkTime,
    createHolidayMap
} from "../attendance/workTime.js"

import {
    filterGroupsByRange
} from "./summary.js"

export function renderMyWorkChart() {
    const groups = groupMyAttendanceByDate(getMyRecords(), {
        rangeType: dom.myHistoryRangeType?.value,
        monthValue: dom.myHistoryMonth?.value,
        yearValue: dom.myHistoryYear?.value
    })

    const filteredGroups = filterGroupsByRange(
        groups,
        dom.myHistoryRangeType?.value,
        dom.myHistoryMonth?.value,
        dom.myHistoryYear?.value
    )

    const holidayMap = createHolidayMap(null, state.allHolidays)

    resizeCanvas(dom.myWorkChart, filteredGroups.length)
    drawWorkChart(dom.myWorkChart, filteredGroups, holidayMap)
}

export function renderAdminWorkChart() {
    const targetUser = getSelectedAdminUser()

    if (!targetUser) {
        if (dom.adminChartPlaceholder) dom.adminChartPlaceholder.classList.add("show")
        if (dom.adminWorkChart) dom.adminWorkChart.style.display = "none"
        resizeCanvas(dom.adminWorkChart, 1)
        clearCanvas(dom.adminWorkChart, "")
        return
    }

    if (dom.adminChartPlaceholder) dom.adminChartPlaceholder.classList.remove("show")
    if (dom.adminWorkChart) dom.adminWorkChart.style.display = "block"

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

    const holidayMap = createHolidayMap(targetUser, state.allHolidays)

    resizeCanvas(dom.adminWorkChart, filteredGroups.length)
    drawWorkChart(dom.adminWorkChart, filteredGroups, holidayMap)
}

function resizeCanvas(canvas, itemCount = 0) {
    if (!canvas) return

    const parent = canvas.parentElement
    const chartBox = canvas.closest(".chartBox")
    const visibleWidth = Math.max(
        280,
        (parent?.clientWidth || chartBox?.clientWidth || 360) - 24
    )

    const isSmallScreen = window.innerWidth <= 640
    const itemWidth = isSmallScreen ? 42 : 30
    const minWidth = isSmallScreen
        ? Math.max(visibleWidth, 130 + itemCount * itemWidth)
        : visibleWidth

    canvas.width = Math.ceil(minWidth)
    canvas.height = isSmallScreen ? 340 : 270

    canvas.style.width = `${canvas.width}px`
    canvas.style.height = `${canvas.height}px`
}

function drawWorkChart(canvas, groups, holidayMap) {
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    if (groups.length === 0) {
        drawEmptyText(ctx, width, height, "表示できるデータがありません")
        return
    }

    const chartData = groups
        .slice()
        .sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)))
        .map((group) => {
            const result = calculateDailyWorkTime({
                records: group.records,
                holidayMap,
                dateKey: group.dateKey
            })

            return {
                label: formatShortDate(group.dateKey),
                workHours: result.actualMinutes / 60,
                overtimeHours: result.overtimeMinutes / 60,
                status: result.status
            }
        })

    const paddingLeft = 42
    const paddingRight = 24
    const paddingTop = 56
    const paddingBottom = 46

    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom

    const maxHours = Math.max(
        10,
        ...chartData.map((item) => item.workHours)
    )

    drawLegend(ctx)
    drawAxis(ctx, {
        paddingLeft,
        paddingTop,
        paddingBottom,
        chartWidth,
        chartHeight,
        height,
        maxHours
    })

    const slotWidth = chartWidth / chartData.length
    const barWidth = Math.max(
        12,
        Math.min(28, slotWidth * 0.62)
    )

    chartData.forEach((item, index) => {
        const x =
            paddingLeft +
            index * slotWidth +
            (slotWidth - barWidth) / 2

        const baseY = height - paddingBottom

        if (
            item.status === "holiday" ||
            item.status === "autoHoliday"
        ) {
            drawMarkerBar(ctx, {
                x,
                y: baseY - 14,
                width: barWidth,
                height: 14,
                color: "#94a3b8"
            })

        } else if (
            item.status === "missing" ||
            item.status === "futureMissing"
        ) {
            drawMarkerBar(ctx, {
                x,
                y: baseY - 14,
                width: barWidth,
                height: 14,
                color: "#f59e0b"
            })

        } else {
            const barHeight =
                maxHours > 0
                    ? (item.workHours / maxHours) * chartHeight
                    : 0

            const y = baseY - barHeight

            ctx.fillStyle = "#2563eb"
            roundRect(ctx, x, y, barWidth, barHeight, 6)
            ctx.fill()

            if (item.overtimeHours > 0) {
                ctx.fillStyle = "#dc2626"
                ctx.beginPath()
                ctx.arc(x + barWidth / 2, y - 7, 4, 0, Math.PI * 2)
                ctx.fill()
            }
        }

        ctx.fillStyle = "#64748b"
        ctx.font = "10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(item.label, x + barWidth / 2, height - 18)
    })
}

function formatShortDate(dateKey) {
    const parts = String(dateKey || "").split("-")

    if (parts.length === 3) {
        return `${Number(parts[1])}/${Number(parts[2])}`
    }

    return String(dateKey || "")
}

function drawMarkerBar(ctx, {
    x,
    y,
    width,
    height,
    color
}) {
    ctx.fillStyle = color
    roundRect(ctx, x, y, width, height, 5)
    ctx.fill()
}

function drawAxis(ctx, {
    paddingLeft,
    paddingTop,
    paddingBottom,
    chartWidth,
    chartHeight,
    height,
    maxHours
}) {
    const baseY = height - paddingBottom

    ctx.strokeStyle = "#cbd5e1"
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.moveTo(paddingLeft, baseY)
    ctx.lineTo(paddingLeft + chartWidth, baseY)
    ctx.stroke()

    const eightHourY =
        baseY -
        (8 / maxHours) * chartHeight

    ctx.strokeStyle = "#dc2626"
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(paddingLeft, eightHourY)
    ctx.lineTo(paddingLeft + chartWidth, eightHourY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = "#dc2626"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("8時間", paddingLeft + 4, eightHourY - 4)

    ctx.fillStyle = "#64748b"
    ctx.font = "11px sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("実勤務時間", paddingLeft, paddingTop - 14)
}

function drawLegend(ctx) {
    const items = [
        { label: "勤務", color: "#2563eb" },
        { label: "休み", color: "#94a3b8" },
        { label: "未打刻", color: "#f59e0b" },
        { label: "残業", color: "#dc2626" }
    ]

    let x = 36
    const y = 24

    items.forEach((item) => {
        ctx.fillStyle = item.color

        if (item.label === "残業") {
            ctx.beginPath()
            ctx.arc(x + 5, y + 5, 5, 0, Math.PI * 2)
            ctx.fill()
        } else {
            ctx.fillRect(x, y, 10, 10)
        }

        ctx.fillStyle = "#334155"
        ctx.font = "11px sans-serif"
        ctx.textAlign = "left"
        ctx.fillText(item.label, x + 14, y + 9)

        x += item.label === "未打刻" ? 74 : 58
    })
}

function drawEmptyText(ctx, width, height, text) {
    ctx.fillStyle = "#64748b"
    ctx.font = "14px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(text, width / 2, height / 2)
}

function clearCanvas(canvas, text) {
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    drawEmptyText(
        ctx,
        canvas.width,
        canvas.height,
        text || "表示できるデータがありません"
    )
}

function roundRect(ctx, x, y, width, height, radius) {
    const safeHeight = Math.max(0, height)
    const safeRadius = Math.min(radius, Math.max(0, width / 2), Math.max(0, safeHeight / 2))

    ctx.beginPath()
    ctx.moveTo(x + safeRadius, y)
    ctx.lineTo(x + width - safeRadius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
    ctx.lineTo(x + width, y + safeHeight)
    ctx.lineTo(x, y + safeHeight)
    ctx.lineTo(x, y + safeRadius)
    ctx.quadraticCurveTo(x, y, x + safeRadius, y)
    ctx.closePath()
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
