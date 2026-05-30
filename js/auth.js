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

    showInfo("認証中...")

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
    showMainScreen()

    clearCurrentLoginSession()

    if (!options.silent) {
        showSuccess("ログアウトしました")
    }
}


function syncAdminMenuVisibility() {
    if (!dom.openAdminBtn) return

    const isAdmin = state.currentUserRole === "admin"
    dom.openAdminBtn.style.display = isAdmin ? "block" : "none"
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
        showMainScreen()
    }

    showWelcomeName()
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
            await updateCurrentUserLastLogin(currentUserData)
            await registerLoginSession(currentUserData)
            await reloadUsers()
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
            renderHistory()
            renderNotices()
            renderMySummary()
            renderMyWorkChart()
            updateWorkButtons()
            renderIncompleteAttendanceAlert()
        }

        syncAdminMenuVisibility()

        if (state.currentUserRole === "admin") {
            renderAdminHistory()
            renderUsers()
            renderAdminNoticeList()
            renderAdminDashboard()
            renderAdminSummary()
            renderAdminWorkChart()
            renderMaintenanceAdminForm()
        }

        const shouldShowTransition = options.showLoginSuccess || options.autoLogin

        if (shouldShowTransition) {
            prepareLoggedInView(isMaintenanceForUser)
            restartAnimation(dom.appContent, "loginShow")
            await showKingsLoginTransition(user, options.autoLogin)
        } else {
            prepareLoggedInView(isMaintenanceForUser)
            restartAnimation(dom.appContent, "loginShow")
        }

        startMaintenanceWatcher()
        startLoginSessionWatcher()

        if (options.showLoginSuccess) {
            showSuccess(options.autoLogin ? "自動ログインしました" : "ログイン成功")
        }

        if (options.showRoleNotice && !hasShownLoginRoleNotice) {
            hasShownLoginRoleNotice = true

            if (state.currentUserRole === "admin") {
                showInfo("管理者としてログインしました")
            } else {
                showInfo("社員としてログインしました")
            }
        }

    } finally {
        isSettingUpLoginScreen = false
    }
}
function showKingsLoginTransition(user, isAutoLogin = false) {
    const overlay = document.getElementById("loginTransitionOverlay")

    if (!overlay) return Promise.resolve()

    const email = String(user?.email || "")
    const userData = state.allUsers.find((item) => {
        return item.uid === user?.uid || String(item.email || "").toLowerCase() === email.toLowerCase()
    })

    const displayName = userData?.name || email || "User"

    overlay.innerHTML = `
        <div class="loginTransitionInner kingsTransitionFixedLogo">
            <div class="loginTransitionGlow"></div>
            <div class="loginTransitionLogo">Kings</div>
            <div class="loginTransitionSub">Comprehensive Management System</div>
            <div class="loginTransitionText">${isAutoLogin ? "Welcome Back" : "Signing in..."}</div>
            <div class="loginTransitionWelcome">👑 ${displayName}</div>
        </div>
    `

    overlay.classList.add("show")

    return new Promise((resolve) => {
        window.setTimeout(() => {
            overlay.classList.remove("show")
            overlay.classList.add("hide")

            window.setTimeout(() => {
                overlay.classList.remove("hide")
                resolve()
            }, 520)
        }, isAutoLogin ? 1250 : 1350)
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

    dom.passwordToggleBtn.textContent = dom.password.type === "password" ? "表示" : "非表示"
    dom.passwordToggleBtn.setAttribute(
        "aria-label",
        dom.password.type === "password" ? "パスワードを表示する" : "パスワードを非表示にする"
    )
}

function resetToLoginScreen() {
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
    showMainScreen()
}

function getLoginErrorCode(error) {
    const code = error?.code || ""

    if (code === "auth/user-not-found") return "AUTH-001"
    if (code === "auth/wrong-password") return "AUTH-002"
    if (code === "auth/invalid-credential") return "AUTH-003"
    if (code === "auth/invalid-email") return "AUTH-004"
    if (code === "auth/too-many-requests") return "AUTH-005"
    if (code === "auth/network-request-failed") return "AUTH-006"
    if (code === "permission-denied") return "PERM-001"

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

