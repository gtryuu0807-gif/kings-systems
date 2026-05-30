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

        await import("../app.js")

    } catch (error) {
        console.error(error)
        document.body.innerHTML = `
            <div style="padding:20px;font-family:sans-serif;color:white;background:#050505;min-height:100vh;">
                <h2>画面の読み込みに失敗しました</h2>
                <p>HTML部品の読み込みに失敗しました。</p>
                <p>${error.message}</p>
            </div>
        `
    }
}

function finishSplashAndStartApp() {
    const splash = document.getElementById("splashScreen")

    if (!splash) {
        document.body.classList.remove("splash-active")
        document.body.classList.add("app-ready")
        startApp()
        return
    }

    splash.classList.add("splash-hide")

    window.setTimeout(() => {
        splash.remove()
        document.body.classList.remove("splash-active")
        document.body.classList.add("app-ready")
        startApp()
    }, 900)
}

window.setTimeout(finishSplashAndStartApp, 4000)
