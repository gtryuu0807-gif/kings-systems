import { pauseNotifications, resumeNotifications } from "./notify.js"
const DEFAULT_CONFIG = {
    durations: {
        boot: 1200,
        loginToMain: 1200,
        screenSwitch: 620,
        settle: 80
    }
}

let transitionToken = 0
let cachedConfig = null
let currentScreenName = "login"
let isMotionRunning = false

function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function loadAppVersion() {
    try {
        const response = await fetch(`./version.json?ts=${Date.now()}`, { cache: "no-store" })
        if (!response.ok) throw new Error("version not found")
        return await response.json()
    } catch (_) {
        return { version: "1.3.0", build: "2026.05.31.002" }
    }
}

function getVersionLabel(versionInfo) {
    const version = versionInfo?.version || "1.3.0"
    const build = versionInfo?.build || "2026.05.31.002"
    return `v${version} / Build ${build}`
}

function shouldShowBoot(versionInfo) {
    const key = `${versionInfo?.version || ""}:${versionInfo?.build || ""}`
    const lastKey = sessionStorage.getItem("kings:lastBootVersion") || ""
    const bootDone = sessionStorage.getItem("kings:bootDone") === "true"
    const force = sessionStorage.getItem("kings:forceBoot") === "true"
    if (force) {
        sessionStorage.removeItem("kings:forceBoot")
        return true
    }
    return !bootDone || key !== lastKey
}

function markBootShown(versionInfo) {
    const key = `${versionInfo?.version || ""}:${versionInfo?.build || ""}`
    sessionStorage.setItem("kings:bootDone", "true")
    sessionStorage.setItem("kings:lastBootVersion", key)
}

function createBootOverlay(versionInfo = null) {
    document.getElementById("kingsBootOverlay")?.remove()
    const overlay = document.createElement("div")
    overlay.id = "kingsBootOverlay"
    overlay.setAttribute("aria-hidden", "true")
    overlay.innerHTML = `
        <div class="bootLogoStage">
            <div class="bootLogoText">Kings</div>
            <div class="bootLogoSub">COMPREHENSIVE MANAGEMENT SYSTEM</div>
            <div class="bootVersionText">${getVersionLabel(versionInfo)}</div>
        </div>
    `
    document.body.appendChild(overlay)
    requestAnimationFrame(() => overlay.classList.add("bootLeaving"))
    return overlay
}

function removeBootOverlay() {
    const overlay = document.getElementById("kingsBootOverlay")
    if (!overlay) return
    overlay.remove()
}


function createRouteShield(label = "Kings") {
    document.getElementById("kingsRouteShield")?.remove()
    const shield = document.createElement("div")
    shield.id = "kingsRouteShield"
    shield.setAttribute("aria-hidden", "true")
    shield.innerHTML = `
        <div class="routeShieldLogoStage">
            <div class="routeShieldLogoText">Kings</div>
            <div class="routeShieldLogoSub">COMPREHENSIVE MANAGEMENT SYSTEM</div>
        </div>
    `
    document.body.appendChild(shield)
    requestAnimationFrame(() => shield.classList.add("show"))
    return shield
}

async function removeRouteShield(delay = 180) {
    const shield = document.getElementById("kingsRouteShield")
    if (!shield) return
    shield.classList.add("hide")
    await wait(delay)
    shield.remove()
}


function beginMotion(screenName, allowSameScreen = false) {
    if (!allowSameScreen && isMotionRunning && currentScreenName === screenName) return false
    isMotionRunning = true
    return true
}

function finishMotion(screenName) {
    currentScreenName = screenName
    isMotionRunning = false
}

async function loadConfig() {
    if (cachedConfig) return cachedConfig

    try {
        const response = await fetch("./config/kings-transition.json", { cache: "no-store" })
        if (!response.ok) throw new Error("config not found")
        const config = await response.json()
        cachedConfig = {
            ...DEFAULT_CONFIG,
            ...config,
            durations: { ...DEFAULT_CONFIG.durations, ...(config?.durations || {}) }
        }
    } catch (_) {
        cachedConfig = DEFAULT_CONFIG
    }

    return cachedConfig
}

function removeLegacyTransitionElements() {
    removeBootOverlay()
    document.getElementById("kingsTransitionOverlay")?.remove()
    document.getElementById("kingsSplash")?.remove()
    document.getElementById("splashScreen")?.remove()
    document.querySelectorAll(".kings-c-splash,.splash,.loadingScreen").forEach((el) => el.remove())
}

function cleanBodyStates() {
    document.body.classList.remove(
        "kt-booting",
        "kt-boot-run",
        "kt-login-ready",
        "kt-transitioning",
        "kt-real-main-start",
        "kt-real-main-run",
        "kt-main-ready",
        "kt-screen-switching",
        "kt-screen-main",
        "kt-screen-admin",
        "kt-underlay-ready",
        "kings-c-booting",
        "kings-c-transitioning",
        "kings-c-main-ready",
        "app-ready",
        "auto-auth-checking"
    )
}

