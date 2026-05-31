import { dom } from "../dom.js"
import { state } from "../state.js"

import { closeMenu, toggleMenu, showMainScreen, showAdminScreen, renderHistory, renderUsers } from "../ui.js"
import { showMainTab } from "../ui/mainTabs.js"
import { showAdminTab } from "../ui/adminTabs.js"
import { renderMySummary } from "../ui/summary.js"
import { renderMyWorkChart } from "../ui/charts.js"
import { logout } from "../auth.js"
import { showError } from "../notify.js"
import { renderAdminSelectOptions } from "./adminSelectOptions.js"

export function setupMenuEvents() {
    prepareMenuOverlay()

    dom.menuBtn?.addEventListener("click", (event) => {
        event.preventDefault()
        event.stopPropagation()
        syncAdminButton()
        toggleMenu()
    })

    dom.menuCloseBtn?.addEventListener("click", (event) => {
        event.preventDefault()
        event.stopPropagation()
        closeMenu()
    })

    dom.menuDropdown?.addEventListener("click", (event) => {
        const routeTarget = event.target.closest?.("[data-menu-route]")
        const logoutTarget = event.target.closest?.("#menuLogoutBtn")
        const closeTarget = event.target.closest?.("#menuCloseBtn, .kingsMenuBackdrop")

        if (routeTarget) {
            event.preventDefault()
            event.stopPropagation()
            handleMenuRoute(routeTarget.dataset.menuRoute || "")
            return
        }

        if (logoutTarget) {
            event.preventDefault()
            event.stopPropagation()
            closeMenu()
            logout()
            return
        }

        if (!closeTarget) return

        event.preventDefault()
        event.stopPropagation()
        closeMenu()
    }, false)

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu()
    })
}

function handleMenuRoute(route = "") {
    syncAdminButton()

    if (route === "main") {
        showMainScreen({ animate: false })
        window.setTimeout(() => {
            showMainTab("history")
            renderHistory()
            renderMySummary()
            renderMyWorkChart()
        }, 0)
        closeMenu()
        return
    }


    if (route === "info") {
        showInfoScreen()
        closeMenu()
        return
    }

    if (route === "settings") {
        showSettingsScreen()
        closeMenu()
        return
    }

    if (route === "holiday") {
        if (state.currentUserRole === "admin") {
            showAdminScreen()
            window.setTimeout(() => showAdminTab("holiday"), 80)
        } else {
            showMainScreen({ animate: false })
            window.setTimeout(() => showMainTab("holiday"), 0)
        }
        closeMenu()
        return
    }

    if (route.startsWith("admin:")) {
        if (state.currentUserRole !== "admin") {
            syncAdminButton()
            showMainScreen({ animate: false })
            closeMenu()
            showError("管理者のみアクセスできます", "ROLE-002")
            return
        }

        const tabName = route.split(":")[1] || "dashboard"
        showAdminScreen()
        window.setTimeout(() => {
            renderAdminSelectOptions()
            renderUsers()
            showAdminTab(tabName)
        }, 90)
        closeMenu()
        return
    }

    closeMenu()
}

function showInfoScreen() {
    const loginArea = document.getElementById("loginArea")
    const appContent = document.getElementById("appContent")
    const mainScreen = document.getElementById("mainScreen")
    const adminScreen = document.getElementById("adminScreen")
    const settingsScreen = document.getElementById("settingsScreen")
    const infoScreen = document.getElementById("infoScreen")
    const maintenanceScreen = document.getElementById("maintenanceScreen")

    if (loginArea) loginArea.style.display = "none"
    if (appContent) appContent.style.display = "block"
    if (mainScreen) mainScreen.style.display = "none"
    if (adminScreen) adminScreen.style.display = "none"
    if (maintenanceScreen) maintenanceScreen.classList.remove("show")
    if (settingsScreen) {
        settingsScreen.hidden = true
        settingsScreen.classList.remove("show")
        settingsScreen.style.display = "none"
    }
    if (infoScreen) {
        infoScreen.hidden = false
        infoScreen.classList.add("show")
        infoScreen.style.display = "block"
    }

    document.body.classList.remove("kt-screen-main", "kt-screen-admin", "kt-screen-settings")
    document.body.classList.add("kt-main-ready", "kt-screen-info")
    window.dispatchEvent(new CustomEvent("kings:screen-changed"))
}

function showSettingsScreen() {
    const loginArea = document.getElementById("loginArea")
    const appContent = document.getElementById("appContent")
    const mainScreen = document.getElementById("mainScreen")
    const adminScreen = document.getElementById("adminScreen")
    const settingsScreen = document.getElementById("settingsScreen")
    const infoScreen = document.getElementById("infoScreen")
    const maintenanceScreen = document.getElementById("maintenanceScreen")

    if (loginArea) loginArea.style.display = "none"
    if (appContent) appContent.style.display = "block"
    if (mainScreen) mainScreen.style.display = "none"
    if (adminScreen) adminScreen.style.display = "none"
    if (maintenanceScreen) maintenanceScreen.classList.remove("show")
    if (infoScreen) {
        infoScreen.hidden = true
        infoScreen.classList.remove("show")
        infoScreen.style.display = "none"
    }
    if (settingsScreen) {
        settingsScreen.hidden = false
        settingsScreen.classList.add("show")
        settingsScreen.style.display = "block"
    }

    document.body.classList.remove("kt-screen-main", "kt-screen-admin", "kt-screen-info")
    document.body.classList.add("kt-main-ready", "kt-screen-settings")
    window.dispatchEvent(new CustomEvent("kings:screen-changed"))
}

function prepareMenuOverlay() {
    if (!dom.menuDropdown) return
    dom.menuDropdown.classList.add("kingsMenuOverlay")
    dom.menuDropdown.setAttribute("aria-hidden", "true")

    if (dom.menuDropdown.parentElement !== document.body) {
        document.body.appendChild(dom.menuDropdown)
    }
}

function syncAdminButton() {
    const isAdmin = state.currentUserRole === "admin"
    const isAdminScreen = dom.adminScreen && window.getComputedStyle(dom.adminScreen).display !== "none"

    if (dom.openAdminBtn) {
        dom.openAdminBtn.style.display = isAdmin ? "flex" : "none"
        dom.openAdminBtn.hidden = !isAdmin
        dom.openAdminBtn.disabled = !isAdmin
    }

    dom.menuDropdown?.querySelectorAll(".adminOnly").forEach((button) => {
        button.style.display = isAdmin ? "flex" : "none"
        button.hidden = !isAdmin
        button.disabled = !isAdmin
    })

    const mainSection = dom.menuDropdown?.querySelector('[data-menu-section="main"]')
    const adminSection = dom.menuDropdown?.querySelector('[data-menu-section="admin"]')

    if (mainSection) mainSection.style.display = isAdmin && isAdminScreen ? "none" : "block"
    if (adminSection) adminSection.style.display = isAdmin && isAdminScreen ? "block" : "none"
}
