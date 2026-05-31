import { state } from "../state.js"

export function groupMyAttendanceByDate(records, options = {}) {
    return groupAttendanceByUserAndWorkDate(records, false, options)
}

export function groupAdminAttendanceByUserAndDate(records, options = {}) {
    return groupAttendanceByUserAndWorkDate(records, true, options)
}

function groupAttendanceByUserAndWorkDate(records, isAdmin, options = {}) {
    const groups = {}
    const sortedRecords = [...records].sort((a, b) => {
        return getTimeValue(a) - getTimeValue(b)
    })

    sortedRecords.forEach((record) => {
        const sameUserRecords = sortedRecords.filter((item) => {
            return isSameUser(item, record)
        })

        const dateKey = getWorkDateKey(record, sameUserRecords)
        const userKey = String(record.email || record.uid || "unknown").toLowerCase()
        const groupKey = isAdmin ? `${userKey}_${dateKey}` : dateKey

        if (!groups[groupKey]) {
            groups[groupKey] = createGroup({
                groupKey,
                userKey,
                uid: record.uid || "",
                email: record.email || "",
                dateKey,
                displayName: getDisplayName(record),
                sortTime: getTimeValue(record)
            })
        }

        groups[groupKey].records.push(record)

        groups[groupKey].sortTime = Math.max(
            groups[groupKey].sortTime,
            getTimeValue(record)
        )
    })

    addHolidayOnlyGroups(groups, records, isAdmin)
    addEmptyDateGroups(groups, records, isAdmin, options)

    Object.values(groups).forEach((group) => {
        group.sets = createAttendanceSets(group.records)
    })

    return Object.values(groups).sort((a, b) => {
        return String(b.dateKey).localeCompare(String(a.dateKey))
    })
}

function createGroup({
    groupKey,
    userKey,
    uid,
    email,
    dateKey,
    displayName,
    sortTime
}) {
    return {
        groupKey,
        userKey,
        uid,
        email,
        dateKey,
        dateLabel: formatDateLabelByKey(dateKey),
        displayName,
        records: [],
        sets: [],
        sortTime
    }
}

function addHolidayOnlyGroups(groups, records, isAdmin) {
    state.allHolidays.forEach((holiday) => {
        if (!holiday.date) return
        if (!shouldIncludeHoliday(holiday, records, isAdmin)) return

        const userKey = String(holiday.email || holiday.uid || "unknown").toLowerCase()
        const groupKey = isAdmin ? `${userKey}_${holiday.date}` : holiday.date

        if (groups[groupKey]) return

        groups[groupKey] = createGroup({
            groupKey,
            userKey,
            uid: holiday.uid || "",
            email: holiday.email || "",
            dateKey: holiday.date,
            displayName: getDisplayName(holiday),
            sortTime: dateKeyToTime(holiday.date)
        })
    })
}

function addEmptyDateGroups(groups, records, isAdmin, options) {
    const rangeType = options.rangeType || "month"
    const monthValue = options.monthValue || ""
    const yearValue = options.yearValue || ""
    const targetUser = options.targetUser || null

    const dateKeys = createDateKeysByRange(
        rangeType,
        monthValue,
        yearValue
    )

    if (dateKeys.length === 0) return

    if (isAdmin && !targetUser) return

    const baseUser = isAdmin
        ? targetUser
        : getBaseUserFromRecordsOrHoliday(records)

    if (!baseUser) return

    const userKey = String(baseUser.email || baseUser.uid || "unknown").toLowerCase()

    dateKeys.forEach((dateKey) => {
        const groupKey = isAdmin ? `${userKey}_${dateKey}` : dateKey

        if (groups[groupKey]) return

        groups[groupKey] = createGroup({
            groupKey,
            userKey,
            uid: baseUser.uid || "",
            email: baseUser.email || "",
            dateKey,
            displayName: getDisplayName(baseUser),
            sortTime: dateKeyToTime(dateKey)
        })
    })
}

function getBaseUserFromRecordsOrHoliday(records) {
    if (records.length > 0) {
        return {
            uid: records[0].uid || "",
            email: records[0].email || ""
        }
    }

    if (state.allHolidays.length > 0) {
        return {
            uid: state.allHolidays[0].uid || "",
            email: state.allHolidays[0].email || ""
        }
    }

    return null
}

export function createDateKeysByRange(rangeType, monthValue, yearValue) {
    if (rangeType === "year") {
        const year = Number(yearValue)

        if (!year) return []

        const result = []

        for (let month = 0; month < 12; month++) {
            const lastDay = new Date(year, month + 1, 0).getDate()

            for (let day = 1; day <= lastDay; day++) {
                result.push(formatDateKey(year, month + 1, day))
            }
        }

        return result
    }

    if (!monthValue) return []

    const [yearText, monthText] = monthValue.split("-")
    const year = Number(yearText)
    const month = Number(monthText)

    if (!year || !month) return []

    const lastDay = new Date(year, month, 0).getDate()
    const result = []

    for (let day = 1; day <= lastDay; day++) {
        result.push(formatDateKey(year, month, day))
    }

    return result
}