function clearElementMotionFlags() {
    document.querySelectorAll("[data-kt-real],[data-kt-sequence],[data-kt-screen]").forEach((element) => {
        element.removeAttribute("data-kt-real")
        element.removeAttribute("data-kt-sequence")
        element.removeAttribute("data-kt-screen")
    })
}

function markElement(element, sequence = "") {
    if (!element) return
    element.setAttribute("data-kt-real", "true")
    if (sequence) element.setAttribute("data-kt-sequence", sequence)
}

function prepareRealMotionTargets() {
    clearElementMotionFlags()

    markElement(document.getElementById("appBrand"), "brand")
    markElement(document.getElementById("loginArea"), "login")
    markElement(document.getElementById("welcomeBox"), "welcome")
    markElement(document.getElementById("topMenu"), "menu")
    markElement(document.getElementById("currentWorkStatusCard"), "status")
    markElement(document.getElementById("clockInBtn"), "clockIn")
    markElement(document.getElementById("clockOutBtn"), "clockOut")
    markElement(document.getElementById("noticeList"), "notice")

    document.querySelectorAll("#mainScreen > h2, .mainScreenHelp, .mainHistoryMenu, .mainHistoryContent").forEach((element, index) => {
        markElement(element, `main-${index + 1}`)
    })

    document.querySelectorAll("#adminScreen > h2, #adminMaintenanceBanner, .adminScreenHelp, .adminMenu, .adminContent").forEach((element, index) => {
        markElement(element, `admin-${index + 1}`)
    })
}

function forceReflow() {
    void document.body.offsetHeight
}

function setDisplayForLogin() {
    const loginArea = document.getElementById("loginArea")
    const appContent = document.getElementById("appContent")
    const welcomeBox = document.getElementById("welcomeBox")
    const topMenu = document.getElementById("topMenu")
    const mainScreen = document.getElementById("mainScreen")
    const adminScreen = document.getElementById("adminScreen")

    if (loginArea) loginArea.style.display = "block"
    if (appContent) appContent.style.display = "none"
    if (welcomeBox) welcomeBox.style.display = "none"
    if (topMenu) topMenu.style.display = "none"
    if (mainScreen) mainScreen.style.display = "block"
    if (adminScreen) adminScreen.style.display = "none"
}

function setDisplayForMain() {
    const loginArea = document.getElementById("loginArea")
    const appContent = document.getElementById("appContent")
    const welcomeBox = document.getElementById("welcomeBox")
    const topMenu = document.getElementById("topMenu")
    const mainScreen = document.getElementById("mainScreen")
    const adminScreen = document.getElementById("adminScreen")

    if (loginArea) loginArea.style.display = "none"
    if (appContent) appContent.style.display = "block"
    if (welcomeBox) welcomeBox.style.display = "flex"
    if (topMenu) topMenu.style.display = "block"
    if (mainScreen) mainScreen.style.display = "block"
    if (adminScreen) adminScreen.style.display = "none"
}

function setDisplayForAdmin() {
    const loginArea = document.getElementById("loginArea")
    const appContent = document.getElementById("appContent")
    const welcomeBox = document.getElementById("welcomeBox")
    const topMenu = document.getElementById("topMenu")
    const mainScreen = document.getElementById("mainScreen")
    const adminScreen = document.getElementById("adminScreen")

    if (loginArea) loginArea.style.display = "none"
    if (appContent) appContent.style.display = "block"
    if (welcomeBox) welcomeBox.style.display = "flex"
    if (topMenu) topMenu.style.display = "block"
    if (mainScreen) mainScreen.style.display = "none"
    if (adminScreen) adminScreen.style.display = "block"
}

function setDisplayForMaintenance() {
    const loginArea = document.getElementById("loginArea")
    const appContent = document.getElementById("appContent")
    const welcomeBox = document.getElementById("welcomeBox")
    const topMenu = document.getElementById("topMenu")
    const mainScreen = document.getElementById("mainScreen")
    const adminScreen = document.getElementById("adminScreen")
    const maintenanceScreen = document.getElementById("maintenanceScreen")
    const openAdminBtn = document.getElementById("openAdminBtn")

    if (loginArea) loginArea.style.display = "none"
    if (appContent) appContent.style.display = "block"
    if (welcomeBox) welcomeBox.style.display = "none"
    if (topMenu) topMenu.style.display = "none"
    if (mainScreen) mainScreen.style.display = "none"
    if (adminScreen) adminScreen.style.display = "none"
    if (maintenanceScreen) maintenanceScreen.classList.add("show")
    if (openAdminBtn) {
        openAdminBtn.style.display = "none"
        openAdminBtn.hidden = true
        openAdminBtn.disabled = true
    }
}

function setScreenReadyClass(screenName) {
    document.body.classList.remove("kt-screen-main", "kt-screen-admin")
    document.body.classList.add(screenName === "admin" ? "kt-screen-admin" : "kt-screen-main")
}

