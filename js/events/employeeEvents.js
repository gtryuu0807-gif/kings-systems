import { dom } from "../dom.js"
import { createEmployeeAccount, checkAccountIntegrity, renderRoleChangeLogs } from "../admin/accountManagement.js"

import {
    renderUsers
} from "../ui.js"

export function setupEmployeeEvents() {
    if (dom.addEmployeeBtn) {
        dom.addEmployeeBtn.addEventListener("click", () => {})
    }

    if (dom.createAccountBtn) {
        dom.createAccountBtn.addEventListener("click", () => {
            createEmployeeAccount()
        })
    }

    if (dom.checkAccountIntegrityBtn) {
        dom.checkAccountIntegrityBtn.addEventListener("click", () => {
            checkAccountIntegrity()
        })
    }

    renderRoleChangeLogs()

    if (dom.employeeSelect) {
        dom.employeeSelect.addEventListener("change", () => {
            renderUsers()
        })
    }
}