function shouldIncludeHoliday(holiday, records, isAdmin) {
    if (isAdmin) {
        if (records.length === 0) return true

        return records.some((record) => {
            return isSameUser(record, holiday)
        })
    }

    if (records.length === 0) return true

    return records.some((record) => {
        return isSameUser(record, holiday)
    })
}

export function createAttendanceSets(records) {
    const sets = [
        {
            setNumber: 1,
            clockIn: null,
            clockOut: null
        },
        {
            setNumber: 2,
            clockIn: null,
            clockOut: null
        },
        {
            setNumber: 3,
            clockIn: null,
            clockOut: null
        }
    ]

    const sortedRecords = [...records].sort((a, b) => {
        return getTimeValue(a) - getTimeValue(b)
    })

    let currentSetIndex = 0

    sortedRecords.forEach((record) => {
        if (record.type === "出勤") {
            const targetSet = sets[currentSetIndex]

            if (!targetSet.clockIn) {
                targetSet.clockIn = record
                return
            }

            if (
                targetSet.clockIn &&
                targetSet.clockOut &&
                currentSetIndex < 2
            ) {
                currentSetIndex++

                if (!sets[currentSetIndex].clockIn) {
                    sets[currentSetIndex].clockIn = record
                }

                return
            }

            if (currentSetIndex < 2) {
                currentSetIndex++
                sets[currentSetIndex].clockIn = record
            }

            return
        }

        if (record.type === "退勤") {
            const targetSet = sets[currentSetIndex]

            if (!targetSet.clockOut) {
                targetSet.clockOut = record

                if (targetSet.clockIn && currentSetIndex < 2) {
                    currentSetIndex++
                }

                return
            }

            if (currentSetIndex < 2) {
                currentSetIndex++

                if (!sets[currentSetIndex].clockOut) {
                    sets[currentSetIndex].clockOut = record
                }
            }
        }
    })

    return sets
}

export function getVisibleSets(sets) {
    const firstSet = sets[0] || {
        setNumber: 1,
        clockIn: null,
        clockOut: null
    }

    const result = [firstSet]

    sets.slice(1, 3).forEach((set) => {
        if (set && (set.clockIn || set.clockOut)) {
            result.push(set)
        }
    })

    return result
}

function getWorkDateKey(record, records) {
    if (record.workDate) {
        return record.workDate
    }

    if (record.type === "出勤") {
        return getDateKey(record)
    }

    const relatedClockIn = findRelatedClockIn(record, records)

    if (relatedClockIn) {
        return getDateKey(relatedClockIn)
    }

    return getDateKey(record)
}

function findRelatedClockIn(clockOutRecord, records) {
    const sortedRecords = [...records].sort((a, b) => {
        return getTimeValue(a) - getTimeValue(b)
    })

    if (clockOutRecord.workDate) {
        const sameWorkDateClockIns = sortedRecords.filter((record) => {
            return (
                record.type === "出勤" &&
                getWorkDateKey(record, records) === clockOutRecord.workDate
            )
        })

        if (sameWorkDateClockIns.length > 0) {
            return sameWorkDateClockIns[sameWorkDateClockIns.length - 1]
        }
    }

    const clockOutTime = getTimeValue(clockOutRecord)

    const beforeClockIns = sortedRecords.filter((record) => {
        return (
            record.type === "出勤" &&
            getTimeValue(record) <= clockOutTime
        )
    })

    return beforeClockIns[beforeClockIns.length - 1] || null
}

function getDisplayName(record) {
    const email = String(record.email || "").toLowerCase()

    const userData = state.allUsers.find((user) => {
        return user.email === email
    })

    return userData?.name || record.email || "不明ユーザー"
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

function getDateKey(data) {
    const date = getDateFromRecord(data)

    if (!date) return "unknown"

    return formatDateKey(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
    )
}

function formatDateKey(year, month, day) {
    return [
        year,
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0")
    ].join("-")
}

function formatDateLabelByKey(dateKey) {
    if (!dateKey || dateKey === "unknown") return "日付不明"

    const parts = dateKey.split("-")

    if (parts.length !== 3) return "日付不明"

    const date = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    )

    return date.toLocaleDateString()
}

function dateKeyToTime(dateKey) {
    if (!dateKey || dateKey === "unknown") return 0

    const parts = dateKey.split("-")

    if (parts.length !== 3) return 0

    return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    ).getTime()
}

export function toDateTimeLocalValue(data) {
    const timeMs = getTimeValue(data)

    if (!timeMs) return ""

    const date = new Date(timeMs)
    const offset = date.getTimezoneOffset()
    const localDate = new Date(date.getTime() - offset * 60000)

    return localDate.toISOString().slice(0, 16)
}

function getDateFromRecord(data) {
    const timeMs = getTimeValue(data)

    if (!timeMs) return null

    return new Date(timeMs)
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

