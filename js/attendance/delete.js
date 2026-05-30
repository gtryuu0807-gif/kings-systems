import { db, auth } from "../firebase.js"
import { state } from "../state.js"

import {
    doc,
    getDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {
    renderHistory,
    renderAdminHistory,
    updateWorkButtons
} from "../ui.js"

import { canDeleteRecord } from "./rules.js"

import {
    showSuccess,
    showError,
    showWarning
} from "../notify.js"

export async function deleteAttendanceRecord(recordId) {
    const user = auth.currentUser

    if (!user) {
        showError("ログインしてください")
        return
    }

    const record = state.allRecords.find((item) => {
        return item.id === recordId
    })

    if (!record) {
        showError("削除対象が見つかりません")
        return
    }

    const isOwnRecord =
        record.uid === user.uid ||
        record.email === user.email

    if (!isOwnRecord) {
        showError("自分の勤怠履歴のみ削除できます")
        return
    }

    await deleteAttendanceRecordCore(recordId)
}

export async function deleteAttendanceRecordByAdmin(recordId) {
    if (state.currentUserRole !== "admin") {
        showError("管理者のみ削除できます")
        return
    }

    await deleteAttendanceRecordCore(recordId)
}

async function deleteAttendanceRecordCore(recordId) {
    const record = state.allRecords.find((item) => {
        return item.id === recordId
    })

    if (!record) {
        showError("削除対象が見つかりません")
        return
    }

    const latestCheck = await checkLatestVersion(record)

    if (!latestCheck.ok) {
        showError(latestCheck.message)
        return
    }

    if (!canDeleteRecord(record)) {
        showWarning("2セット目の出勤・退勤を削除してから、1セット目を削除してください")
        return
    }

    const confirmDelete = confirm(
        `${record.type}履歴を削除しますか？\nこの操作は元に戻せません。`
    )

    if (!confirmDelete) return

    try {
        await deleteDoc(doc(db, "attendance", recordId))

        state.allRecords = state.allRecords.filter((item) => {
            return item.id !== recordId
        })

        renderHistory()

        if (state.currentUserRole === "admin") {
            renderAdminHistory()
        }

        updateWorkButtons()

        showSuccess("勤怠履歴を削除しました")

    } catch (error) {
        console.log(error)
        showError("勤怠履歴の削除に失敗しました")
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