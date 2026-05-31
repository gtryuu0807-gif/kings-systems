import { auth } from "./firebase.js"
import { dom } from "./dom.js"
import { state } from "./state.js"

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

import {
    reloadUsers,
    reloadAllData,
    ensureCurrentUserProfile,
    getRoleByAuthUser
} from "./data.js"

import {
    renderHistory,
    renderNotices,
    renderAdminHistory,
    renderUsers,
    renderAdminNoticeList,
    updateWorkButtons,
    showMainScreen,
    showWelcomeName,
    hideWelcomeName
} from "./ui.js"

import { renderMySummary, renderAdminSummary } from "./ui/summary.js"
import { renderAdminDashboard } from "./ui/dashboard.js"
import { renderMyWorkChart, renderAdminWorkChart } from "./ui/charts.js"

import {
    loadMaintenanceSettings,
    startMaintenanceWatcher,
    stopMaintenanceWatcher,
    renderMaintenanceScreen,
    renderMaintenanceAdminForm,
    isMaintenanceActiveForCurrentUser,
    applyMaintenanceDisplay
} from "./maintenance/maintenance.js"

import { showSuccess, showError, showWarning, showInfo } from "./notify.js"
import { escapeHtml } from "./utils.js"

import {
    getCurrentUserData,
    isAccountInactive,
    shouldAutoDeactivateUser,
    markCurrentUserAutoInactive,
    updateCurrentUserLastLogin,
    getInactiveMessage
} from "./accountStatus.js"


import {
    registerLoginSession,
    startLoginSessionWatcher,
    stopLoginSessionWatcher,
    clearCurrentLoginSession
} from "./loginSession.js"

import { renderIncompleteAttendanceAlert } from "./unclosedAttendance.js"
import { KingsTransitionController } from "./kingsTransitionController.js"

let isAutoLoginChecked = false
let isSettingUpLoginScreen = false
let hasShownLoginRoleNotice = false

export async function login() {
    if (state.isLoginBusy || isSettingUpLoginScreen) return

    const emailValue = dom.email.value.trim()
    const passwordValue = dom.password.value.trim()

    if (emailValue === "") {
        showWarning("メールアドレスを入力してください")
        return
    }

    if (passwordValue === "") {
        showWarning("パスワードを入力してください")
        return
    }

    state.isLoginBusy = true
    setLoginFormDisabled(true, "認証中...")
    dom.loginBtn.classList.add("loading")
    document.querySelector(".container")?.classList.add("loginLoading")

    try {
        const persistence =
            dom.keepLoginCheck.checked
                ? browserLocalPersistence
                : browserSessionPersistence

        await setPersistence(auth, persistence)

        const userCredential = await signInWithEmailAndPassword(
            auth,
            emailValue,
            passwordValue
        )

        await setupLoggedInScreen(userCredential.user, {
            showLoginSuccess: true,
            showRoleNotice: true
        })

    } catch (error) {
        console.log(error)
        setLoginFormDisabled(false)
        showError(getLoginErrorMessage(error), getLoginErrorCode(error))

    } finally {
        state.isLoginBusy = false
        dom.loginBtn.classList.remove("loading")
        if (!auth.currentUser) {
            setLoginFormDisabled(false)
        }
        document.querySelector(".container")?.classList.remove("loginLoading")
    }
}

export function watchLoginState() {
    if (isAutoLoginChecked) return

    isAutoLoginChecked = true

    onAuthStateChanged(auth, async (user) => {
        if (!user) return
        if (state.isLoginBusy) return
        if (isSettingUpLoginScreen) return
        if (dom.appContent.style.display === "block") return

        setLoginFormDisabled(true, "")
        document.body.classList.add("auto-auth-checking")

        try {
            await setupLoggedInScreen(user, {
                showLoginSuccess: true,
                showRoleNotice: true,
                autoLogin: true
            })

        } catch (error) {
            console.log(error)
            setLoginFormDisabled(false)
            document.body.classList.remove("auto-auth-checking")
            showError("自動ログインに失敗しました", "AUTH-010")
        }
    })
}

