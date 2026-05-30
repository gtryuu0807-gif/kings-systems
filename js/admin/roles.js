import { db, auth } from "../firebase.js"
import { state } from "../state.js"

import {
    doc,
    updateDoc,
    addDoc,
    collection
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { renderUsers } from "../ui.js"

import {
    showSuccess,
    showError,
    showWarning
} from "../notify.js"

export async function updateUserRole(userId, newRole) {
    if (state.currentUserRole !== "admin") {
        showError("管理者のみ変更できます")
        return
    }

    const targetUser = state.allUsers.find((user) => {
        return user.id === userId
    })

    if (!targetUser) {
        showError("社員情報が見つかりません")
        return
    }

    const loginUser = auth.currentUser

    if (
        loginUser &&
        String(loginUser.email || "").toLowerCase() ===
        String(targetUser.email || "").toLowerCase()
    ) {
        showWarning("自分自身の権限は変更できません")
        return
    }

    try {
        const oldRole = targetUser.role || "employee"

        await updateDoc(doc(db, "users", userId), {
            role: newRole,
            updatedAt: new Date()
        })

        const actor = state.allUsers.find((user) => {
            return String(user.email || "").toLowerCase() === String(auth.currentUser?.email || "").toLowerCase()
        })

        await addDoc(collection(db, "roleChangeLogs"), {
            targetUid: targetUser.uid || targetUser.id || "",
            targetEmail: targetUser.email || "",
            targetName: targetUser.name || targetUser.email || "社員",
            oldRole,
            newRole,
            actorUid: auth.currentUser?.uid || "",
            actorEmail: auth.currentUser?.email || "",
            actorName: actor?.name || auth.currentUser?.email || "管理者",
            createdAt: new Date()
        })

        state.allUsers = state.allUsers.map((user) => {
            if (user.id === userId) {
                return {
                    ...user,
                    role: newRole
                }
            }

            return user
        })

        renderUsers()

        document.dispatchEvent(
            new CustomEvent("usersChanged")
        )

        const { renderRoleChangeLogs } = await import("./accountManagement.js")
        renderRoleChangeLogs()

        showSuccess(`権限を「${getRoleLabel(newRole)}」に変更しました`)

    } catch (error) {
        console.log(error)
        showError("権限変更に失敗しました")
    }
}

function getRoleLabel(role) {
    if (role === "admin") {
        return "管理者"
    }

    return "社員"
}

