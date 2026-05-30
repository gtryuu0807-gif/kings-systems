import { getTimeMs } from "../utils.js"
import { getMyRecords } from "../data.js"

export const MAX_WORK_MS = 24 * 60 * 60 * 1000

export function getLatestMyRecord() {
    const records = [...getMyRecords()].sort((a, b) => {
        return getTimeMs(b) - getTimeMs(a)
    })

    return records[0] || null
}

export function isSameLocalDate(timeValue, targetDate) {
    const date = convertToDate(timeValue)

    if (!date || !targetDate) return false

    return (
        date.getFullYear() === targetDate.getFullYear() &&
        date.getMonth() === targetDate.getMonth() &&
        date.getDate() === targetDate.getDate()
    )
}

export function convertToDate(timeValue) {
    if (timeValue && timeValue.seconds) {
        return new Date(timeValue.seconds * 1000)
    }

    if (timeValue instanceof Date) {
        return timeValue
    }

    return null
}

export function getTimeValue(data) {
    if (data.time && data.time.seconds) {
        return data.time.seconds * 1000
    }

    if (data.time instanceof Date) {
        return data.time.getTime()
    }

    return 0
}

export function isOver24Hours(clockIn, clockOut) {
    const inDate = convertToDate(clockIn?.time)
    const outDate = convertToDate(clockOut?.time)

    if (!inDate || !outDate) return false

    return outDate.getTime() - inDate.getTime() > MAX_WORK_MS
}

export function isClockOutBeforeClockIn(clockIn, clockOut) {
    const inDate = convertToDate(clockIn?.time)
    const outDate = convertToDate(clockOut?.time)

    if (!inDate || !outDate) return false

    return outDate.getTime() < inDate.getTime()
}
