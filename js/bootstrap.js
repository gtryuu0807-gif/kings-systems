import { KingsTransitionController } from "./kingsTransitionController.js"
import { initCacheRealtimeUpdate } from "./cacheRealtimeUpdate.js"
import { setupSystemLogRenderer } from "./systemLog.js"

function setupGlobalErrorCodeHandler() {
    window.addEventListener("error", async (event) => {
        try {
            const { showError } = await import("./notify.js")
            showError(event?.message || "予期しないエラーが発生しました", "SYS-001")
        } catch (_) {}
    })

    window.addEventListener("unhandledrejection", async (event) => {
        try {
            const { showError } = await import("./notify.js")
            const reason = event?.reason
            const message = reason?.message || String(reason || "通信または非同期処理でエラーが発生しました")
            showError(message, "SYS-002")
        } catch (_) {}
    })
}

async function loadComponent(targetId, path) {
    const target = document.getElementById(targetId)

    if (!target) {
        console.error(`読み込み先が見つかりません: ${targetId}`)
        return
    }

    const response = await fetch(`${path}${path.includes("?") ? "&" : "?"}v=20260531k001`, { cache: "no-store" })

    if (!response.ok) {
        throw new Error(`${path} の読み込みに失敗しました`)
    }

    target.innerHTML = await response.text()
}

async function injectVersionInfo() {
    try {
        const response = await fetch(`./version.json?v=${Date.now()}`, { cache: "no-store" })
        const data = await response.json()
        const versionText = data.version || data.appVersion || "-"
        const buildText = data.build || data.buildId || data.updatedAt || "-"
        const versionNodes = [document.getElementById("settingsVersionText"), document.getElementById("infoVersionText")]
        const buildNodes = [document.getElementById("settingsBuildText"), document.getElementById("infoBuildText")]
        versionNodes.filter(Boolean).forEach((node) => { node.textContent = versionText })
        buildNodes.filter(Boolean).forEach((node) => { node.textContent = buildText })
        const lastCheck = document.getElementById("infoLastCheckText")
        if (lastCheck) lastCheck.textContent = new Date().toLocaleString("ja-JP")
    } catch (error) {
        console.warn("Version info load failed", error)
    }
}

async function startApp() {
    setupGlobalErrorCodeHandler()
    try {
        await loadComponent("headerMount", "./components/header.html")
        await loadComponent("loginMount", "./components/login.html")
        await loadComponent("maintenanceMount", "./components/maintenance-screen.html")
        await loadComponent("mainMount", "./components/main-screen.html")
        await loadComponent("adminMount", "./components/admin-screen.html")
        await loadComponent("infoMount", "./components/info-screen.html")
        await loadComponent("settingsMount", "./components/settings-screen.html")
        await injectVersionInfo()

        await import("./loginSafety.js")

        try {
            await import("../app.js")
        } catch (appError) {
            console.error("app.js の初期化に失敗しました", appError)
        }

        try {
            await import("./kingsV3MenuRoutePatch.js")
        } catch (routePatchError) {
            console.error("メニュー遷移補正の読み込みに失敗しました", routePatchError)
        }

        await KingsTransitionController.bootToLogin()
        initCacheRealtimeUpdate()
        setupSystemLogRenderer()

    } catch (error) {
        console.error(error)
        document.body.className = ""
        document.body.innerHTML = `
            <div style="padding:20px;font-family:sans-serif;color:white;background:#050505;min-height:100vh;">
                <h2>画面の読み込みに失敗しました</h2>
                <p>HTML部品の読み込みに失敗しました。</p>
                <p>${error.message}</p>
            </div>
        `
    }
}

startApp()
