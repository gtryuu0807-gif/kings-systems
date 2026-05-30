import { db, auth } from "./firebase.js"
import { state } from "./state.js"

import {
    collection,
    getDocs,
    query,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { getTimeMs } from "./utils.js"
import { reloadHolidays } from "./attendance/holiday.js"

const firstAdminEmail = "staff1@test.com"

export async function reloadRecords() {
    const q = query(collection(db, "attendance"))
    const querySnapshot = await getDocs(q)

    state.allRecords = []

    querySnapshot.forEach((docItem) => {
        const data = docItem.data()

        state.allRecords.push({
            id: docItem.id,
            uid: data.uid || "",
            email: data.email || "",
            type: data.type || "",
            time: data.time,
            workDate: data.workDate || "",
            version: data.version || 1,
            updatedAt: data.updatedAt
        })
    })

    state.allRecords.sort((a, b) => {
        return getTimeMs(b) - getTimeMs(a)
    })
}

export async function reloadNotices() {
    const q = query(collection(db, "notices"))
    const querySnapshot = await getDocs(q)

    state.allNotices = []

    querySnapshot.forEach((docItem) => {
        const data = docItem.data()

        state.allNotices.push({
            id: docItem.id,
            title: data.title || "",
            body: data.body || "",
            createdBy: data.createdBy || "",
            authorName: data.authorName || data.createdBy || "投稿者不明",
            authorEmail: data.authorEmail || "",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            confirmedUsers: data.confirmedUsers || []
        })
    })

    state.allNotices.sort((a, b) => {
        return getNoticeTimeMs(b) - getNoticeTimeMs(a)
    })
}

export async function reloadUsers() {
    const q = query(collection(db, "users"))
    const querySnapshot = await getDocs(q)

    state.allUsers = []

    querySnapshot.forEach((docItem) => {
        const data = docItem.data()

        state.allUsers.push({
            id: docItem.id,
            uid: data.uid || docItem.id,
            name: data.name || "",
            email: String(data.email || "").toLowerCase(),
            role: data.role || "employee",
            accountStatus: data.accountStatus || data.status || "active",
            status: data.status || data.accountStatus || "active",
            lastLoginAt: data.lastLoginAt || null,
            inactiveAt: data.inactiveAt || null,
            inactiveReason: data.inactiveReason || "",
            loginSessionId: data.loginSessionId || "",
            loginDeviceName: data.loginDeviceName || "",
            loginDeviceUpdatedAt: data.loginDeviceUpdatedAt || null,
            createdAt: data.createdAt
        })
    })

    state.allUsers.sort((a, b) => {
        return String(a.email).localeCompare(String(b.email))
    })
}

export async function reloadAllData() {
    await reloadUsers()
    await reloadRecords()
    await reloadNotices()
    await reloadHolidays()
}

export async function ensureCurrentUserProfile(user) {
    const loginEmail = String(user.email || "").toLowerCase()

    const exists = state.allUsers.find((item) => {
        return (
            item.uid === user.uid ||
            item.email === loginEmail ||
            item.id === user.uid
        )
    })

    const defaultRole =
        loginEmail === firstAdminEmail.toLowerCase()
            ? "admin"
            : "employee"

    const now = new Date()

    if (exists) {
        const repaired = {
            uid: exists.uid || user.uid,
            email: exists.email || loginEmail,
            name: exists.name || loginEmail,
            role: exists.role || defaultRole,
            accountStatus: exists.accountStatus || exists.status || "active",
            status: exists.status || exists.accountStatus || "active",
            inactiveAt: exists.inactiveAt ?? null,
            inactiveReason: exists.inactiveReason || "",
            loginSessionId: exists.loginSessionId || "",
            loginDeviceName: exists.loginDeviceName || "",
            loginDeviceUpdatedAt: exists.loginDeviceUpdatedAt ?? null,
            createdAt: exists.createdAt || now
        }

        await setDoc(doc(db, "users", user.uid), {
            ...repaired,
            uid: user.uid,
            email: loginEmail || repaired.email
        }, { merge: true })

        state.allUsers = state.allUsers.map((item) => {
            if (item.id === exists.id || item.id === user.uid || item.uid === user.uid || item.email === loginEmail) {
                return {
                    ...item,
                    ...repaired,
                    id: user.uid,
                    uid: user.uid,
                    email: loginEmail || repaired.email
                }
            }

            return item
        })

        return
    }

    const role = defaultRole

    await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: loginEmail,
        email: loginEmail,
        role,
        accountStatus: "active",
        status: "active",
        lastLoginAt: null,
        inactiveAt: null,
        inactiveReason: "",
        loginSessionId: "",
        loginDeviceName: "",
        loginDeviceUpdatedAt: null,
        createdAt: now
    }, { merge: true })

    state.allUsers.push({
        id: user.uid,
        uid: user.uid,
        name: loginEmail,
        email: loginEmail,
        role,
        accountStatus: "active",
        status: "active",
        lastLoginAt: null,
        inactiveAt: null,
        inactiveReason: "",
        loginSessionId: "",
        loginDeviceName: "",
        loginDeviceUpdatedAt: null,
        createdAt: now
    })
}

export function getRoleByAuthUser(user) {
    const uid = user?.uid || ""
    const loginEmail = String(user?.email || "").toLowerCase()

    const userByUid = state.allUsers.find((item) => {
        return item.uid === uid || item.id === uid
    })

    if (userByUid) {
        return normalizeRole(userByUid.role)
    }

    const userByEmail = state.allUsers.find((item) => {
        return item.email === loginEmail
    })

    if (userByEmail) {
        return normalizeRole(userByEmail.role)
    }

    return "employee"
}

export function getRoleByEmail(targetEmail) {
    const loginEmail = String(targetEmail || "").toLowerCase()

    const userData = state.allUsers.find((item) => {
        return item.email === loginEmail
    })

    if (!userData) {
        return "employee"
    }

    return normalizeRole(userData.role)
}

export function getMyRecords() {
    const user = auth.currentUser

    if (!user) {
        return []
    }

    return state.allRecords.filter((data) => {
        return (
            data.uid === user.uid ||
            String(data.email || "").toLowerCase() ===
            String(user.email || "").toLowerCase()
        )
    })
}

function getNoticeTimeMs(data) {
    if (data.createdAt && data.createdAt.seconds) {
        return data.createdAt.seconds * 1000
    }

    if (data.createdAt instanceof Date) {
        return data.createdAt.getTime()
    }

    return 0
}



function normalizeRole(role) {
    const normalized = String(role || "").trim().toLowerCase()

    if (normalized === "admin") return "admin"
    if (normalized === "employee") return "employee"
    if (normalized === "staff") return "employee"

    return "employee"
}
