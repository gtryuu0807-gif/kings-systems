import { db, auth } from "../firebase.js"
import { state } from "../state.js"

import {
    collection,
    addDoc,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { getTimeMs } from "../utils.js"

import {
    renderHistory,
    renderAdminHistory,
    updateWorkButtons
} from "../ui.js"

import { isSameLocalDate } from "./time.js"
import {
    validateAttendanceSets,
    createSetsByTypeOrder
} from "./rules.js"

import {
    showSuccess,
    showError,
    showWarning
} from "../notify.js"

export async function updateAttendanceTime(recordId, newDateTimeValue) {
    const user = auth.currentUser

    if (!user) {
        showError("ログインしてください")
        return
    }

    const record = state.allRecords.find((item) => {
        return item.id === recordId
    })

    if (!record) {
        showError("勤怠履歴が見つかりません")
        return
    }

    const isOwnRecord =
        record.uid === user.uid ||
        record.email === user.email

    if (!isOwnRecord) {
        showError("自分の勤怠履歴のみ編集できます")
        return
    }

    await updateAttendanceTimeCore(recordId, newDateTimeValue)
}

export async function updateAttendanceTimeByAdmin(recordId, newDateTimeValue) {
    if (state.currentUserRole !== "admin") {
        showError("管理者のみ変更できます")
        return
    }

    await updateAttendanceTimeCore(recordId, newDateTimeValue)
}

async function updateAttendanceTimeCore(recordId, newDateTimeValue) {
    if (!recordId) {
        showError("編集対象が見つかりません")
        return
    }

    if (!newDateTimeValue) {
        showWarning("日付と時間を入力してください")
        return
    }

    const record = state.allRecords.find((item) => {
        return item.id === recordId
    })

    if (!record) {
        showError("勤怠履歴が見つかりません")
        return
    }

    const newTime = new Date(newDateTimeValue)

    if (isNaN(newTime.getTime())) {
        showWarning("正しい日付と時間を入力してください")
        return
    }

    const latestCheck = await checkLatestVersion(record)

    if (!latestCheck.ok) {
        showError(latestCheck.message)
        return
    }

    const tempRecords = state.allRecords.map((item) => {
        if (item.id === recordId) {
            return {
                ...item,
                time: newTime
            }
        }

        return item
    })

    if (!canSaveBySetSlot(record, newTime, record.id, tempRecords)) {
        showWarning("同じ日の出勤・退勤は最大3セットまでです")
        return
    }

    const sameUserRelatedRecords = getSameUserRelatedRecords(record, tempRecords)
    const validateResult = validateAttendanceSets(sameUserRelatedRecords)

    if (!validateResult.ok) {
        showWarning(validateResult.message)
        return
    }

    try {
        const nextVersion = Number(record.version || 1) + 1
        const updatedAt = new Date()

        await updateDoc(doc(db, "attendance", recordId), {
            time: newTime,
            version: nextVersion,
            updatedAt
        })

        state.allRecords = state.allRecords.map((item) => {
            if (item.id === recordId) {
                return {
                    ...item,
                    time: newTime,
                    version: nextVersion,
                    updatedAt
                }
            }

            return item
        })

        state.allRecords.sort((a, b) => {
            return getTimeMs(b) - getTimeMs(a)
        })

        renderHistory()

        if (state.currentUserRole === "admin") {
            renderAdminHistory()
        }

        updateWorkButtons()

        showSuccess("勤怠時間を変更しました")

    } catch (error) {
        console.log(error)
        showError("勤怠時間の変更に失敗しました")
    }
}

export async function createAttendanceRecord(type, newDateTimeValue, targetUser = null, setNumber = 1) {
    const loginUser = auth.currentUser

    if (!loginUser) {
        showError("ログインしてください")
        return
    }

    if (!newDateTimeValue) {
        showWarning("日付と時間を入力してください")
        return
    }

    const newTime = new Date(newDateTimeValue)

    if (isNaN(newTime.getTime())) {
        showWarning("正しい日付と時間を入力してください")
        return
    }

    if (targetUser && state.currentUserRole !== "admin") {
        showError("管理者のみ追加できます")
        return
    }

    const uid = targetUser?.uid || loginUser.uid
    const email = targetUser?.email || loginUser.email

    const tempRecord = {
        uid,
        email,
        type,
        time: newTime,
        targetSetNumber: setNumber
    }

    const userRecords = getSameUserRelatedRecords(tempRecord, state.allRecords)
    const sameDayRecords = userRecords.filter((record) => {
        return isSameLocalDate(record.time, newTime)
    })

    const currentSets = createSetsByTypeOrder(sameDayRecords)
    const targetSet = currentSets[setNumber - 1]

    if (!targetSet) {
        showWarning("追加できるセットが見つかりません")
        return
    }

    if (type === "出勤" && targetSet.clockIn) {
        showWarning(`${setNumber}回目の出勤はすでに登録されています`)
        return
    }

    if (type === "退勤" && targetSet.clockOut) {
        showWarning(`${setNumber}回目の退勤はすでに登録されています`)
        return
    }

    if (!canSaveBySetSlot(tempRecord, newTime, null, [...state.allRecords, tempRecord])) {
        showWarning("同じ日の出勤・退勤は最大3セットまでです")
        return
    }

    const tempRecords = [...state.allRecords, tempRecord]
    const sameUserRelatedRecords = getSameUserRelatedRecords(tempRecord, tempRecords)
    const validateResult = validateAttendanceSets(sameUserRelatedRecords)

    if (!validateResult.ok) {
        showWarning(validateResult.message)
        return
    }

    try {
        const updatedAt = new Date()

        const docRef = await addDoc(collection(db, "attendance"), {
            uid,
            email,
            type,
            time: newTime,
            version: 1,
            updatedAt
        })

        state.allRecords.unshift({
            id: docRef.id,
            uid,
            email,
            type,
            time: newTime,
            version: 1,
            updatedAt
        })

        state.allRecords.sort((a, b) => {
            return getTimeMs(b) - getTimeMs(a)
        })

        renderHistory()

        if (state.currentUserRole === "admin") {
            renderAdminHistory()
        }

        updateWorkButtons()

        showSuccess(`${type}履歴を追加しました`)

    } catch (error) {
        console.log(error)
        showError(`${type}履歴の追加に失敗しました`)
    }
}

async function checkLatestVersion(localRecord) {
    try {
        const docSnap = await getDoc(doc(db, "attendance", localRecord.id))

        if (!docSnap.exists()) {
            return {
                ok: false,
                message: "他のユーザーにより削除されています。再読み込みしてください"
            }
        }

        const serverData = docSnap.data()
        const serverVersion = Number(serverData.version || 1)
        const localVersion = Number(localRecord.version || 1)

        if (serverVersion !== localVersion) {
            return {
                ok: false,
                message: "他のユーザーが先に更新しました。再読み込みしてください"
            }
        }

        return {
            ok: true,
            message: ""
        }

    } catch (error) {
        console.log(error)

        return {
            ok: false,
            message: "最新状態の確認に失敗しました"
        }
    }
}

function canSaveBySetSlot(record, targetDate, ignoreRecordId, records) {
    const sameUserSameDayRecords = records.filter((item) => {
        const sameUser =
            String(item.email || "").toLowerCase() ===
            String(record.email || "").toLowerCase() ||
            item.uid === record.uid

        return (
            sameUser &&
            item.id !== ignoreRecordId &&
            item.type === record.type &&
            isSameLocalDate(item.time, targetDate)
        )
    })

    return sameUserSameDayRecords.length <= 2
}

function getSameUserRelatedRecords(record, records) {
    return records.filter((item) => {
        const sameUser =
            String(item.email || "").toLowerCase() ===
            String(record.email || "").toLowerCase() ||
            item.uid === record.uid

        return sameUser
    })
}
