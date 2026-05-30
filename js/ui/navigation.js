import { dom } from "../dom.js"
import { state } from "../state.js"
import { showError } from "../notify.js"

import {
    showAdminTab
} from "./adminTabs.js"

import {
    showMainTab
} from "./mainTabs.js"

export function toggleMenu() {
    const isOpen = !dom.topMenu.classList.contains("menu-open")

    dom.topMenu.classList.toggle("menu-open", isOpen)
    dom.menuDropdown.style.display = isOpen ? "block" : "none"
}

export function closeMenu() {
    dom.topMenu.classList.remove("menu-open")
    dom.menuDropdown.style.display = "none"
}

export function showMainScreen() {
    dom.mainScreen.style.display = "block"
    dom.adminScreen.style.display = "none"

    showMainTab("history")
}

export function showAdminScreen() {
    if (state.currentUserRole !== "admin") {
        if (dom.openAdminBtn) {
            dom.openAdminBtn.style.display = "none"
            dom.openAdminBtn.hidden = true
            dom.openAdminBtn.disabled = true
        }

        if (dom.adminScreen) {
            dom.adminScreen.style.display = "none"
        }

        if (dom.mainScreen) {
            dom.mainScreen.style.display = "block"
        }

        showMainTab("history")
        showError("管理者のみアクセスできます", "ROLE-002")
        return
    }

    dom.mainScreen.style.display = "none"
    dom.adminScreen.style.display = "block"

    showAdminTab("dashboard")
}