export function togglePasswordVisibility() {
    if (!dom.password || !dom.passwordToggleBtn) return
    if (dom.passwordToggleBtn.disabled) return

    const isHidden = dom.password.type === "password"

    dom.password.type = isHidden ? "text" : "password"
    updatePasswordToggleButton()
}

export async function logout(options = {}) {
    document.body.classList.remove("kings-c-main-ready", "kings-c-transitioning", "kt-main-ready", "kt-transitioning", "kt-underlay-ready")
    document.body.classList.add("kt-login-ready")
    stopMaintenanceWatcher()
    stopLoginSessionWatcher()
    await signOut(auth)

    dom.appContent.style.display = "none"
    dom.topMenu.style.display = "none"
    dom.menuDropdown.style.display = "none"
    dom.loginArea.style.display = "block"

    setLoginFormDisabled(false)
    dom.loginBtn.style.display = "block"

    dom.email.value = ""
    dom.password.value = ""
    dom.password.type = "password"
    updatePasswordToggleButton()

    dom.history.innerHTML = ""
    dom.adminHistory.innerHTML = ""
    dom.noticeList.innerHTML = ""
    dom.adminNoticeList.innerHTML = ""
    dom.employeeList.innerHTML = ""
    dom.mySummary.innerHTML = ""
    dom.adminSummary.innerHTML = ""
    dom.adminDashboard.innerHTML = ""
    if (dom.maintenanceScreen) dom.maintenanceScreen.classList.remove("show")
    if (dom.adminMaintenanceBanner) dom.adminMaintenanceBanner.classList.remove("show")

    state.allRecords = []
    state.allNotices = []
    state.allUsers = []
    state.allHolidays = []
    state.maintenanceSettings = null

    state.currentUserRole = "employee"
    state.currentPage = 0
    state.adminCurrentPage = 0

    hasShownLoginRoleNotice = false

    dom.clockInBtn.disabled = false
    dom.clockOutBtn.disabled = true

    hideWelcomeName()
    showMainScreen({ animate: false })

    clearCurrentLoginSession()

    if (!options.silent) {
        showSuccess("ログアウトしました")
    }
}


function syncAdminMenuVisibility() {
    if (!dom.openAdminBtn) return

    const isAdmin = state.currentUserRole === "admin"
    dom.openAdminBtn.style.display = isAdmin ? "flex" : "none"
    dom.openAdminBtn.hidden = !isAdmin
    dom.openAdminBtn.disabled = !isAdmin
    dom.openAdminBtn.setAttribute("aria-hidden", isAdmin ? "false" : "true")
}

function prepareLoggedInView(isMaintenanceForUser) {
    document.body.classList.remove("auto-auth-checking")

    if (dom.loginArea) dom.loginArea.style.display = "none"
    if (dom.appContent) dom.appContent.style.display = "block"
    if (dom.topMenu) dom.topMenu.style.display = "block"

    syncAdminMenuVisibility()

    if (isMaintenanceForUser) {
        applyMaintenanceDisplay()
    } else {
        showMainScreen({ animate: false })
    }

    showWelcomeName()
}
function safeLoginStep(label, callback) {
    return Promise.resolve()
        .then(callback)
        .catch((error) => {
            console.warn(`[${label}] skipped`, error)
            return null
        })
}

function safeRenderStep(label, callback) {
    try {
        return callback()
    } catch (error) {
        console.warn(`[${label}] render skipped`, error)
        return null
    }
}

