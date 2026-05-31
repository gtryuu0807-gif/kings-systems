import { state } from "../state.js"
import { getTimeMs } from "../utils.js"

import {
    isSameLocalDate,
    convertToDate,
    isClockOutBeforeClockIn,
    isOver24Hours,
    isSameClockMinute
} from "./time.js"

export function canDeleteRecord(targetRecord) {
    return getDeleteRestrictionMessage(targetRecord) === ""
}

export function getDeleteRestrictionMessage(targetRecord) {
    const sameUserSameDayRecords = getSameUserSameWorkDateRecords(targetRecord)
    const sets = createSetsByTypeOrder(sameUserSameDayRecords)

    const targetSetIndex = sets.findIndex((set) => {
        return (
            set.clockIn?.id === targetRecord.id ||
            set.clockOut?.id === targetRecord.id
        )
    })

    if (targetSetIndex === -1) return ""

    const targetSet = sets[targetSetIndex]
    const isClockInRecord = targetSet.clockIn?.id === targetRecord.id || targetRecord.type === "出勤"

    if (isClockInRecord && targetSet.clockOut) {
        return "同じ勤務セット内に退勤履歴があるため、出勤履歴は削除できません。先に退勤履歴を削除してください。"
    }

    const laterSetExists = sets
        .slice(targetSetIndex + 1)
        .some((set) => set.clockIn || set.clockOut)

    if (laterSetExists) {
        return "後続セットの出勤・退勤を削除してから、このセットを削除してください"
    }

    return ""
}

export function validateAttendanceSets(records) {
    const sets = createSetsByTypeOrder(records)

    const filledSets = sets.filter((set) => {
        return set.clockIn || set.clockOut
    })

    if (filledSets.length > 3) {
        return {
            ok: false,
            message: "1日の出勤・退勤は最大3セットまでです"
        }
    }

    for (const set of sets) {
        if (set.clockIn && set.clockOut) {
            if (isSameClockMinute(set.clockIn, set.clockOut)) {
                return {
                    ok: false,
                    message: "出勤時刻と同じ時刻には退勤できません。退勤時刻を変更してください"
                }
            }

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
        },
        {
            setNumber: 3,
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

    clockIns.slice(0, 3).forEach((record, index) => {
        sets[index].clockIn = record
    })

    clockOuts.slice(0, 3).forEach((record, index) => {
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
