import { firebaseConfig, db, auth } from "../firebase.js"
import { dom } from "../dom.js"
import { state } from "../state.js"
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
import { getAuth, createUserWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
import { doc, setDoc, addDoc, collection, getDocs, query, where, orderBy, limit, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
import { reloadUsers } from "../data.js"
import { showSuccess, showError, showWarning, showInfo } from "../notify.js"

export async function createEmployeeAccount() {
    if (state.currentUserRole !== "admin") {
        showError("管理者のみ実行できます", "ROLE-003")
        return
    }

    const name = dom.newAccountName?.value.trim() || ""
    const email = String(dom.newAccountEmail?.value || "").trim().toLowerCase()
    const password = dom.newAccountPassword?.value || ""
    const role = normalizeRole(dom.newAccountRole?.value || "employee")

    if (!name || !email || !password) {
        showWarning("社員名・メールアドレス・初期パスワードを入力してください")
        return
    }

    if (password.length < 6) {
        showWarning("初期パスワードは6文字以上にしてください")
        return
    }

    const existsInState = state.allUsers.some((user) => String(user.email || "").trim().toLowerCase() === email)
    if (existsInState) {
        showWarning("このメールアドレスは既に登録されています")
        return
    }

    const existsInFirestore = await userEmailExistsInFirestore(email)
    if (existsInFirestore) {
        showWarning("このメールアドレスは既に登録されています")
        return
    }

    const secondaryName = `secondary-${Date.now()}`
    const secondaryApp = initializeApp(firebaseConfig, secondaryName)
    const secondaryAuth = getAuth(secondaryApp)
    let createdUser = null

    dom.createAccountBtn.disabled = true
    showInfo("社員アカウントを作成中...")

    try {
        const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
        createdUser = credential.user
        const now = new Date()

        await setDoc(doc(db, "users", createdUser.uid), {
            uid: createdUser.uid,
            name,
            email,
            role,
            accountStatus: "active",
            status: "active",
            lastLoginAt: null,
            inactiveAt: null,
            inactiveReason: "",
            loginSessionId: "",
            loginDeviceName: "",
            loginDeviceUpdatedAt: null,
            createdAt: now,
            createdByUid: auth.currentUser?.uid || "",
            createdByEmail: auth.currentUser?.email || ""
        }, { merge: true })

        await addDoc(collection(db, "accountLogs"), {
            type: "createAccount",
            targetUid: createdUser.uid,
            targetEmail: email,
            targetName: name,
            role,
            actorUid: auth.currentUser?.uid || "",
            actorEmail: auth.currentUser?.email || "",
            createdAt: now
        })

        await reloadUsers()
        clearCreateForm()
        const { renderUsers } = await import("../ui.js")
        renderUsers()
        document.dispatchEvent(new CustomEvent("usersChanged"))
        showSuccess("社員アカウントを作成しました")

    } catch (error) {
        console.log(error)

        if (createdUser) {
            try {
                await deleteUser(createdUser)
                await addDoc(collection(db, "accountLogs"), {
                    type: "createAccountRollback",
                    targetEmail: email,
                    actorUid: auth.currentUser?.uid || "",
                    actorEmail: auth.currentUser?.email || "",
                    reason: error?.message || "users作成失敗",
                    createdAt: new Date()
                })
            } catch (rollbackError) {
                console.log(rollbackError)
            }
        }

        showError(getCreateAccountErrorMessage(error), getCreateAccountErrorCode(error))
    } finally {
        await deleteApp(secondaryApp).catch(() => {})
        if (dom.createAccountBtn) dom.createAccountBtn.disabled = false
    }
}

export async function checkAccountIntegrity() {
    if (!dom.accountIntegrityResult) return

    const problems = []

    state.allUsers.forEach((user) => {
        const missing = []
        if (!user.uid) missing.push("uid")
        if (!user.name) missing.push("name")
        if (!user.email) missing.push("email")
        if (!user.role) missing.push("role")
        if (!user.accountStatus) missing.push("accountStatus")
        if (!user.status) missing.push("status")

        if (missing.length > 0) {
            problems.push({ user, missing })
        }
    })

    if (problems.length === 0) {
        dom.accountIntegrityResult.innerHTML = `<div class="accountIntegrityOk">Firestore users に不足フィールドはありません。</div>`
        return
    }

    dom.accountIntegrityResult.innerHTML = `
        <div class="accountIntegrityWarn">
            <strong>${problems.length}件の不足フィールドがあります</strong>
            ${problems.map(({ user, missing }) => `
                <div class="accountIntegrityItem">
                    <b>${escapeHtml(user.name || user.email || user.id)}</b>
                    <span>不足：${missing.map(escapeHtml).join(" / ")}</span>
                    <button class="repairUserDocBtn" data-user-id="${escapeHtml(user.id)}">補完</button>
                </div>
            `).join("")}
        </div>
    `

    dom.accountIntegrityResult.querySelectorAll(".repairUserDocBtn").forEach((button) => {
        button.addEventListener("click", () => repairUserDocument(button.dataset.userId))
    })
}

export async function repairUserDocument(userId) {
    const user = state.allUsers.find((item) => item.id === userId)
    if (!user) return

    const repair = {
        uid: user.uid || user.id,
        name: user.name || user.email || "名前未設定",
        email: user.email || "",
        role: user.role || "employee",
        accountStatus: user.accountStatus || user.status || "active",
        status: user.status || user.accountStatus || "active",
        inactiveAt: user.inactiveAt ?? null,
        inactiveReason: user.inactiveReason || "",
        loginSessionId: user.loginSessionId || "",
        loginDeviceName: user.loginDeviceName || "",
        loginDeviceUpdatedAt: user.loginDeviceUpdatedAt ?? null
    }

    try {
        await updateDoc(doc(db, "users", user.id), repair)
        await reloadUsers()
        const { renderUsers } = await import("../ui.js")
        renderUsers()
        await checkAccountIntegrity()
        showSuccess("不足フィールドを補完しました")
    } catch (error) {
        console.log(error)
        showError("補完に失敗しました", "ACC-009")
    }
}

export async function renderRoleChangeLogs() {
    if (!dom.roleChangeLogList) return

    try {
        const snapshot = await getDocs(query(collection(db, "roleChangeLogs"), orderBy("createdAt", "desc"), limit(10)))
        const logs = []
        snapshot.forEach((docItem) => logs.push({ id: docItem.id, ...docItem.data() }))

        if (logs.length === 0) {
            dom.roleChangeLogList.innerHTML = `<div class="roleLogEmpty">権限変更ログはまだありません。</div>`
            return
        }

        dom.roleChangeLogList.innerHTML = logs.map((log) => `
            <div class="roleLogItem">
                <strong>${escapeHtml(formatDate(log.createdAt))}</strong>
                <span>${escapeHtml(log.actorName || log.actorEmail || "管理者")} が ${escapeHtml(log.targetName || log.targetEmail || "社員")} を ${escapeHtml(getRoleLabel(log.oldRole))} → ${escapeHtml(getRoleLabel(log.newRole))} に変更</span>
            </div>
        `).join("")
    } catch (error) {
        console.log(error)
        dom.roleChangeLogList.innerHTML = `<div class="roleLogEmpty">ログの読み込みに失敗しました。</div>`
    }
}

async function userEmailExistsInFirestore(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase()
    if (!normalizedEmail) return false

    const snapshot = await getDocs(
        query(collection(db, "users"), where("email", "==", normalizedEmail), limit(1))
    )

    return !snapshot.empty
}

function normalizeRole(role) {
    return role === "admin" ? "admin" : "employee"
}

function clearCreateForm() {
    if (dom.newAccountName) dom.newAccountName.value = ""
    if (dom.newAccountEmail) dom.newAccountEmail.value = ""
    if (dom.newAccountPassword) dom.newAccountPassword.value = ""
    if (dom.newAccountRole) dom.newAccountRole.value = "employee"
}

function getCreateAccountErrorCode(error) {
    const code = error?.code || ""

    if (code === "auth/email-already-in-use") return "ACC-001"
    if (code === "auth/invalid-email") return "ACC-005"
    if (code === "auth/weak-password") return "ACC-006"
    if (code === "permission-denied") return "PERM-002"

    return "ACC-999"
}

function getCreateAccountErrorMessage(error) {
    const code = error?.code || ""
    if (code === "auth/email-already-in-use") return "このメールアドレスは既にAuthenticationに登録されています"
    if (code === "auth/invalid-email") return "メールアドレスの形式が正しくありません"
    if (code === "auth/weak-password") return "パスワードが弱すぎます"
    if (code === "permission-denied") return "Firestoreへの登録権限がありません"
    return "社員アカウントの作成に失敗しました"
}

function getRoleLabel(role) {
    return role === "admin" ? "管理者" : "社員"
}

function formatDate(value) {
    if (!value) return "-"
    if (value?.toDate) return value.toDate().toLocaleString()
    if (value?.seconds) return new Date(value.seconds * 1000).toLocaleString()
    if (value instanceof Date) return value.toLocaleString()
    return String(value)
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}