async function setupLoggedInScreen(
    user,
    options = {
        showLoginSuccess: false,
        showRoleNotice: false,
        autoLogin: false
    }
) {
    if (isSettingUpLoginScreen) return

    isSettingUpLoginScreen = true
    setLoginFormDisabled(true, options.autoLogin ? "自動ログイン中..." : "ログイン中...")

    try {
        await reloadUsers()
        await ensureCurrentUserProfile(user)
        await reloadUsers()

        state.currentUserRole = getRoleByAuthUser(user)
        window.dispatchEvent(new CustomEvent("kings:user-role-changed", { detail: { role: state.currentUserRole } }))

        if (state.currentUserRole !== "admin" && state.currentUserRole !== "employee") {
            await signOut(auth)
            resetToLoginScreen()
            showError("権限情報が不正です", "ROLE-001")
            return
        }

        let currentUserData = getCurrentUserData()

        if (
            state.currentUserRole !== "admin" &&
            currentUserData &&
            shouldAutoDeactivateUser(currentUserData)
        ) {
            await markCurrentUserAutoInactive(currentUserData)
            currentUserData = getCurrentUserData()
        }

        if (
            state.currentUserRole !== "admin" &&
            currentUserData &&
            isAccountInactive(currentUserData)
        ) {
            await signOut(auth)
            resetToLoginScreen()
            showError(getInactiveMessage(currentUserData), "ACC-004")
            return
        }

        if (currentUserData) {
            await safeLoginStep("update-current-user-last-login", () => updateCurrentUserLastLogin(currentUserData))
            await safeLoginStep("register-login-session", () => registerLoginSession(currentUserData))
            await safeLoginStep("reload-users-after-session", () => reloadUsers())
        }

        await loadMaintenanceSettings()
        renderMaintenanceScreen()

        state.currentPage = 0
        state.adminCurrentPage = 0

        await reloadAllData()
        await loadMaintenanceSettings()
        renderMaintenanceScreen()

        setDefaultFilterValues()

        const isMaintenanceForUser = isMaintenanceActiveForCurrentUser()

        if (!isMaintenanceForUser) {
            safeRenderStep("render-history", renderHistory)
            safeRenderStep("render-notices", renderNotices)
            safeRenderStep("render-my-summary", renderMySummary)
            safeRenderStep("render-my-work-chart", renderMyWorkChart)
            safeRenderStep("update-work-buttons", updateWorkButtons)
            safeRenderStep("render-incomplete-attendance-alert", renderIncompleteAttendanceAlert)
        }

        syncAdminMenuVisibility()

        if (state.currentUserRole === "admin") {
            safeRenderStep("render-admin-history", renderAdminHistory)
            safeRenderStep("render-users", renderUsers)
            safeRenderStep("render-admin-notice-list", renderAdminNoticeList)
            safeRenderStep("render-admin-dashboard", renderAdminDashboard)
            safeRenderStep("render-admin-summary", renderAdminSummary)
            safeRenderStep("render-admin-work-chart", renderAdminWorkChart)
            safeRenderStep("render-maintenance-admin-form", renderMaintenanceAdminForm)
        }

        const shouldShowTransition = options.showLoginSuccess || options.autoLogin

        if (shouldShowTransition) {
            prepareLoggedInView(isMaintenanceForUser)

            if (isMaintenanceForUser) {
                await KingsTransitionController.loginToMaintenance()
                applyMaintenanceDisplay()
            } else {
                await KingsTransitionController.loginToMain()
            }
        } else {
            prepareLoggedInView(isMaintenanceForUser)

            if (isMaintenanceForUser) {
                KingsTransitionController.setDisplayForMaintenance()
                applyMaintenanceDisplay()
                document.body.classList.add("kt-main-ready", "kt-maintenance-ready")
            } else {
                document.body.classList.add("kt-main-ready")
                document.body.classList.remove("kt-login-ready", "kt-transitioning", "kt-maintenance-ready")
            }
        }

        startMaintenanceWatcher()
        startLoginSessionWatcher()

        if ((options.showLoginSuccess || options.showRoleNotice) && !hasShownLoginRoleNotice) {
            hasShownLoginRoleNotice = true
            const roleLabel = state.currentUserRole === "admin" ? "管理者" : "社員"
            const loginLabel = options.autoLogin ? "自動ログインしました" : "ログインしました"
            showSuccess(`${loginLabel}（${roleLabel}）`)
        }

    } finally {
        isSettingUpLoginScreen = false
    }
}
function getTransitionDisplayName(user) {
    const email = String(user?.email || "")
    const userData = state.allUsers.find((item) => {
        return item.uid === user?.uid || String(item.email || "").toLowerCase() === email.toLowerCase()
    })

    return userData?.name || email || "Kings System"
}

