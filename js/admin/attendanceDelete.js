import { db } from "../firebase.js"
import { dom } from "../dom.js"
import { state } from "../state.js"

import {
    collection,
    getDocs,
    query,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {
    renderHistory,
    renderAdminHistory,
    updateWorkButtons
} from "../ui.js"

import {
    showSuccess,
    showError,
    showInfo
} from "../notify.js"

export async function deleteAllAttendance() {
    if (state.isDeleteBusy) return

    if (state.currentUserRole !== "admin") {
        showError("管理者のみ実行できます")
        return
    }

    const confirmDelete = confirm(
        "警告：すべての勤怠履歴と休み登録を削除します。\nこの操作は元に戻せません。\n本当に削除しますか？"
    )

    if (!confirmDelete) return

    const secondConfirm = confirm(
        "最終確認です。\n全社員の勤怠履歴と休み登録が完全に削除されます。\n実行しますか？"
    )

    if (!secondConfirm) return

    state.isDeleteBusy = true
    dom.deleteAllBtn.disabled = true

    showInfo("削除中...")

    try {
        await deleteCollectionDocs("attendance")
        await deleteCollectionDocs("holidays")

        state.allRecords = []
        state.allHolidays = []
        state.currentPage = 0
        state.adminCurrentPage = 0

        renderHistory()
        renderAdminHistory()
        updateWorkButtons()

        showSuccess("全勤怠履歴と休み登録を削除しました")

    } catch (error) {
        console.log(error)
        showError("削除に失敗しました")

    } finally {
        state.isDeleteBusy = false
        dom.deleteAllBtn.disabled = false
    }
}

async function deleteCollectionDocs(collectionName) {
    const q = query(collection(db, collectionName))
    const querySnapshot = await getDocs(q)

    const deletePromises = []

    querySnapshot.forEach((document) => {
        deletePromises.push(
            deleteDoc(doc(db, collectionName, document.id))
        )
    })

    await Promise.all(deletePromises)
}

