import { db, auth } from "../firebase.js"
import { state } from "../state.js"

import {
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { getTimeMs } from "../utils.js"

import {
    renderHistory,
    renderAdminHistory,
    updateWorkButtons
} from "../ui.js"

import { validateAttendanceSets } from "./rules.js"

import { renderAdminDashboard } from "../ui/dashboard.js"

import {
    showSuccess,
    showError,
    showWarning,
    showInfo
} from "../notify.js"

export async function createManualAttendanceSet({
    workDate,
    clockInTime,
    clockOutTime,
    targetUser = null
}) {
    return createManualAttendanceSets({
        rows: [{ workDate, clockInTime, clockOutTime }],
        targetUser
    })
}

export async function createManualAttendanceSets({
    rows = [],
    targetUser = null
}) {
    const loginUser = auth.currentUser

    if (!loginUser) {
        showError("ログインしてください")
        return false
    }

    if (targetUser && state.currentUserRole !== "admin") {
        showError("管理者のみ社員を指定できます")
        return false
    }

    const uid = targetUser?.uid || loginUser.uid
    const email = targetUser?.email || loginUser.email

    const normalizedRows = rows
        .map((row, index) => {
            return {
                index,
                workDate: String(row.workDate || "").trim(),
                clockInTime: String(row.clockInTime || "").trim(),
                clockOutTime: String(row.clockOutTime || "").trim()
            }
        })
        .filter((row) => {
            return row.workDate || row.clockInTime || row.clockOutTime
        })

    if (normalizedRows.length === 0) {
        showWarning("登録する勤怠記録を入力してください")
        return false
    }

    const newRecords = []

    for (const row of normalizedRows) {
        const rowNo = row.index + 1

        if (!row.workDate) {
            showWarning(`${rowNo}件目の日付を選択してください`)
            return false
        }

        if (!row.clockInTime && !row.clockOutTime) {
            showWarning(`${rowNo}件目は出勤時間または退勤時間を入力してください`)
            return false
        }

        if (isFutureDate(row.workDate)) {
            showWarning(`${rowNo}件目は未来の日付のため登録できません`)
            return false
        }

        const hasHoliday = state.allHolidays.some((holiday) => {
            return isSameUser(holiday, { uid, email }) && holiday.date === row.workDate
        })

        if (hasHoliday) {
            showWarning(`${rowNo}件目の日付は休み登録済みのため勤怠を追加できません`)
            return false
        }

        let clockInDate = null

        if (row.clockInTime !== "") {
            clockInDate = createLocalDateTime(row.workDate, row.clockInTime)

            if (!clockInDate) {
                showWarning(`${rowNo}件目の出勤時間が正しくありません`)
                return false
            }

            newRecords.push({
                uid,
                email,
                type: "出勤",
                time: clockInDate,
                workDate: row.workDate
            })
        }

        if (row.clockOutTime !== "") {
            let clockOutDate = createLocalDateTime(row.workDate, row.clockOutTime)

            if (!clockOutDate) {
                showWarning(`${rowNo}件目の退勤時間が正しくありません`)
                return false
            }

            const referenceClockIn = clockInDate || findLatestClockInForWorkDate({
                records: [...state.allRecords, ...newRecords].filter((record) => {
                    return isSameUser(record, { uid, email })
                }),
                workDate: row.workDate
            })

            if (
                referenceClockIn &&
                clockOutDate.getTime() <= referenceClockIn.getTime()
            ) {
                clockOutDate.setDate(clockOutDate.getDate() + 1)
            }

            newRecords.push({
                uid,
                email,
                type: "退勤",
                time: clockOutDate,
                workDate: row.workDate
            })
        }
    }

    const sameUserRecords = state.allRecords.filter((record) => {
        return isSameUser(record, { uid, email })
    })

    const targetDates = [...new Set(normalizedRows.map((row) => row.workDate))]

    for (const dateValue of targetDates) {
        const sameDayRecords = sameUserRecords.filter((record) => {
            return isSameWorkDate(record, dateValue)
        })

        const newSameDayRecords = newRecords.filter((record) => {
            return record.workDate === dateValue
        })

        const clockInCount =
            sameDayRecords.filter((record) => record.type === "出勤").length +
            newSameDayRecords.filter((record) => record.type === "出勤").length

        const clockOutCount =
            sameDayRecords.filter((record) => record.type === "退勤").length +
            newSameDayRecords.filter((record) => record.type === "退勤").length

        if (clockInCount > 3 || clockOutCount > 3) {
            showWarning(`${formatDateLabel(dateValue)} の出勤・退勤は最大3セットまでです`)
            return false
        }

        const validateResult = validateAttendanceSets([
            ...sameDayRecords,
            ...newSameDayRecords
        ])

        if (!validateResult.ok) {
            showWarning(`${formatDateLabel(dateValue)}：${validateResult.message}`)
            return false
        }
    }

    showInfo(
        normalizedRows.length === 1
            ? "勤怠記録を追加中..."
            : "勤怠記録をまとめて追加中..."
    )

    try {
        const addedRecords = []

        for (const record of newRecords) {
            const now = new Date()

            const docRef = await addDoc(collection(db, "attendance"), {
                uid: record.uid,
                email: record.email,
                type: record.type,
                time: record.time,
                workDate: record.workDate || "",
                version: 1,
                updatedAt: now
            })

            addedRecords.push({
                id: docRef.id,
                uid: record.uid,
                email: record.email,
                type: record.type,
                time: record.time,
                workDate: record.workDate || "",
                version: 1,
                updatedAt: now
            })
        }

        state.allRecords.unshift(...addedRecords)

        state.allRecords.sort((a, b) => {
            return getTimeMs(b) - getTimeMs(a)
        })

        state.currentPage = 0
        state.adminCurrentPage = 0

        refreshAfterManualAdd()

        showSuccess(
            normalizedRows.length === 1
                ? "勤怠記録を追加しました"
                : `${normalizedRows.length}件の勤怠記録を追加しました`
        )

        return true

    } catch (error) {
        console.log(error)
        showError("勤怠記録の追加に失敗しました")
        return false
    }
}


function createLocalDateTime(dateValue, timeValue) {
    const date = new Date(`${dateValue}T${timeValue}`)

    if (isNaN(date.getTime())) return null

    return date
}

function findLatestClockInForWorkDate({ records, workDate }) {
    const clockIns = records
        .filter((record) => {
            return record.type === "出勤" && isSameWorkDate(record, workDate)
        })
        .sort((a, b) => {
            return getTimeMs(b) - getTimeMs(a)
        })

    const latestClockIn = clockIns[0]

    if (!latestClockIn) return null

    return getDate(latestClockIn.time)
}

function refreshAfterManualAdd() {
    renderHistory()

    if (state.currentUserRole === "admin") {
        renderAdminHistory()
        renderAdminDashboard()
    }

    updateWorkButtons()
}

function isFutureDate(dateValue) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const target = new Date(`${dateValue}T00:00`)

    if (isNaN(target.getTime())) return false

    return target.getTime() > today.getTime()
}

function formatDateLabel(dateValue) {
    const [year, month, day] = String(dateValue || "").split("-")

    if (!year || !month || !day) return dateValue

    return `${Number(month)}/${Number(day)}`
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

function isSameWorkDate(record, workDate) {
    if (record.workDate) {
        return record.workDate === workDate
    }

    const date = getDate(record.time)

    if (!date) return false

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}` === workDate
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
