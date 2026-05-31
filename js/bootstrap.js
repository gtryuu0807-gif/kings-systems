import { KingsTransitionController } from "./kingsTransitionController.js"

async function loadComponent(targetId, path) {
    const target = document.getElementById(targetId)

    if (!target) {
        console.error(`読み込み先が見つかりません: ${targetId}`)
        return
    }

    const response = await fetch(path)

    if (!response.ok) {
        throw new Error(`${path} の読み込みに失敗しました`)
    }

    target.innerHTML = await response.text()
}

async function startApp() {
    try {
        await loadComponent("headerMount", "./components/header.html")
        await loadComponent("loginMount", "./components/login.html")
        await loadComponent("maintenanceMount", "./components/maintenance-screen.html")
        await loadComponent("mainMount", "./components/main-screen.html")
        await loadComponent("adminMount", "./components/admin-screen.html")
        await loadComponent("settingsMount", "./components/settings-screen.html")

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
