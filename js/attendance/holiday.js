import { db, auth } from "../firebase.js"
import { state } from "../state.js"

import {
    collection,
    addDoc,
    getDocs,
    query,
    doc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {
    renderHistory,
    renderAdminHistory
} from "../ui.js"

import {
    renderMySummary,
    renderAdminSummary
} from "../ui/summary.js"

import {
    renderMyWorkChart,
    renderAdminWorkChart
} from "../ui/charts.js"

import {
    renderAdminDashboard
} from "../ui/dashboard.js"

import {
    showSuccess,
    showError,
    showWarning,
    showInfo
} from "../notify.js"

export async function addHoliday(dateValue, targetUser = null) {
    return addHolidays([dateValue], targetUser)
}

export async function addHolidays(dateValues = [], targetUser = null) {
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

    const normalizedDates = dateValues
        .map((dateValue, index) => {
            return {
                index,
                date: String(dateValue || "").trim()
            }
        })
        .filter((item) => item.date)

    if (normalizedDates.length === 0) {
        showWarning("休みにする日付を選択してください")
        return false
    }

    const duplicateInInput = normalizedDates.find((item, index) => {
        return normalizedDates.findIndex((other) => other.date === item.date) !== index
    })

    if (duplicateInInput) {
        showWarning(`${duplicateInInput.index + 1}件目の日付が重複しています`)
        return false
    }

    for (const item of normalizedDates) {
        const rowNo = item.index + 1

        if (isFutureDate(item.date)) {
            showWarning(`${rowNo}件目は未来の日付のため登録できません`)
            return false
        }

        const hasAttendance = state.allRecords.some((record) => {
            return (
                isSameUser(record, { uid, email }) &&
                isSameWorkDate(record, item.date)
            )
        })

        if (hasAttendance) {
            showWarning(`${rowNo}件目は勤怠記録があるため休み登録できません`)
            return false
        }

        const exists = state.allHolidays.some((holiday) => {
            return (
                isSameUser(holiday, { uid, email }) &&
                holiday.date === item.date
            )
        })

        if (exists) {
            showWarning(`${rowNo}件目はすでに休み登録されています`)
            return false
        }
    }

    showInfo(
        normalizedDates.length === 1
            ? "休みを登録中..."
            : "休みをまとめて登録中..."
    )

    try {
        const addedHolidays = []

        for (const item of normalizedDates) {
            const now = new Date()

            const docRef = await addDoc(collection(db, "holidays"), {
                uid,
                email,
                date: item.date,
                createdAt: now,
                updatedAt: now
            })

            addedHolidays.push({
                id: docRef.id,
                uid,
                email,
                date: item.date,
                createdAt: now,
                updatedAt: now
            })
        }

        state.allHolidays.push(...addedHolidays)

        refreshAfterHolidayChange()

        showSuccess(
            normalizedDates.length === 1
                ? "休みを登録しました"
                : `${normalizedDates.length}件の休みを登録しました`
        )

        return true

    } catch (error) {
        console.log(error)
        showError("休み登録に失敗しました")
        return false
    }
}

function isFutureDate(dateValue) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const target = new Date(`${dateValue}T00:00`)

    if (isNaN(target.getTime())) return false

    return target.getTime() > today.getTime()
}

export async function deleteHoliday(holidayId) {
    const loginUser = auth.currentUser

    if (!loginUser) {
        showError("ログインしてください")
        return
    }

    const holiday = state.allHolidays.find((item) => {
        return item.id === holidayId
    })

    if (!holiday) {
        showError("削除対象の休みが見つかりません")
        return
    }

    const isOwnHoliday = isSameUser(holiday, {
        uid: loginUser.uid,
        email: loginUser.email
    })

    if (!isOwnHoliday && state.currentUserRole !== "admin") {
        showError("自分の休みのみ削除できます")
        return
    }

    const confirmDelete = confirm(
        "この休み登録を削除しますか？\nこの操作は元に戻せません。"
    )

    if (!confirmDelete) return

    try {
        await deleteDoc(doc(db, "holidays", holidayId))

        state.allHolidays = state.allHolidays.filter((item) => {
            return item.id !== holidayId
        })

        refreshAfterHolidayChange()

        showSuccess("休み登録を削除しました")

    } catch (error) {
        console.log(error)
        showError("休み登録の削除に失敗しました")
    }
}

export async function reloadHolidays() {
    const q = query(collection(db, "holidays"))
    const querySnapshot = await getDocs(q)

    state.allHolidays = []

    querySnapshot.forEach((docItem) => {
        const data = docItem.data()

        state.allHolidays.push({
            id: docItem.id,
            uid: data.uid || "",
            email: data.email || "",
            date: data.date || "",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        })
    })
}

export function createHolidayMap(targetUser = null) {
    const map = {}

    state.allHolidays.forEach((holiday) => {
        if (targetUser) {
            if (!isSameUser(holiday, targetUser)) return
        } else {
            const user = auth.currentUser
            if (!user) return

            if (!isSameUser(holiday, {
                uid: user.uid,
                email: user.email
            })) {
                return
            }
        }

        map[holiday.date] = holiday
    })

    return map
}

export function findHolidayByDate(dateKey, targetUser = null) {
    return state.allHolidays.find((holiday) => {
        if (holiday.date !== dateKey) return false

        if (targetUser) {
            return isSameUser(holiday, targetUser)
        }

        const user = auth.currentUser

        if (!user) return false

        return isSameUser(holiday, {
            uid: user.uid,
            email: user.email
        })
    }) || null
}

function refreshAfterHolidayChange() {
    renderHistory()
    renderMySummary()
    renderMyWorkChart()

    if (state.currentUserRole === "admin") {
        renderAdminHistory()
        renderAdminSummary()
        renderAdminWorkChart()
        renderAdminDashboard()
    }
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

