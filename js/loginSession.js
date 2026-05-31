import { auth, db } from "./firebase.js"
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
import { state } from "./state.js"

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { showWarning, showInfo } from "./notify.js"

let currentSessionId = ""
let sessionTimer = null
let isForcedLogout = false

export async function registerLoginSession(userData) {
    const user = auth.currentUser

    if (!user || !userData) return

    const previousSessionId = userData.loginSessionId || ""
    const hadPreviousSession = Boolean(previousSessionId)

    currentSessionId = createSessionId()

    await updateDoc(doc(db, "users", userData.id || user.uid), {
        loginSessionId: currentSessionId,
        loginDeviceName: getDeviceName(),
        loginDeviceUpdatedAt: new Date()
    })

    updateUserInState(userData.id || user.uid, {
        loginSessionId: currentSessionId,
        loginDeviceName: getDeviceName(),
        loginDeviceUpdatedAt: new Date()
    })

    if (hadPreviousSession) {
        showInfo(
            "このアカウントは別の端末で利用中でした。以前の端末は自動的にログアウトされました。"
        )
    }
}

export function startLoginSessionWatcher() {
    stopLoginSessionWatcher()

    if (!auth.currentUser || !currentSessionId) return

    sessionTimer = setInterval(() => {
        checkLoginSession()
    }, 15000)
}

export function stopLoginSessionWatcher() {
    if (sessionTimer) {
        clearInterval(sessionTimer)
        sessionTimer = null
    }
}

export function clearCurrentLoginSession() {
    currentSessionId = ""
    isForcedLogout = false
    stopLoginSessionWatcher()
}

async function checkLoginSession() {
    const user = auth.currentUser

    if (!user || !currentSessionId || isForcedLogout) return

    try {
        const snapshot = await getDoc(doc(db, "users", user.uid))

        if (!snapshot.exists()) return

        const data = snapshot.data()
        const latestSessionId = data.loginSessionId || ""

        if (latestSessionId && latestSessionId !== currentSessionId) {
            isForcedLogout = true
            stopLoginSessionWatcher()

            const message = "別の端末でログインされました。この端末のログイン状態は解除されました。"
            showWarning(message)
            await signOut(auth)
            location.reload()
        }

    } catch (error) {
        console.log(error)
    }
}

function createSessionId() {
    const random = Math.random().toString(36).slice(2)
    const time = Date.now().toString(36)

    return `${time}_${random}`
}

function getDeviceName() {
    const ua = navigator.userAgent || ""

    if (/iPhone/i.test(ua)) return "iPhone"
    if (/iPad/i.test(ua)) return "iPad"
    if (/Android/i.test(ua)) return "Android"
    if (/Windows/i.test(ua)) return "Windows PC"
    if (/Macintosh/i.test(ua)) return "Mac"

    return "不明な端末"
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
