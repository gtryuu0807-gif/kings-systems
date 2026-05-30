import { dom } from "../dom.js"
import { state } from "../state.js"

export function renderAdminSelectOptions() {
    renderEmployeeOptions(dom.adminManualEmployeeSelect)
    renderEmployeeOptions(dom.adminHistoryEmployeeSelect)
    renderEmployeeOptions(dom.adminHolidayEmployeeSelect)
}

function renderEmployeeOptions(selectElement) {
    if (!selectElement) return

    const currentValue = selectElement.value

    selectElement.innerHTML =
        `<option value="">社員を選択してください</option>`

    state.allUsers.forEach((user) => {
        const option = document.createElement("option")

        option.value = user.id

        option.textContent =
            `${user.name || user.email} / ${user.role === "admin" ? "管理者" : "社員"}`

        if (user.id === currentValue) {
            option.selected = true
        }

        selectElement.appendChild(option)
    })
}

