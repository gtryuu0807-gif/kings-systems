import { state } from "./state.js"
// Kings V3 menu router
// Separates three menu contexts:
// 1) Employee main screen menu: Main / Settings / Logout
// 2) Admin main screen menu: Main / Admin screen / Settings / Logout
// 3) Admin screen menu: Admin-only tab routes / Main / Logout
let installed = false
let busy = false
let lastPointerAt = 0

export function installKingsV3MenuRoutePatch() {
    if (installed) return
    installed = true

    document.addEventListener("pointerup", handleMenuAction, true)
    document.addEventListener("click", handleMenuAction, true)
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenuHard()
    })

    document.addEventListener("click", (event) => {
        if (event.target?.closest?.("#settingsBackToMainBtn")) {
            event.preventDefault()
            openMainTab("history")
        }
    }, true)

    document.addEventListener("click", (event) => {
        if (event.target?.closest?.("#menuBtn")) {
            window.setTimeout(syncMenuContext, 0)
            window.setTimeout(syncMenuContext, 80)
            window.setTimeout(syncMenuContext, 250)
        }
    }, true)

    window.addEventListener("kings:screen-changed", syncMenuContext)
    window.addEventListener("kings:user-role-changed", syncMenuContext)
    window.setTimeout(syncMenuContext, 500)
    window.setTimeout(syncMenuContext, 1200)
}

function handleMenuAction(event) {
    const target = event.target?.closest?.(
        "#menuBtn, #menuDropdown .kingsMenuItem, #menuDropdown [data-menu-route], #menuLogoutBtn, #menuCloseBtn, #menuDropdown .kingsMenuBackdrop"
    )

    if (!target) return

    if (target.id === "menuBtn") {
        window.setTimeout(syncMenuContext, 0)
        return
    }

    const now = Date.now()
    if (event.type === "click" && now - lastPointerAt < 650) {
        event.preventDefault()
        event.stopImmediatePropagation()
        return
    }
    if (event.type === "pointerup") lastPointerAt = now

    event.preventDefault()
    event.stopImmediatePropagation()

    if (target.id === "menuCloseBtn" || target.classList.contains("kingsMenuBackdrop")) {
        closeMenuHard()
        return
    }

    if (target.id === "menuLogoutBtn") {
        closeMenuHard()
        window.setTimeout(logoutSafely, 80)
        return
    }

    const route = target.dataset?.menuRoute || ""
    if (!route || busy) return

    busy = true
    closeMenuHard()

    window.setTimeout(() => {
        try {
            routeMenu(route)
        } catch (error) {
            console.error("Kings menu route failed:", route, error)
            notifySafely("メニュー遷移に失敗しました", "APP-MENU-001")
        } finally {
            window.setTimeout(() => { busy = false }, 180)
        }
    }, 60)
}

function routeMenu(route) {
    if (route === "main") {
        openMainTab("history")
        return
    }

    if (route === "settings") {
        openSettingsScreen()
        return
    }

    if (route.startsWith("admin:")) {
        if (!isAdminUser()) {
            openMainTab("history")
            notifySafely("管理者のみアクセスできます", "ROLE-002")
            return
        }

        const tabName = route.split(":")[1] || "dashboard"
        openAdminTab(tabName)
        return
    }
}

function openMainTab(tabName = "history") {
    closeSettingsScreen()
    forceBaseVisible("main")
    document.body.classList.remove("kt-screen-admin", "kt-transitioning", "kt-screen-switching", "kt-screen-run")
    document.body.classList.add("kt-main-ready", "kt-screen-main")

    window.requestAnimationFrame(() => {
        activateTab({
            buttonSelector: `.mainTabBtn[data-main-tab="${cssEscape(tabName)}"]`,
            panelPrefix: "mainTab",
            panelName: tabName,
            allPanelsSelector: ".mainTabPanel",
            activeButtonSelector: ".mainTabBtn"
        })
        syncMenuContext()
        emitScreenChanged()
    })
}

function openSettingsScreen() {
    forceBaseVisible("settings")
    document.body.classList.remove("kt-screen-main", "kt-screen-admin", "kt-transitioning", "kt-screen-switching", "kt-screen-run")
    document.body.classList.add("kt-main-ready", "kt-screen-settings")

    window.requestAnimationFrame(() => {
        const settingsScreen = document.getElementById("settingsScreen")
        if (settingsScreen) {
            settingsScreen.hidden = false
            settingsScreen.classList.add("show")
            settingsScreen.style.display = "block"
        }
        syncMenuContext()
        emitScreenChanged()
    })
}

function closeSettingsScreen() {
    const settingsScreen = document.getElementById("settingsScreen")
    if (settingsScreen) {
        settingsScreen.classList.remove("show")
        settingsScreen.hidden = true
        settingsScreen.style.display = "none"
    }
    document.body.classList.remove("kt-screen-settings")
}

function openAdminTab(tabName = "dashboard") {
    closeSettingsScreen()
    forceBaseVisible("admin")
    document.body.classList.remove("kt-screen-main", "kt-transitioning", "kt-screen-switching", "kt-screen-run")
    document.body.classList.add("kt-main-ready", "kt-screen-admin")

    window.requestAnimationFrame(() => {
        activateTab({
            buttonSelector: `.adminTabBtn[data-admin-tab="${cssEscape(tabName)}"]`,
            panelPrefix: "adminTab",
            panelName: tabName,
            allPanelsSelector: ".adminTabPanel",
            activeButtonSelector: ".adminTabBtn"
        })
        syncMenuContext()
        emitScreenChanged()
    })
}