export const KingsTransitionController = {
    async bootToLogin() {
        if (!beginMotion("login", true)) return
        const token = ++transitionToken
        const configPromise = loadConfig()
        const versionInfo = await loadAppVersion()
        const showBoot = shouldShowBoot(versionInfo)
        pauseNotifications()

        removeLegacyTransitionElements()
        const bootOverlay = showBoot ? createBootOverlay(versionInfo) : null
        cleanBodyStates()
        setDisplayForLogin()
        prepareRealMotionTargets()

        document.body.classList.add("kt-booting")
        forceReflow()
        document.body.classList.add("kt-boot-run")

        const config = await configPromise
        if (showBoot) {
            await wait(Math.max(config.durations.boot, 1200))
        }
        if (token !== transitionToken) {
            removeBootOverlay()
            return
        }

        if (showBoot) markBootShown(versionInfo)
        removeBootOverlay()
        cleanBodyStates()
        setDisplayForLogin()
        prepareRealMotionTargets()
        document.body.classList.add("kt-login-ready")
        resumeNotifications(120)
        finishMotion("login")
    },

    async loginToMain() {
        if (!beginMotion("main", true)) return
        const token = ++transitionToken
        const configPromise = loadConfig()
        pauseNotifications()

        removeLegacyTransitionElements()
        const routeShield = createRouteShield()
        cleanBodyStates()
        document.body.classList.add("kt-route-shielding")
        setDisplayForMain()
        prepareRealMotionTargets()

        document.body.classList.add("kt-transitioning", "kt-real-main-start")
        forceReflow()
        document.body.classList.add("kt-real-main-run")

        const config = await configPromise
        await wait(Math.max(config.durations.loginToMain, 900))
        if (token !== transitionToken) return

        cleanBodyStates()
        setDisplayForMain()
        prepareRealMotionTargets()
        document.body.classList.add("kt-main-ready")
        setScreenReadyClass("main")
        await removeRouteShield(220)
        document.body.classList.remove("kt-route-shielding")
        resumeNotifications(260)
        finishMotion("main")
    },

    async loginToMaintenance() {
        if (!beginMotion("maintenance", true)) return
        const token = ++transitionToken
        const configPromise = loadConfig()
        pauseNotifications()

        removeLegacyTransitionElements()
        const routeShield = createRouteShield()
        cleanBodyStates()
        document.body.classList.add("kt-route-shielding")
        setDisplayForMaintenance()
        prepareRealMotionTargets()

        document.body.classList.add("kt-transitioning", "kt-real-main-start", "kt-maintenance-start")
        forceReflow()
        document.body.classList.add("kt-real-main-run")

        const config = await configPromise
        await wait(Math.max(config.durations.loginToMain, 900))
        if (token !== transitionToken) return

        cleanBodyStates()
        setDisplayForMaintenance()
        prepareRealMotionTargets()
        document.body.classList.add("kt-main-ready", "kt-maintenance-ready")
        await removeRouteShield(220)
        document.body.classList.remove("kt-route-shielding")
        resumeNotifications(260)
        finishMotion("maintenance")
    },

    async switchToMain() {
        if (currentScreenName === "main" || isMotionRunning) {
            setDisplayForMain()
            setScreenReadyClass("main")
            return
        }
        if (!beginMotion("main")) return
        const token = ++transitionToken
        const config = await loadConfig()
        pauseNotifications()

        removeLegacyTransitionElements()
        cleanBodyStates()
        setDisplayForMain()
        prepareRealMotionTargets()

        document.body.classList.add("kt-main-ready", "kt-screen-switching", "kt-screen-main")
        forceReflow()
        document.body.classList.add("kt-screen-run")

        await wait(config.durations.screenSwitch)
        if (token !== transitionToken) return

        document.body.classList.remove("kt-screen-switching", "kt-screen-run")
        document.body.classList.add("kt-main-ready")
        setScreenReadyClass("main")
        resumeNotifications(260)
        finishMotion("main")
    },

    async switchToAdmin() {
        if (currentScreenName === "admin" || isMotionRunning) {
            setDisplayForAdmin()
            setScreenReadyClass("admin")
            return
        }
        if (!beginMotion("admin")) return
        const token = ++transitionToken
        const config = await loadConfig()
        pauseNotifications()

        removeLegacyTransitionElements()
        cleanBodyStates()
        setDisplayForAdmin()
        prepareRealMotionTargets()

        document.body.classList.add("kt-main-ready", "kt-screen-switching", "kt-screen-admin")
        forceReflow()
        document.body.classList.add("kt-screen-run")

        await wait(config.durations.screenSwitch)
        if (token !== transitionToken) return

        document.body.classList.remove("kt-screen-switching", "kt-screen-run")
        document.body.classList.add("kt-main-ready")
        setScreenReadyClass("admin")
        resumeNotifications(180)
        finishMotion("admin")
    },

    resetToLogin() {
        transitionToken++
        removeLegacyTransitionElements()
        document.getElementById("kingsRouteShield")?.remove()
        cleanBodyStates()
        setDisplayForLogin()
        prepareRealMotionTargets()
        document.body.classList.add("kt-login-ready")
        resumeNotifications(120)
        finishMotion("login")
    },

    prepareRealMotionTargets,
    setDisplayForMain,
    setDisplayForAdmin,
    setDisplayForMaintenance,
    getCurrentScreen() { return currentScreenName },
    isRunning() { return isMotionRunning }
}
