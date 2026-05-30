import { auth, db } from "./firebase.js"
import { state } from "./state.js"

import {
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { showError, showSuccess } from "./notify.js"

export const ACCOUNT_STATUS_ACTIVE = "active"
export const ACCOUNT_STATUS_INACTIVE = "inactive"
export const INACTIVE_DAYS_LIMIT = 14

export function getCurrentUserData() {
    const user = auth.currentUser

    if (!user) return null

    const email = String(user.email || "").toLowerCase()

    return state.allUsers.find((item) => {
        return (
            item.uid === user.uid ||
            item.id === user.uid ||
            String(item.email || "").toLowerCase() === email
        )
    }) || null
}

export function normalizeAccountStatus(userData) {
    return userData?.accountStatus || userData?.status || ACCOUNT_STATUS_ACTIVE
}

export function isAccountInactive(userData) {
    return normalizeAccountStatus(userData) === ACCOUNT_STATUS_INACTIVE
}

export function shouldAutoDeactivateUser(userData) {
    if (!userData) return false
    if (isAccountInactive(userData)) return false
    if (!userData.lastLoginAt) return false

    const lastLoginDate = getDate(userData.lastLoginAt)

    if (!lastLoginDate) return false

    const diffMs = Date.now() - lastLoginDate.getTime()
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))

    return diffDays >= INACTIVE_DAYS_LIMIT
}

export async function markCurrentUserAutoInactive(userData) {
    const user = auth.currentUser

    if (!user || !userData) return

    const now = new Date()

    await updateDoc(doc(db, "users", userData.id || user.uid), {
        accountStatus: ACCOUNT_STATUS_INACTIVE,
        status: ACCOUNT_STATUS_INACTIVE,
        inactiveAt: now,
        inactiveReason: "auto"
    })

    updateUserInState(userData.id || user.uid, {
        accountStatus: ACCOUNT_STATUS_INACTIVE,
        status: ACCOUNT_STATUS_INACTIVE,
        inactiveAt: now,
        inactiveReason: "auto"
    })
}

export async function updateCurrentUserLastLogin(userData) {
    const user = auth.currentUser

    if (!user || !userData) return

    const now = new Date()

    await updateDoc(doc(db, "users", userData.id || user.uid), {
        lastLoginAt: now,
        accountStatus: normalizeAccountStatus(userData),
        status: normalizeAccountStatus(userData)
    })

    updateUserInState(userData.id || user.uid, {
        lastLoginAt: now,
        accountStatus: normalizeAccountStatus(userData),
        status: normalizeAccountStatus(userData)
    })
}

export async function setUserInactive(userId, reason = "manual") {
    if (state.currentUserRole !== "admin") {
        showError("管理者のみ変更できます")
        return
    }

    const now = new Date()

    try {
        await updateDoc(doc(db, "users", userId), {
            accountStatus: ACCOUNT_STATUS_INACTIVE,
            status: ACCOUNT_STATUS_INACTIVE,
            inactiveAt: now,
            inactiveReason: reason
        })

        updateUserInState(userId, {
            accountStatus: ACCOUNT_STATUS_INACTIVE,
            status: ACCOUNT_STATUS_INACTIVE,
            inactiveAt: now,
            inactiveReason: reason
        })

        showSuccess("アカウントを休止状態にしました")

    } catch (error) {
        console.log(error)
        showError("アカウントの休止に失敗しました")
    }
}

export async function activateUser(userId) {
    if (state.currentUserRole !== "admin") {
        showError("管理者のみ変更できます")
        return
    }

    try {
        await updateDoc(doc(db, "users", userId), {
            accountStatus: ACCOUNT_STATUS_ACTIVE,
            status: ACCOUNT_STATUS_ACTIVE,
            inactiveAt: null,
            inactiveReason: ""
        })

        updateUserInState(userId, {
            accountStatus: ACCOUNT_STATUS_ACTIVE,
            status: ACCOUNT_STATUS_ACTIVE,
            inactiveAt: null,
            inactiveReason: ""
        })

        showSuccess("休止状態を解除しました")

    } catch (error) {
        console.log(error)
        showError("休止状態の解除に失敗しました")
    }
}

export function getInactiveMessage(userData) {
    const reason = userData?.inactiveReason || "manual"

    if (reason === "auto") {
        return "このアカウントは14日以上ログインがなかったため休止状態になっています。\n利用を再開するには管理者へ連絡してください。"
    }

    return "このアカウントは管理者により休止状態に設定されています。\n利用を再開するには管理者へ連絡してください。"
}

export function getAccountStatusLabel(userData) {
    return isAccountInactive(userData) ? "休止中" : "利用中"
}

export function getInactiveReasonLabel(userData) {
    if (!isAccountInactive(userData)) return "なし"

    if (userData?.inactiveReason === "auto") {
        return "14日未ログイン"
    }

    return "管理者設定"
}

export function formatDateTime(value) {
    const date = getDate(value)

    if (!date) return "未ログイン"

    return date.toLocaleString()
}

function updateUserInState(userId, updates) {
    state.allUsers = state.allUsers.map((item) => {
        if (item.id === userId || item.uid === userId) {
            return {
                ...item,
                ...updates
            }
        }

        return item
    })
}

function getDate(value) {
    if (!value) return null

    if (value.seconds) {
        return new Date(value.seconds * 1000)
    }

    if (value instanceof Date) {
        return value
    }

    return null
}
