import { dom } from "../dom.js"
import { state } from "../state.js"
import { escapeHtml } from "../utils.js"

export function renderAdminDashboard() {
    const todayKey = getTodayKey()

    const todayRecords = state.allRecords.filter((record) => {
        return getDateKey(record.time) === todayKey
    })

    const todayHolidays = state.allHolidays.filter((holiday) => {
        return holiday.date === todayKey
    })

    const employeeStatuses = state.allUsers.map((user) => {
        return getTodayEmployeeStatus(user, todayRecords, todayHolidays)
    })

    const attendanceCount = employeeStatuses.filter((item) => {
        return item.status === "working" || item.status === "left"
    }).length

    const notClockedOutCount = employeeStatuses.filter((item) => {
        return item.status === "working"
    }).length

    const overtimeWarningCount = employeeStatuses.filter((item) => {
        return item.isOvertimeWarning
    }).length

    dom.adminDashboard.innerHTML = `
    <div class="dashboardCard">
        <span>今日の出勤人数</span>
        <strong>${attendanceCount}人</strong>
    </div>

    <div class="dashboardCard">
        <span>未退勤人数</span>
        <strong>${notClockedOutCount}人</strong>
    </div>

    <div class="dashboardCard">
        <span>残業警告人数</span>
        <strong>${overtimeWarningCount}人</strong>
    </div>
    `

    renderTodayEmployeeStatusList(employeeStatuses)
}

function renderTodayEmployeeStatusList(employeeStatuses) {
    if (!dom.todayEmployeeStatusList) return

    if (employeeStatuses.length === 0) {
        dom.todayEmployeeStatusList.innerHTML = `
        <div class="todayEmployeeEmpty">
            社員情報がありません
        </div>
        `
        return
    }

    dom.todayEmployeeStatusList.innerHTML = employeeStatuses
        .map((item) => {
            return `
            <div class="todayEmployeeStatusItem">
                <div class="todayEmployeeName">
                    ${escapeHtml(item.name)}
                </div>

                <div class="todayEmployeeBadge ${item.className}">
                    ${escapeHtml(item.label)}
                </div>
            </div>
            `
        })
        .join("")
}

function getTodayEmployeeStatus(user, todayRecords, todayHolidays) {
    const userRecords = todayRecords
        .filter((record) => {
            return isSameUser(record, user)
        })
        .sort((a, b) => {
            return getTimeValue(a.time) - getTimeValue(b.time)
        })

    const userHoliday = todayHolidays.find((holiday) => {
        return isSameUser(holiday, user)
    })

    const clockIns = userRecords.filter((record) => {
        return record.type === "出勤"
    })

    const clockOuts = userRecords.filter((record) => {
        return record.type === "退勤"
    })

    const hasClockIn = clockIns.length > 0
    const hasClockOut = clockOuts.length > 0

    const latestClockIn = clockIns[clockIns.length - 1]
    const latestClockOut = clockOuts[clockOuts.length - 1]

    const isWorking =
        latestClockIn &&
        (
            !latestClockOut ||
            getTimeValue(latestClockIn.time) > getTimeValue(latestClockOut.time)
        )

    const isOvertimeWarning =
        isWorking &&
        Date.now() - getTimeValue(latestClockIn.time) > 8 * 60 * 60 * 1000

    if (userHoliday) {
        return createStatus(user, "休み", "statusRest", false)
    }

    if (isWorking) {
        return createStatus(user, "出勤中", "statusWorking", isOvertimeWarning)
    }

    if (hasClockIn && hasClockOut) {
        return createStatus(user, "退勤済み", "statusLeft", false)
    }

    if (shouldAutoRestToday()) {
        return createStatus(user, "休み", "statusRest", false)
    }

    return createStatus(user, "未出勤", "statusNotYet", false)
}

function createStatus(user, label, className, isOvertimeWarning) {
    return {
        name: user.name || user.email || "名前未設定",
        email: user.email || "",
        label,
        className,
        isOvertimeWarning
    }
}

function shouldAutoRestToday() {
    const now = new Date()
    const borderTime = new Date()

    borderTime.setHours(10, 0, 0, 0)

    return now.getTime() >= borderTime.getTime()
}

function getTodayKey() {
    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
}

function getDateKey(timeValue) {
    const date = getDate(timeValue)

    if (!date) return ""

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
}

function getDate(timeValue) {
    if (timeValue?.seconds) {
        return new Date(timeValue.seconds * 1000)
    }

    if (timeValue instanceof Date) {
        return timeValue
    }

    return null
}

function getTimeValue(timeValue) {
    const date = getDate(timeValue)

    if (!date) return 0

    return date.getTime()
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