function showKingsLoginTransition(user, isAutoLogin = false) {
    const overlay = document.getElementById("loginTransitionOverlay")

    if (!overlay) return Promise.resolve()

    const email = String(user?.email || "")
    const userData = state.allUsers.find((item) => {
        return item.uid === user?.uid || String(item.email || "").toLowerCase() === email.toLowerCase()
    })

    const displayName = userData?.name || email || "User"

    document.body.classList.add("kings-c-transitioning", "kings-c-main-ready")

    overlay.innerHTML = `
        <div class="loginTransitionInner kingsCStage">
            <div class="loginTransitionLogo">Kings</div>
            <div class="loginTransitionSub">COMPREHENSIVE MANAGEMENT SYSTEM</div>
            <div class="loginTransitionText">Loading...</div>
            <div class="loginTransitionTop">
                <div class="loginTransitionWelcome"><span>Welcome</span><strong class="welcomeNameWithIcon"><span class="welcomeRoleSvgIcon" aria-hidden="true"></span><span>${escapeHtml(displayName)}</span></strong></div>
                <div class="loginTransitionMenu" aria-hidden="true">☰</div>
            </div>
            <div class="loginTransitionStatusCard" aria-hidden="true">
                <div class="loginTransitionCardLabel">現在の状態</div>
                <div class="loginTransitionCardText">本日の打刻状態を確認しています</div>
            </div>
            <div class="loginTransitionPunchButton" aria-hidden="true">出勤する</div>
            <div class="loginTransitionNoticeCard" aria-hidden="true">
                <div class="loginTransitionCardLabel">お知らせ</div>
                <div class="loginTransitionCardText">最新のお知らせを読み込み中です</div>
            </div>
        </div>
    `

    overlay.classList.remove("hide")
    overlay.classList.add("show")

    return new Promise((resolve) => {
        window.setTimeout(() => {
            overlay.classList.remove("show")
            overlay.classList.add("hide")

            window.setTimeout(() => {
                overlay.classList.remove("hide")
                overlay.innerHTML = ""
                document.body.classList.remove("kings-c-transitioning")
                resolve()
            }, 560)
        }, 2650)
    })
}

function setDefaultFilterValues() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")

    if (dom.myHistoryMonth && !dom.myHistoryMonth.value) {
        dom.myHistoryMonth.value = `${year}-${month}`
    }

    if (dom.myHistoryYear && !dom.myHistoryYear.value) {
        dom.myHistoryYear.value = String(year)
    }

    if (dom.adminHistoryMonth && !dom.adminHistoryMonth.value) {
        dom.adminHistoryMonth.value = `${year}-${month}`
    }

    if (dom.adminHistoryYear && !dom.adminHistoryYear.value) {
        dom.adminHistoryYear.value = String(year)
    }
}

function restartAnimation(element, className) {
    if (!element) return

    element.classList.remove(className)
    void element.offsetWidth
    element.classList.add(className)
}

function setLoginFormDisabled(disabled, buttonText = "") {
    if (dom.email) dom.email.disabled = disabled
    if (dom.password) dom.password.disabled = disabled
    if (dom.keepLoginCheck) dom.keepLoginCheck.disabled = disabled
    if (dom.passwordToggleBtn) dom.passwordToggleBtn.disabled = disabled

    if (dom.loginBtn) {
        dom.loginBtn.disabled = disabled

        const span = dom.loginBtn.querySelector("span")
        if (span && buttonText) span.textContent = buttonText
        if (span && !buttonText) span.textContent = "ログイン"
    }

    if (dom.loginArea) {
        dom.loginArea.classList.toggle("loginDisabled", disabled)
    }
}

