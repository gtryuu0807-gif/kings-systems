import { db, auth } from "../firebase.js"
import { dom } from "../dom.js"
import { state } from "../state.js"

import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { renderUsers } from "../ui.js"

import {
    showSuccess,
    showError,
    showWarning,
    showInfo
} from "../notify.js"

export async function addEmployee() {
    if (state.isEmployeeBusy) return

    if (state.currentUserRole !== "admin") {
        showError("管理者のみ実行できます")
        return
    }

    if (
        dom.employeeName.value.trim() === "" ||
        dom.employeeEmail.value.trim() === ""
    ) {
        showWarning("名前とメールを入力してください")
        return
    }

    state.isEmployeeBusy = true
    dom.addEmployeeBtn.disabled = true

    showInfo("社員情報を追加中...")

    try {
        const emailValue = dom.employeeEmail.value.trim().toLowerCase()

        const exists = state.allUsers.some((user) => {
            return user.email === emailValue
        })

        if (exists) {
            showWarning("このメールは既に登録されています")
            return
        }

        const now = new Date()

        const docRef = await addDoc(collection(db, "users"), {
            uid: "",
            name: dom.employeeName.value.trim(),
            email: emailValue,
            role: dom.employeeRole.value,
            createdAt: now
        })

        state.allUsers.push({
            id: docRef.id,
            uid: "",
            name: dom.employeeName.value.trim(),
            email: emailValue,
            role: dom.employeeRole.value,
            createdAt: now
        })

        dom.employeeName.value = ""
        dom.employeeEmail.value = ""
        dom.employeeRole.value = "employee"

        renderUsers()
        notifyUsersChanged()

        showSuccess("社員情報を追加しました")

    } catch (error) {
        console.log(error)
        showError("社員情報の追加に失敗しました")

    } finally {
        state.isEmployeeBusy = false
        dom.addEmployeeBtn.disabled = false
    }
}

export async function updateUserName(userId, newName) {
    if (state.currentUserRole !== "admin") {
        showError("管理者のみ変更できます")
        return
    }

    if (newName === null) return

    const nameValue = newName.trim()

    if (nameValue === "") {
        showWarning("名前を入力してください")
        return
    }

    try {
        await updateDoc(doc(db, "users", userId), {
            name: nameValue
        })

        state.allUsers = state.allUsers.map((item) => {
            if (item.id === userId) {
                return {
                    ...item,
                    name: nameValue
                }
            }

            return item
        })

        renderUsers()
        notifyUsersChanged()

        showSuccess("社員名を変更しました")

    } catch (error) {
        console.log(error)
        showError("社員名の変更に失敗しました")
    }
}

export async function deleteUserData(userId, targetEmail) {
    if (state.currentUserRole !== "admin") {
        showError("管理者のみ削除できます")
        return
    }

    const loginUser = auth.currentUser

    if (
        loginUser &&
        loginUser.email.toLowerCase() === String(targetEmail).toLowerCase()
    ) {
        showWarning("自分自身の社員情報は削除できません")
        return
    }

    const confirmDelete = confirm(
        "この社員情報を削除しますか？\nログインアカウント本体は削除されません。"
    )

    if (!confirmDelete) return

    try {
        await deleteDoc(doc(db, "users", userId))

        state.allUsers = state.allUsers.filter((item) => {
            return item.id !== userId
        })

        renderUsers()
        notifyUsersChanged()

        showSuccess("社員情報を削除しました")

    } catch (error) {
        console.log(error)
        showError("社員情報削除に失敗しました")
    }
}

function notifyUsersChanged() {
    document.dispatchEvent(
        new CustomEvent("usersChanged")
    )
}