function forceBaseVisible(screen) {
    const loginArea = document.getElementById("loginArea")
    const appContent = document.getElementById("appContent")
    const mainScreen = document.getElementById("mainScreen")
    const adminScreen = document.getElementById("adminScreen")
    const settingsScreen = document.getElementById("settingsScreen")
    const maintenanceScreen = document.getElementById("maintenanceScreen")
    const welcomeBox = document.getElementById("welcomeBox")
    const topMenu = document.getElementById("topMenu")

    if (loginArea) loginArea.style.display = "none"
    if (appContent) appContent.style.display = "block"
    if (maintenanceScreen) maintenanceScreen.classList.remove("show")
    if (welcomeBox) welcomeBox.style.display = "flex"
    if (topMenu) topMenu.style.display = "block"

    if (settingsScreen) {
        settingsScreen.classList.toggle("show", screen === "settings")
        settingsScreen.hidden = screen !== "settings"
        settingsScreen.style.display = screen === "settings" ? "block" : "none"
    }

    if (screen === "admin") {
        if (mainScreen) mainScreen.style.display = "none"
        if (adminScreen) adminScreen.style.display = "block"
    } else if (screen === "settings") {
        if (mainScreen) mainScreen.style.display = "none"
        if (adminScreen) adminScreen.style.display = "none"
    } else {
        if (mainScreen) mainScreen.style.display = "block"
        if (adminScreen) adminScreen.style.display = "none"
    }
}

function activateTab({ buttonSelector, panelPrefix, panelName, allPanelsSelector, activeButtonSelector }) {
    const button = document.querySelector(buttonSelector)

    if (button) {
        button.hidden = false
        button.click()
    }

    document.querySelectorAll(activeButtonSelector).forEach((btn) => {
        const key = btn.dataset.adminTab || btn.dataset.mainTab
        btn.classList.toggle("active", key === panelName)
    })

    document.querySelectorAll(allPanelsSelector).forEach((panel) => {
        panel.classList.remove("show")
        panel.style.display = "none"
    })

    const panelId = `${panelPrefix}${capitalize(panelName)}`
    const panel = document.getElementById(panelId)
    if (panel) {
        panel.classList.add("show")
        panel.style.display = "block"
    }
}

function syncMenuContext() {
    const menu = document.getElementById("menuDropdown")
    if (!menu) return

    const isAdmin = isAdminUser()
    const isAdminScreen = isAdmin && isAdminScreenVisible()

    const mainSection = menu.querySelector('[data-menu-section="main"]')
    const adminSection = menu.querySelector('[data-menu-section="admin"]')
    const adminMainButton = document.getElementById("openAdminBtn")

    if (mainSection) mainSection.style.display = isAdminScreen ? "none" : "block"
    if (adminSection) adminSection.style.display = isAdminScreen ? "block" : "none"

    if (adminMainButton) {
        adminMainButton.style.display = isAdmin ? "flex" : "none"
        adminMainButton.hidden = !isAdmin
        adminMainButton.disabled = !isAdmin
    }

    menu.querySelectorAll(".adminOnly").forEach((el) => {
        el.style.display = isAdmin ? "flex" : "none"
        el.hidden = !isAdmin
        el.disabled = !isAdmin
    })
}

function closeMenuHard() {
    const menu = document.getElementById("menuDropdown")
    const topMenu = document.getElementById("topMenu")

    topMenu?.classList.remove("menu-open")

    if (menu) {
        menu.classList.remove("show", "open")
        menu.setAttribute("aria-hidden", "true")
    }

    document.documentElement.classList.remove("kings-menu-lock")
    document.body.classList.remove("kings-menu-lock")
    document.getElementById("menuBtn")?.setAttribute("aria-expanded", "false")
}

function isAdminScreenVisible() {
    const adminScreen = document.getElementById("adminScreen")
    if (!adminScreen) return false
    return window.getComputedStyle(adminScreen).display !== "none"
}

function isAdminUser() {
    // Source of truth must be the authenticated user's role.
    // The admin button may be hidden temporarily by screen transitions, so using
    // its current display state caused admin users to lose the admin main menu.
    if (state.currentUserRole === "admin") return true

    const adminButton = document.getElementById("openAdminBtn")
    if (!adminButton) return false
    const style = window.getComputedStyle(adminButton)
    return !adminButton.hidden && !adminButton.disabled && style.display !== "none" && style.visibility !== "hidden"
}

async function logoutSafely() {
    try {
        const mod = await import("./auth.js")
        await mod.logout?.()
    } catch (error) {
        console.error("Logout failed", error)
        notifySafely("ログアウトに失敗しました", "AUTH-LOGOUT-001")
    }
}

async function notifySafely(message, code) {
    try {
        const mod = await import("./notify.js")
        mod.showError?.(message, code)
    } catch (_) {
        console.warn(code, message)
    }
}

function emitScreenChanged() {
    window.dispatchEvent(new CustomEvent("kings:screen-changed"))
}

function capitalize(value = "") {
    return value.charAt(0).toUpperCase() + value.slice(1)
}

function cssEscape(value = "") {
    if (window.CSS?.escape) return window.CSS.escape(value)
    return String(value).replace(/"/g, "\\\"")
}

installKingsV3MenuRoutePatch()
