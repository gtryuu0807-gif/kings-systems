import { dom } from "../dom.js"
import { state } from "../state.js"
import { showError } from "../notify.js"
import { KingsTransitionController } from "../kingsTransitionController.js"

import {
    showAdminTab
} from "./adminTabs.js"

import {
    showMainTab
} from "./mainTabs.js"

function isEmployeeMaintenanceMode() {
    return Boolean(state.maintenanceSettings?.maintenanceMode && state.currentUserRole !== "admin")
}

function showMaintenanceOnly() {
    if (dom.maintenanceScreen) dom.maintenanceScreen.classList.add("show")
    if (dom.mainScreen) dom.mainScreen.style.display = "none"
    if (dom.adminScreen) dom.adminScreen.style.display = "none"
    if (dom.openAdminBtn) {
        dom.openAdminBtn.style.display = "none"
        dom.openAdminBtn.hidden = true
        dom.openAdminBtn.disabled = true
    }
    document.body.classList.add("kt-maintenance-ready")
}

function ensureMenuOverlayReady() {
    if (!dom.menuDropdown) return

    // Keep the overlay directly under <body>.
    // This prevents clipping or broken fixed positioning caused by transformed containers.
    if (dom.menuDropdown.parentElement !== document.body) {
        document.body.appendChild(dom.menuDropdown)
    }

    dom.menuDropdown.classList.add("kingsMenuOverlay")
}

function setMenuOpen(isOpen) {
    if (!dom.topMenu || !dom.menuDropdown) return

    ensureMenuOverlayReady()

    dom.topMenu.classList.toggle("menu-open", isOpen)
    dom.menuDropdown.classList.toggle("show", isOpen)
    dom.menuDropdown.classList.toggle("open", isOpen)
    dom.menuDropdown.setAttribute("aria-hidden", isOpen ? "false" : "true")
    dom.menuDropdown.style.display = "flex"
    dom.menuBtn?.setAttribute("aria-expanded", isOpen ? "true" : "false")
    document.documentElement.classList.toggle("kings-menu-lock", isOpen)
    document.body.classList.toggle("kings-menu-lock", isOpen)

    if (!isOpen) {
        window.setTimeout(() => {
            if (dom.menuDropdown?.getAttribute("aria-hidden") === "true") {
                dom.menuDropdown.classList.remove("show", "open")
            }
        }, 240)
    }
}

export function toggleMenu() {
    const isOpen = !dom.menuDropdown || dom.menuDropdown.getAttribute("aria-hidden") !== "false"
    setMenuOpen(isOpen)
}

export function closeMenu() {
    setMenuOpen(false)
}

export function showMainScreen(options = {}) {
    if (isEmployeeMaintenanceMode()) {
        showMaintenanceOnly()
        return
    }

    if (dom.maintenanceScreen) dom.maintenanceScreen.classList.remove("show")
    document.body.classList.remove("kt-maintenance-ready")

    dom.mainScreen.style.display = "block"
    dom.adminScreen.style.display = "none"

    showMainTab("history")

    if (options.animate !== false && document.body.classList.contains("kt-main-ready")) {
        KingsTransitionController.switchToMain()
    } else {
        document.body.classList.remove("kt-screen-admin")
        document.body.classList.add("kt-screen-main")
    }
}

export function showAdminScreen() {
    if (isEmployeeMaintenanceMode()) {
        showMaintenanceOnly()
        showError("現在メンテナンス中です", "MAINT-002")
        return
    }

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

    if (document.body.classList.contains("kt-main-ready")) {
        KingsTransitionController.switchToAdmin()
    } else {
        document.body.classList.remove("kt-screen-main")
        document.body.classList.add("kt-screen-admin")
    }
}

