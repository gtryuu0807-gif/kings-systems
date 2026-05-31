import { state } from "./state.js"

const SCREEN_KEY = "kings:lastScreen"
const MAIN_TAB_KEY = "kings:lastMainTab"
const ADMIN_TAB_KEY = "kings:lastAdminTab"

export function saveCurrentScreen(screenName) {
    if (!screenName) return
    try { sessionStorage.setItem(SCREEN_KEY, screenName) } catch (_) {}
}

export function saveMainTab(tabName) {
    if (!tabName) return
    try {
        sessionStorage.setItem(SCREEN_KEY, "main")
        sessionStorage.setItem(MAIN_TAB_KEY, tabName)
    } catch (_) {}
}

export function saveAdminTab(tabName) {
    if (!tabName) return
    try {
        sessionStorage.setItem(SCREEN_KEY, "admin")
        sessionStorage.setItem(ADMIN_TAB_KEY, tabName)
    } catch (_) {}
}

export function getSavedScreenState() {
    try {
        return {
            screen: sessionStorage.getItem(SCREEN_KEY) || "main",
            mainTab: sessionStorage.getItem(MAIN_TAB_KEY) || "history",
            adminTab: sessionStorage.getItem(ADMIN_TAB_KEY) || "dashboard"
        }
    } catch (_) {
        return { screen: "main", mainTab: "history", adminTab: "dashboard" }
    }
}

export function shouldRestoreAdminScreen() {
    const saved = getSavedScreenState()
    return saved.screen === "admin" && state.currentUserRole === "admin"
}
