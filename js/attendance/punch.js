import { db, auth } from "../firebase.js"
import { dom } from "../dom.js"
import { state } from "../state.js"

import {
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { getTimeMs } from "../utils.js"
import { getMyRecords } from "../data.js"

import {
    renderHistory,
    renderAdminHistory,
    updateWorkButtons
} from "../ui.js"

import {
    isSameLocalDate,
    getLatestMyRecord
} from "./time.js"

import {
    showSuccess,
    showError,
    showWarning,
    showInfo
} from "../notify.js"

export async function punch(type) {
    if (state.isPunchBusy) return

    const user = auth.currentUser

    if (!user) {
        showError("ログインしてください")
        return
    }

    const now = new Date()

    const todayRecords = getMyRecords().filter((record) => {
        return isSameLocalDate(record.time, now)
    })

    if (type === "出勤") {
        const todayClockInCount = todayRecords.filter((record) => {
            return record.type === "出勤"
        }).length

        if (todayClockInCount >= 2) {
            showWarning("本日の出勤・退勤は最大2セットまでです")
            updateWorkButtons()
            return
        }
    }

    const latest = getLatestMyRecord()

    if (type === "出勤" && latest && latest.type === "出勤") {
        showWarning("すでに出勤中です")
        updateWorkButtons()
        return
    }

    if (type === "退勤" && (!latest || latest.type === "退勤")) {
        showWarning("現在出勤中ではありません")
        updateWorkButtons()
        return
    }

    state.isPunchBusy = true
    dom.clockInBtn.disabled = true
    dom.clockOutBtn.disabled = true

    showInfo(type + "処理中...")

    try {
        const nowForMeta = new Date()

        const docRef = await addDoc(collection(db, "attendance"), {
            uid: user.uid,
            email: user.email,
            type: type,
            time: now,
            version: 1,
            updatedAt: nowForMeta
        })

        state.allRecords.unshift({
            id: docRef.id,
            uid: user.uid,
            email: user.email,
            type: type,
            time: now,
            version: 1,
            updatedAt: nowForMeta
        })

        state.allRecords.sort((a, b) => {
            return getTimeMs(b) - getTimeMs(a)
        })

        state.currentPage = 0
        state.adminCurrentPage = 0

        renderHistory()

        if (state.currentUserRole === "admin") {
            renderAdminHistory()
        }

        showSuccess(type + "しました")

    } catch (error) {
        console.log(error)
        showError(type + "処理に失敗しました")

    } finally {
        state.isPunchBusy = false
        updateWorkButtons()
    }
}
