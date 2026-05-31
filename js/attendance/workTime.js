import { auth } from "../firebase.js"

export function calculateDailyWorkTime({
    records = [],
    holidayMap = {},
    dateKey = ""
}) {
    const sortedRecords = [...records].sort((a, b) => {
        return getTimeValue(a) - getTimeValue(b)
    })

    let clockIns = sortedRecords.filter((record) => isClockInRecord(record))
    let clockOuts = sortedRecords.filter((record) => isClockOutRecord(record))

    if (sortedRecords.length > 0 && clockIns.length === 0 && clockOuts.length === 0) {
        const inferred = inferClockRecords(sortedRecords)
        clockIns = inferred.clockIns
        clockOuts = inferred.clockOuts
    }

    const hasClockIn = clockIns.length > 0
    const hasClockOut = clockOuts.length > 0

    const isRegisteredHoliday = Boolean(holidayMap[dateKey])
    const todayKey = getTodayKey()

    const isPastDate = dateKey && dateKey < todayKey

    let status = "empty"

    const hasAnyUsableRecord = sortedRecords.some((record) => getTimeValue(record) > 0)

    if (isRegisteredHoliday && !hasAnyUsableRecord) {
        status = "holiday"
    } else if (hasClockIn && hasClockOut) {
        status = "worked"
    } else if (hasClockIn || hasClockOut || hasAnyUsableRecord) {
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

function getAttendanceType(record) {
    const rawText = String(
        record?.type ??
        record?.attendanceType ??
        record?.kind ??
        record?.status ??
        record?.action ??
        record?.direction ??
        record?.clockType ??
        ""
    ).trim()

    const normalized = rawText
        .toLowerCase()
        .replace(/[\s_　-]/g, "")

    if (
        rawText === "出勤" ||
        ["clockin", "checkin", "start", "in", "punchin", "workstart", "begin", "出社", "出勤時刻"].includes(normalized) ||
        normalized.includes("clockin") ||
        normalized.includes("checkin")
    ) {
        return "出勤"
    }

    if (
        rawText === "退勤" ||
        ["clockout", "checkout", "end", "out", "punchout", "workend", "finish", "退社", "退勤時刻"].includes(normalized) ||
        normalized.includes("clockout") ||
        normalized.includes("checkout")
    ) {
        return "退勤"
    }

    return rawText
}

function isClockInRecord(record) {
    return getAttendanceType(record) === "出勤"
}

function isClockOutRecord(record) {
    return getAttendanceType(record) === "退勤"
}


function inferClockRecords(records) {
    const clockIns = []
    const clockOuts = []

    records.forEach((record, index) => {
        if (index % 2 === 0) {
            clockIns.push(record)
        } else {
            clockOuts.push(record)
        }
    })

    return { clockIns, clockOuts }
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

        // 同じ分の出勤・退勤は登録時点で禁止する。
        // 既存データに同分レコードが残っていても24時間勤務扱いにせず、0分として扱う。
        if (clockOutMinute === clockInMinute) {
            continue
        }

        // 退勤が出勤より前の時だけ夜勤の翌日退勤として扱う。
        if (clockOutMinute < clockInMinute) {
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

    return normalizeTimeToMs(
        data.time ??
        data.timestamp ??
        data.createdAt ??
        data.clockedAt ??
        data.datetime ??
        data.dateTime ??
        data.punchedAt ??
        data.workTime ??
        data
    )
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

