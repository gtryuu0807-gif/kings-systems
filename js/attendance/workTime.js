import { auth } from "../firebase.js"

export function calculateDailyWorkTime({
    records = [],
    holidayMap = {},
    dateKey = ""
}) {
    const sortedRecords = [...records].sort((a, b) => {
        return getTimeValue(a) - getTimeValue(b)
    })

    const clockIns = sortedRecords.filter((record) => record.type === "出勤")
    const clockOuts = sortedRecords.filter((record) => record.type === "退勤")

    const hasClockIn = clockIns.length > 0
    const hasClockOut = clockOuts.length > 0

    const isRegisteredHoliday = Boolean(holidayMap[dateKey])
    const todayKey = getTodayKey()

    const isPastDate = dateKey && dateKey < todayKey

    let status = "empty"

    if (isRegisteredHoliday) {
        status = "holiday"
    } else if (hasClockIn && hasClockOut) {
        status = "worked"
    } else if (hasClockIn || hasClockOut) {
        status = "missing"
    } else if (isPastDate) {
        status = "autoHoliday"
    } else {
        status = "futureMissing"
    }

    const workedMinutes = calculateWorkedMinutes(clockIns, clockOuts)
    const breakMinutes = calculateBreakMinutes(workedMinutes)
    const actualMinutes = Math.max(workedMinutes - breakMinutes, 0)
    const overtimeMinutes = Math.max(actualMinutes - 480, 0)

    const holidayCount =
        status === "holiday" || status === "autoHoliday"
            ? 1
            : 0

    return {
        status,
        workedMinutes,
        breakMinutes,
        actualMinutes,
        overtimeMinutes,
        holidayCount,
        hasClockIn,
        hasClockOut,
        isRegisteredHoliday,
        isPastDate
    }
}

export function createHolidayMap(targetUser = null, holidays = []) {
    const map = {}

    const loginUser = auth.currentUser

    holidays.forEach((holiday) => {
        if (!holiday?.date) return

        if (targetUser) {
            if (!isSameUser(holiday, targetUser)) return
        } else {
            if (!loginUser) return

            if (!isSameUser(holiday, {
                uid: loginUser.uid,
                email: loginUser.email
            })) {
                return
            }
        }

        map[holiday.date] = true
    })

    return map
}

export function formatMinutes(minutes) {
    const safeMinutes = Math.max(0, Number(minutes) || 0)
    const hour = Math.floor(safeMinutes / 60)
    const minute = safeMinutes % 60

    return `${hour}時間${minute}分`
}

function calculateWorkedMinutes(clockIns, clockOuts) {
    let total = 0

    const max = Math.max(clockIns.length, clockOuts.length)

    for (let index = 0; index < max; index++) {
        const clockIn = clockIns[index]
        const clockOut = clockOuts[index]

        if (!clockIn || !clockOut) continue

        const clockInMinute = getMinuteValue(clockIn)
        let clockOutMinute = getMinuteValue(clockOut)

        if (!clockInMinute || !clockOutMinute) continue

        // 画面では秒を表示しないため、勤務時間も「表示されている分」単位で計算する。
        // 例：08:09:50 → 08:10:05 は、表示上 08:09 → 08:10 なので 1分として扱う。
        // これにより、入力済みなのに総勤務 0時間0分に見える不自然さを防ぐ。
        if (clockOutMinute <= clockInMinute) {
            clockOutMinute += 24 * 60 * 60000
        }

        const diff = clockOutMinute - clockInMinute

        if (diff <= 0) continue

        total += Math.floor(diff / 60000)
    }

    return total
}

function calculateBreakMinutes(workedMinutes) {
    if (workedMinutes > 480) {
        return 60
    }

    if (workedMinutes > 360) {
        return 45
    }

    return 0
}

function getTodayKey() {
    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
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

export function getTimeValue(data) {
    if (!data) return 0

    return normalizeTimeToMs(data.time ?? data)
}

function getMinuteValue(data) {
    const timeMs = getTimeValue(data)

    if (!timeMs) return 0

    return Math.floor(timeMs / 60000) * 60000
}

function normalizeTimeToMs(value) {
    if (!value) return 0

    if (typeof value === "number") return value

    if (value instanceof Date) return value.getTime()

    if (typeof value === "string") {
        const date = new Date(value)
        return isNaN(date.getTime()) ? 0 : date.getTime()
    }

    if (typeof value.toMillis === "function") {
        return value.toMillis()
    }

    if (typeof value.toDate === "function") {
        return value.toDate().getTime()
    }

    if (typeof value.seconds === "number") {
        return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000)
    }

    return 0
}

