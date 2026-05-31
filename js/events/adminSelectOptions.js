import { dom } from "../dom.js"
import { state } from "../state.js"

export function renderAdminSelectOptions() {
    renderEmployeeOptions(dom.employeeSelect)
    renderEmployeeOptions(dom.adminManualEmployeeSelect)
    renderEmployeeOptions(dom.adminHistoryEmployeeSelect)
    renderEmployeeOptions(dom.adminHolidayEmployeeSelect)
}

function renderEmployeeOptions(selectElement) {
    if (!selectElement) return

    const currentValue = selectElement.value
    const users = Array.isArray(state.allUsers) ? state.allUsers : []

    selectElement.innerHTML = `<option value="">社員を選択してください</option>`

    users
        .filter((user) => user && (user.id || user.uid || user.email))
        .sort((a, b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || ""), "ja"))
        .forEach((user) => {
            const option = document.createElement("option")
            const userId = user.id || user.uid || user.email

            option.value = userId
            option.textContent = `${user.name || user.email || userId} / ${user.role === "admin" ? "管理者" : "社員"}`

            if (userId === currentValue) {
                option.selected = true
            }

            selectElement.appendChild(option)
        })
}