function updatePasswordToggleButton() {
    if (!dom.password || !dom.passwordToggleBtn) return

    const isHidden = dom.password.type === "password"
    const eyePath = isHidden
        ? "M12 5C6.2 5 2.5 9.3 1.5 12c1 2.7 4.7 7 10.5 7s9.5-4.3 10.5-7C21.5 9.3 17.8 5 12 5Zm0 11.2A4.2 4.2 0 1 1 12 7.8a4.2 4.2 0 0 1 0 8.4Zm0-2.1a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2Z"
        : "M3.3 2.3 21.7 20.7l-1.4 1.4-3.1-3.1A11.8 11.8 0 0 1 12 20C6.2 20 2.5 15.7 1.5 13c.5-1.4 1.8-3.1 3.6-4.5L1.9 5.3 3.3 2.3Zm5.1 8.5a4.2 4.2 0 0 0 5.4 5.4l-1.7-1.7a2.1 2.1 0 0 1-2.1-2.1l-1.6-1.6ZM12 6c5.8 0 9.5 4.3 10.5 7-.4 1.1-1.3 2.4-2.5 3.6l-3-3A4.2 4.2 0 0 0 11.4 8L9.2 5.8c.9.1 1.8.2 2.8.2Z"

    dom.passwordToggleBtn.innerHTML = `<svg class="passwordEyeSvg" aria-hidden="true" viewBox="0 0 24 24"><path d="${eyePath}"/></svg>`
    dom.passwordToggleBtn.dataset.visible = isHidden ? "false" : "true"
    dom.passwordToggleBtn.setAttribute(
        "aria-label",
        isHidden ? "パスワードを表示する" : "パスワードを非表示にする"
    )
}

function resetToLoginScreen() {
    document.body.classList.remove("kings-c-main-ready", "kings-c-transitioning", "kt-main-ready", "kt-transitioning", "kt-underlay-ready")
    document.body.classList.add("kt-login-ready")
    stopMaintenanceWatcher()

    dom.appContent.style.display = "none"
    dom.topMenu.style.display = "none"
    dom.menuDropdown.style.display = "none"
    dom.loginArea.style.display = "block"

    setLoginFormDisabled(false)

    state.currentUserRole = "employee"
    state.maintenanceSettings = null

    if (dom.maintenanceScreen) dom.maintenanceScreen.classList.remove("show")
    if (dom.adminMaintenanceBanner) dom.adminMaintenanceBanner.classList.remove("show")

    hideWelcomeName()
    showMainScreen({ animate: false })
}

function getLoginErrorCode(error) {
    const code = error?.code || ""

    if (code === "auth/user-not-found") return "AUTH-001"
    if (code === "auth/wrong-password") return "AUTH-002"
    if (code === "auth/invalid-credential") return "AUTH-003"
    if (code === "auth/invalid-email") return "AUTH-004"
    if (code === "auth/too-many-requests") return "AUTH-005"
    if (code === "auth/network-request-failed") return "AUTH-006"
    if (code === "permission-denied" || code === "firestore/permission-denied") return "PERM-001"
    if (String(error?.message || "").includes("permission-denied")) return "PERM-001"

    return "AUTH-999"
}

function getLoginErrorMessage(error) {
    const code = error?.code || ""

    if (code === "auth/user-not-found") return "このメールアドレスのユーザーは存在しません"
    if (code === "auth/wrong-password") return "パスワードが間違っています"
    if (code === "auth/invalid-credential") return "メールアドレスまたはパスワードが間違っています"
    if (code === "auth/invalid-email") return "メールアドレスの形式が正しくありません"
    if (code === "auth/too-many-requests") return "ログイン試行回数が多すぎます。しばらく待ってください"
    if (code === "auth/network-request-failed") return "通信エラーが発生しました"

    return "ログインに失敗しました"
}

