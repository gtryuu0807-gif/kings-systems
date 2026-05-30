import { db, auth } from "../firebase.js"
import { dom } from "../dom.js"
import { state } from "../state.js"

import {
    doc,
    getDoc,
    setDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {
    showMainScreen
} from "../ui.js"

import {
    renderHistory,
    renderNotices,
    updateWorkButtons
} from "../ui.js"

import { renderMySummary } from "../ui/summary.js"
import { renderMyWorkChart } from "../ui/charts.js"
import { showSuccess, showError, showWarning, showInfo } from "../notify.js"

const SETTINGS_DOC_PATH = ["settings", "app"]

const defaultMaintenanceSettings = {
    maintenanceMode: false,
    maintenanceTitle: "現在メンテナンス中です",
    maintenanceMessage: "現在、システムメンテナンスを実施しております。\nサービス再開までしばらくお待ちください。",
    maintenanceEndType: "unknown",
    maintenanceEndAt: null,
    maintenanceUpdatedByName: "-",
    maintenanceUpdatedByEmail: "",
    maintenanceUpdatedAt: null
}

export async function loadMaintenanceSettings() {
    try {
        const snapshot = await getDoc(getSettingsDocRef())

        if (!snapshot.exists()) {
            state.maintenanceSettings = { ...defaultMaintenanceSettings }
            return state.maintenanceSettings
        }

        state.maintenanceSettings = normalizeMaintenanceSettings(snapshot.data())
        return state.maintenanceSettings

    } catch (error) {
        console.log(error)
        state.maintenanceSettings = { ...defaultMaintenanceSettings }
        return state.maintenanceSettings
    }
}

export function startMaintenanceWatcher() {
    stopMaintenanceWatcher()

    state.maintenanceUnsubscribe = onSnapshot(
        getSettingsDocRef(),
        (snapshot) => {
            const wasMaintenance = isMaintenanceActiveForCurrentUser()

            if (snapshot.exists()) {
                state.maintenanceSettings = normalizeMaintenanceSettings(snapshot.data())
            } else {
                state.maintenanceSettings = { ...defaultMaintenanceSettings }
            }

            const isMaintenance = isMaintenanceActiveForCurrentUser()

            renderMaintenanceScreen()
            renderMaintenanceAdminForm()
            applyMaintenanceDisplay()

            if (wasMaintenance && !isMaintenance) {
                restoreAfterMaintenanceOff()
            }
        },
        (error) => {
            console.log(error)
        }
    )
}

export function stopMaintenanceWatcher() {
    if (state.maintenanceUnsubscribe) {
        state.maintenanceUnsubscribe()
        state.maintenanceUnsubscribe = null
    }
}

export function isMaintenanceActiveForCurrentUser() {
    return Boolean(
        state.maintenanceSettings?.maintenanceMode &&
        state.currentUserRole !== "admin"
    )
}

export function renderMaintenanceScreen() {
    const settings = state.maintenanceSettings || defaultMaintenanceSettings

    if (dom.maintenanceTitleView) {
        dom.maintenanceTitleView.textContent = settings.maintenanceTitle || defaultMaintenanceSettings.maintenanceTitle
    }

    if (dom.maintenanceMessageView) {
        dom.maintenanceMessageView.innerHTML = escapeHtml(
            settings.maintenanceMessage || defaultMaintenanceSettings.maintenanceMessage
        ).replaceAll("\n", "<br>")
    }

    if (dom.maintenanceEndView) {
        dom.maintenanceEndView.textContent = getMaintenanceEndLabel(settings)
    }

    if (dom.maintenanceUpdatedByView) {
        dom.maintenanceUpdatedByView.textContent = settings.maintenanceUpdatedByName || "-"
    }

    if (dom.maintenanceUpdatedAtView) {
        dom.maintenanceUpdatedAtView.textContent = formatDateTime(settings.maintenanceUpdatedAt)
    }
}

export function renderMaintenanceAdminForm() {
    const settings = state.maintenanceSettings || defaultMaintenanceSettings

    if (dom.maintenanceModeToggle) {
        dom.maintenanceModeToggle.checked = Boolean(settings.maintenanceMode)
    }

    if (dom.maintenanceCurrentStatus) {
        dom.maintenanceCurrentStatus.textContent = settings.maintenanceMode ? "ON" : "OFF"
        dom.maintenanceCurrentStatus.classList.toggle("on", Boolean(settings.maintenanceMode))
        dom.maintenanceCurrentStatus.classList.toggle("off", !settings.maintenanceMode)
    }

    updateAdminMaintenanceBanner()

    if (dom.maintenanceTitleInput) {
        dom.maintenanceTitleInput.value = settings.maintenanceTitle || defaultMaintenanceSettings.maintenanceTitle
    }

    if (dom.maintenanceMessageInput) {
        dom.maintenanceMessageInput.value = settings.maintenanceMessage || defaultMaintenanceSettings.maintenanceMessage
    }

    const endType = settings.maintenanceEndType === "datetime" ? "datetime" : "unknown"

    if (dom.maintenanceEndDatetimeRadio) {
        dom.maintenanceEndDatetimeRadio.checked = endType === "datetime"
    }

    if (dom.maintenanceEndUnknownRadio) {
        dom.maintenanceEndUnknownRadio.checked = endType === "unknown"
    }

    updateMaintenanceEndAtVisibility(endType)

    if (dom.maintenanceEndAtInput) {
        dom.maintenanceEndAtInput.value = toDatetimeLocalValue(settings.maintenanceEndAt)
        dom.maintenanceEndAtInput.disabled = endType === "unknown"
    }

    if (dom.maintenanceAdminUpdatedBy) {
        dom.maintenanceAdminUpdatedBy.textContent = settings.maintenanceUpdatedByName || "-"
    }

    if (dom.maintenanceAdminUpdatedAt) {
        dom.maintenanceAdminUpdatedAt.textContent = formatDateTime(settings.maintenanceUpdatedAt)
    }
}

export function setupMaintenanceFormEvents() {
    if (dom.maintenanceEndDatetimeRadio) {
        dom.maintenanceEndDatetimeRadio.addEventListener("change", () => {
            updateMaintenanceEndAtVisibility("datetime")
        })
    }

    if (dom.maintenanceEndUnknownRadio) {
        dom.maintenanceEndUnknownRadio.addEventListener("change", () => {
            updateMaintenanceEndAtVisibility("unknown")
        })
    }

    if (dom.saveMaintenanceBtn) {
        dom.saveMaintenanceBtn.addEventListener("click", () => {
            saveMaintenanceSettings()
        })
    }
}

export async function saveMaintenanceSettings() {
    if (state.currentUserRole !== "admin") {
        showError("管理者のみ設定できます")
        return
    }

    const title = dom.maintenanceTitleInput?.value.trim() || defaultMaintenanceSettings.maintenanceTitle
    const message = dom.maintenanceMessageInput?.value.trim() || defaultMaintenanceSettings.maintenanceMessage
    const endType = dom.maintenanceEndDatetimeRadio?.checked ? "datetime" : "unknown"
    const endAtValue = dom.maintenanceEndAtInput?.value || ""

    if (endType === "datetime" && !endAtValue) {
        showWarning("終了予定日時を入力するか、未定を選択してください")
        return
    }

    const user = auth.currentUser
    const updatedBy = getCurrentUserName()
    const now = new Date()

    const data = {
        maintenanceMode: Boolean(dom.maintenanceModeToggle?.checked),
        maintenanceTitle: title,
        maintenanceMessage: message,
        maintenanceEndType: endType,
        maintenanceEndAt: endType === "datetime" ? new Date(endAtValue) : null,
        maintenanceUpdatedByName: updatedBy,
        maintenanceUpdatedByEmail: user?.email || "",
        maintenanceUpdatedAt: now
    }

    showInfo("メンテナンス設定を保存中...")

    try {
        await setDoc(getSettingsDocRef(), data, { merge: true })
        state.maintenanceSettings = normalizeMaintenanceSettings(data)
        renderMaintenanceScreen()
        renderMaintenanceAdminForm()
        applyMaintenanceDisplay()
        showSuccess("メンテナンス設定を保存しました")

    } catch (error) {
        console.log(error)
        showError("メンテナンス設定の保存に失敗しました")
    }
}

export function applyMaintenanceDisplay() {
    if (!dom.maintenanceScreen) return

    updateAdminMaintenanceBanner()

    const isMaintenance = isMaintenanceActiveForCurrentUser()

    if (isMaintenance) {
        dom.maintenanceScreen.classList.add("show")

        if (dom.mainScreen) dom.mainScreen.style.display = "none"
        if (dom.adminScreen) dom.adminScreen.style.display = "none"
        if (dom.openAdminBtn) dom.openAdminBtn.style.display = "none"

        return
    }

    dom.maintenanceScreen.classList.remove("show")

    if (state.currentUserRole === "admin") {
        if (dom.openAdminBtn) dom.openAdminBtn.style.display = "block"
        return
    }

    if (dom.openAdminBtn) dom.openAdminBtn.style.display = "none"

    if (dom.appContent?.style.display === "block") {
        showMainScreen()
    }
}

export function restoreAfterMaintenanceOff() {
    if (state.currentUserRole === "admin") return
    if (isMaintenanceActiveForCurrentUser()) return

    renderHistory()
    renderNotices()
    renderMySummary()
    renderMyWorkChart()
    updateWorkButtons()
    showMainScreen()
}

function updateMaintenanceEndAtVisibility(endType) {
    const isUnknown = endType === "unknown"

    if (dom.maintenanceEndAtInput) {
        dom.maintenanceEndAtInput.disabled = isUnknown
    }

    if (dom.maintenanceEndAtField) {
        dom.maintenanceEndAtField.style.display = isUnknown ? "none" : "block"
    }
}

function updateAdminMaintenanceBanner() {
    if (!dom.adminMaintenanceBanner) return

    const isOn = Boolean(state.maintenanceSettings?.maintenanceMode)

    dom.adminMaintenanceBanner.classList.toggle("show", isOn)
}

function getSettingsDocRef() {
    return doc(db, ...SETTINGS_DOC_PATH)
}

function normalizeMaintenanceSettings(data = {}) {
    return {
        ...defaultMaintenanceSettings,
        ...data,
        maintenanceMode: Boolean(data.maintenanceMode),
        maintenanceEndType: data.maintenanceEndType === "datetime" ? "datetime" : "unknown"
    }
}

function getMaintenanceEndLabel(settings) {
    if (settings.maintenanceEndType !== "datetime") {
        return "未定"
    }

    return formatDateTime(settings.maintenanceEndAt)
}

function getCurrentUserName() {
    const user = auth.currentUser

    if (!user) return "管理者"

    const email = String(user.email || "").toLowerCase()

    const userData = state.allUsers.find((item) => {
        return (
            item.uid === user.uid ||
            String(item.email || "").toLowerCase() === email
        )
    })

    return userData?.name || user.email || "管理者"
}

function toDatetimeLocalValue(value) {
    const date = getDate(value)

    if (!date) return ""

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hour = String(date.getHours()).padStart(2, "0")
    const minute = String(date.getMinutes()).padStart(2, "0")

    return `${year}-${month}-${day}T${hour}:${minute}`
}

function formatDateTime(value) {
    const date = getDate(value)

    if (!date) return "-"

    return date.toLocaleString()
}

function getDate(value) {
    if (!value) return null

    if (value.seconds) {
        return new Date(value.seconds * 1000)
    }

    if (value instanceof Date) {
        return value
    }

    return null
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}
