import { db, auth } from "./firebase.js"
import { dom } from "./dom.js"
import { state } from "./state.js"

import {
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {
    renderNotices,
    renderAdminNoticeList
} from "./ui.js"

import {
    showSuccess,
    showError,
    showWarning,
    showInfo
} from "./notify.js"

export async function addNotice() {
    if (state.currentUserRole !== "admin") {
        showError("管理者のみ投稿できます")
        return
    }

    const title = dom.noticeTitle.value.trim()
    const body = dom.noticeBody.value.trim()
    const startAt = dom.noticeStartAt?.value || ""
    const endAt = dom.noticeEndAt?.value || ""

    if (!title) {
        showWarning("お知らせタイトルを入力してください")
        return
    }

    if (!body) {
        showWarning("お知らせ内容を入力してください")
        return
    }

    const user = auth.currentUser

    if (!user) {
        showError("ログインしてください")
        return
    }

    showInfo("お知らせを投稿中...")

    try {
        const now = new Date()

        const authorName = getMyDisplayName()
        const authorEmail = user.email || ""

        const docRef = await addDoc(collection(db, "notices"), {
            title,
            body,
            authorName,
            authorEmail,
            createdAt: now,
            updatedAt: now,
            startAt,
            endAt,
            confirmedUsers: []
        })

        state.allNotices.unshift({
            id: docRef.id,
            title,
            body,
            authorName,
            authorEmail,
            createdAt: now,
            updatedAt: now,
            startAt,
            endAt,
            confirmedUsers: []
        })

        dom.noticeTitle.value = ""
        dom.noticeBody.value = ""
        if (dom.noticeStartAt) dom.noticeStartAt.value = ""
        if (dom.noticeEndAt) dom.noticeEndAt.value = ""

        renderNotices()
        renderAdminNoticeList()

        showSuccess("お知らせを投稿しました")

    } catch (error) {
        console.log(error)
        showError("お知らせの投稿に失敗しました")
    }
}

export async function deleteNotice(noticeId) {
    if (state.currentUserRole !== "admin") {
        showError("管理者のみ削除できます")
        return
    }

    const notice = state.allNotices.find((item) => {
        return item.id === noticeId
    })

    if (!notice) {
        showError("お知らせが見つかりません")
        return
    }

    const confirmDelete = confirm(
        "このお知らせを削除しますか？\nこの操作は元に戻せません。"
    )

    if (!confirmDelete) return

    showInfo("お知らせを削除中...")

    try {
        await deleteDoc(doc(db, "notices", noticeId))

        state.allNotices = state.allNotices.filter((item) => {
            return item.id !== noticeId
        })

        renderNotices()
        renderAdminNoticeList()

        showSuccess("お知らせを削除しました")

    } catch (error) {
        console.log(error)
        showError("お知らせの削除に失敗しました")
    }
}

export async function confirmNotice(noticeId) {
    const user = auth.currentUser

    if (!user) {
        showError("ログインしてください")
        return
    }

    const notice = state.allNotices.find((item) => {
        return item.id === noticeId
    })

    if (!notice) {
        showError("お知らせが見つかりません")
        return
    }

    if (isNoticeConfirmedByMe(notice)) {
        showWarning("このお知らせは確認済みです")
        return
    }

    const confirmedUser = {
        uid: user.uid,
        email: user.email || "",
        name: getMyDisplayName(),
        confirmedAt: new Date()
    }

    try {
        await updateDoc(doc(db, "notices", noticeId), {
            confirmedUsers: arrayUnion(confirmedUser),
            updatedAt: new Date()
        })

        notice.confirmedUsers = [
            ...(notice.confirmedUsers || []),
            confirmedUser
        ]

        renderNotices()
        renderAdminNoticeList()

        showSuccess("お知らせを確認済みにしました")

    } catch (error) {
        console.log(error)
        showError("確認状態の保存に失敗しました")
    }
}

export function isNoticeConfirmedByMe(notice) {
    const user = auth.currentUser

    if (!user) return false

    return (notice.confirmedUsers || []).some((confirmedUser) => {
        const sameUid =
            confirmedUser.uid &&
            confirmedUser.uid === user.uid

        const sameEmail =
            String(confirmedUser.email || "").toLowerCase() ===
            String(user.email || "").toLowerCase()

        return sameUid || sameEmail
    })
}

function getMyDisplayName() {
    const user = auth.currentUser

    if (!user) return "社員"

    const email = String(user.email || "").toLowerCase()

    const userData = state.allUsers.find((item) => {
        return String(item.email || "").toLowerCase() === email
    })

    return userData?.name || user.email || "社員"
}
