import { dom } from "../dom.js"
import { state } from "../state.js"

import {
    toggleMenu,
    closeMenu,
    showMainScreen,
    showAdminScreen,
    renderHistory,
    renderUsers
} from "../ui.js"

import {
    renderMySummary
} from "../ui/summary.js"

import {
    renderMyWorkChart
} from "../ui/charts.js"

import {
    logout
} from "../auth.js"

import { showError } from "../notify.js"

import {
    renderAdminSelectOptions
} from "./adminSelectOptions.js"

export function setupMenuEvents() {
    dom.menuBtn.addEventListener("click", () => {
        if (dom.openAdminBtn) {
            const isAdmin = state.currentUserRole === "admin"
            dom.openAdminBtn.style.display = isAdmin ? "block" : "none"
            dom.openAdminBtn.hidden = !isAdmin
            dom.openAdminBtn.disabled = !isAdmin
        }

        toggleMenu()
    })

    dom.openMainBtn.addEventListener("click", () => {
        showMainScreen()
        closeMenu()

        renderHistory()
        renderMySummary()
        renderMyWorkChart()
    })

    dom.openAdminBtn.addEventListener("click", () => {
        if (state.currentUserRole !== "admin") {
            dom.openAdminBtn.style.display = "none"
            showMainScreen()
            closeMenu()
            showError("管理者のみアクセスできます", "ROLE-002")
            return
        }

        showAdminScreen()
        renderAdminSelectOptions()
        renderUsers()

        closeMenu()
    })

    dom.menuLogoutBtn.addEventListener("click", () => {
        closeMenu()
        logout()
    })

    document.addEventListener("click", (event) => {
        if (!dom.topMenu.contains(event.target)) {
            closeMenu()
        }
    })

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu()
        }
    })
}

