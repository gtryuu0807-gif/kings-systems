import { dom } from "../dom.js"
import { state } from "../state.js"
import { escapeHtml } from "../utils.js"

import {
    updateUserRole
} from "../admin/roles.js"

import {
    updateUserName,
    deleteUserData
} from "../admin/employees.js"

import {
    activateUser,
    setUserInactive,
    getAccountStatusLabel,
    getInactiveReasonLabel,
    formatDateTime,
    isAccountInactive
} from "../accountStatus.js"

import {
    getIncompleteAttendanceCountByUser
} from "../unclosedAttendance.js"

export function renderUsers() {
    renderEmployeeSelect()

    const selectedUserId = dom.employeeSelect.value

    if (!selectedUserId) {
        dom.employeeList.innerHTML = `
        <div class="employeeEmptyBox">
            <strong>社員が選択されていません</strong>
            <p>上のリストから、確認・編集したい社員を選択してください。</p>
        </div>
        `
        return
    }

    const user = state.allUsers.find((item) => {
        return item.id === selectedUserId
    })

    if (!user) {
        dom.employeeList.innerHTML = `
        <div class="employeeEmptyBox">
            <strong>社員情報が見つかりません</strong>
            <p>社員一覧を更新してから、もう一度選択してください。</p>
        </div>
        `
        return
    }

    const roleLabel = getRoleLabel(user.role)
    const inactive = isAccountInactive(user)
    const statusLabel = getAccountStatusLabel(user)
    const statusClass = inactive ? "inactive" : "active"
    const incompleteCount = getIncompleteAttendanceCountByUser(user)

    dom.employeeList.innerHTML = `
    <div class="employeeSelectedCard">

        <div class="employeeDetailBox">
            <div>
                <span>社員名</span>
                <strong>${createUserInlineIcon(user.role)} ${escapeHtml(user.name || "名前未設定")}</strong>
            </div>

            <div>
                <span>メールアドレス</span>
                <strong>${escapeHtml(user.email || "メール未設定")}</strong>
            </div>

            <div>
                <span>現在の権限</span>
                <strong>${roleLabel}</strong>
            </div>

            <div>
                <span>利用状態</span>
                <strong class="accountStatusBadge ${statusClass}">${escapeHtml(statusLabel)}</strong>
            </div>

            <div>
                <span>最終ログイン</span>
                <strong>${escapeHtml(formatDateTime(user.lastLoginAt))}</strong>
            </div>

            <div>
                <span>休止理由</span>
                <strong>${escapeHtml(getInactiveReasonLabel(user))}</strong>
            </div>

            <div>
                <span>未打刻件数</span>
                <strong class="incompleteCountText ${incompleteCount > 0 ? "hasIncomplete" : ""}">
                    ${incompleteCount}件
                </strong>
            </div>
        </div>

        <div class="employeeActionSection">
            <h5>社員情報を変更</h5>
            <p>社員名や権限を変更できます。</p>

            <button class="nameChangeBtn" data-user-id="${escapeHtml(user.id)}">
                社員名を変更
            </button>

            <button class="roleChangeBtn" data-user-id="${escapeHtml(user.id)}" data-next-role="${user.role === "admin" ? "employee" : "admin"}">
                ${user.role === "admin" ? "社員に変更" : "管理者に変更"}
            </button>
        </div>

        <div class="employeeAccountSection">
            <h5>アカウント状態</h5>
            <p>
                ${inactive
                    ? "この社員は休止状態です。利用再開する場合は解除してください。"
                    : "この社員は利用中です。必要に応じて手動で休止状態にできます。"
                }
            </p>

            ${inactive ? `
            <button class="accountActivateBtn" data-user-id="${escapeHtml(user.id)}">
                休止状態を解除
            </button>
            ` : `
            <button class="accountInactiveBtn" data-user-id="${escapeHtml(user.id)}">
                アカウントを休止
            </button>
            `}
        </div>

        <div class="employeeDangerSection">
            <h5>危険な操作</h5>
            <p>社員情報を削除します。ログインアカウント本体は削除されません。</p>

            <button class="deleteEmployeeBtn" data-user-id="${escapeHtml(user.id)}" data-email="${escapeHtml(user.email)}">
                社員情報を削除
            </button>
        </div>

    </div>
    `

    const nameChangeBtn = dom.employeeList.querySelector(".nameChangeBtn")
    const roleChangeBtn = dom.employeeList.querySelector(".roleChangeBtn")
    const deleteBtn = dom.employeeList.querySelector(".deleteEmployeeBtn")
    const inactiveBtn = dom.employeeList.querySelector(".accountInactiveBtn")
    const activateBtn = dom.employeeList.querySelector(".accountActivateBtn")

    nameChangeBtn.addEventListener("click", () => {
        const newName = prompt("新しい社員名を入力してください", user.name || "")

        updateUserName(user.id, newName)
    })

    roleChangeBtn.addEventListener("click", () => {
        updateUserRole(user.id, roleChangeBtn.dataset.nextRole)
    })

    if (inactiveBtn) {
        inactiveBtn.addEventListener("click", async () => {
            const ok = confirm("この社員を休止状態にしますか？\n休止中の社員はログインできません。")

            if (!ok) return

            await setUserInactive(user.id, "manual")
            renderUsers()
        })
    }

    if (activateBtn) {
        activateBtn.addEventListener("click", async () => {
            const ok = confirm("この社員の休止状態を解除しますか？")

            if (!ok) return

            await activateUser(user.id)
            renderUsers()
        })
    }

    deleteBtn.addEventListener("click", () => {
        deleteUserData(user.id, user.email)
    })
}

function renderEmployeeSelect() {
    const currentValue = dom.employeeSelect.value

    dom.employeeSelect.innerHTML = `
    <option value="">社員を選択してください</option>
    `

    state.allUsers.forEach((user) => {
        const option = document.createElement("option")
        option.value = user.id
        option.textContent = user.name || user.email || "名前未設定"

        if (user.id === currentValue) {
            option.selected = true
        }

        dom.employeeSelect.appendChild(option)
    })
}

function getRoleLabel(role) {
    if (role === "admin") {
        return "管理者"
    }

    return "社員"
}

function createUserInlineIcon(role) {
    if (role === "admin") {
        return `<span class="inlineSvgIcon inlineAdminBadge" aria-hidden="true"></span>`
    }

    return `<span class="inlineSvgIcon inlineEmployeeCard" aria-hidden="true"></span>`
}
