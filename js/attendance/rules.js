import { state } from "../state.js"
import { getTimeMs } from "../utils.js"

import {
    isSameLocalDate,
    convertToDate,
    isClockOutBeforeClockIn,
    isOver24Hours
} from "./time.js"

export function canDeleteRecord(targetRecord) {
    const sameUserSameDayRecords = getSameUserSameWorkDateRecords(targetRecord)
    const sets = createSetsByTypeOrder(sameUserSameDayRecords)

    const targetSetIndex = sets.findIndex((set) => {
        return (
            set.clockIn?.id === targetRecord.id ||
            set.clockOut?.id === targetRecord.id
        )
    })

    if (targetSetIndex === -1) return true

    const secondSet = sets[1]

    const secondSetExists =
        secondSet &&
        (secondSet.clockIn || secondSet.clockOut)

    if (targetSetIndex === 0 && secondSetExists) {
        return false
    }

    return true
}

export function validateAttendanceSets(records) {
    const sets = createSetsByTypeOrder(records)

    const filledSets = sets.filter((set) => {
        return set.clockIn || set.clockOut
    })

    if (filledSets.length > 2) {
        return {
            ok: false,
            message: "1日の出勤・退勤は最大2セットまでです"
        }
    }

    for (const set of sets) {
        if (set.clockIn && set.clockOut) {
            if (isClockOutBeforeClockIn(set.clockIn, set.clockOut)) {
                return {
                    ok: false,
                    message: "退勤時間は出勤時間より後にしてください"
                }
            }

            if (isOver24Hours(set.clockIn, set.clockOut)) {
                return {
                    ok: false,
                    message: "勤務時間は最大24時間以内にしてください"
                }
            }
        }
    }

    return {
        ok: true,
        message: ""
    }
}

export function createSetsByTypeOrder(records) {
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
        }
    ]

    const sortedRecords = [...records].sort((a, b) => {
        return getTimeMs(a) - getTimeMs(b)
    })

    const clockIns = sortedRecords.filter((record) => {
        return record.type === "出勤"
    })

    const clockOuts = sortedRecords.filter((record) => {
        return record.type === "退勤"
    })

    clockIns.slice(0, 2).forEach((record, index) => {
        sets[index].clockIn = record
    })

    clockOuts.slice(0, 2).forEach((record, index) => {
        sets[index].clockOut = record
    })

    return sets
}

function getSameUserSameWorkDateRecords(targetRecord) {
    return state.allRecords.filter((record) => {
        const sameEmail =
            String(record.email || "").toLowerCase() ===
            String(targetRecord.email || "").toLowerCase()

        const sameUid =
            record.uid &&
            targetRecord.uid &&
            record.uid === targetRecord.uid

        return (
            (sameEmail || sameUid) &&
            isSameLocalDate(record.time, convertToDate(targetRecord.time))
        )
    })
}
