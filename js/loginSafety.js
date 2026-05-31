import { login, togglePasswordVisibility } from "./auth.js"

let installed = false

export function installLoginSafety() {
    if (installed) return
    installed = true

    const loginBtn = document.getElementById("loginBtn")
    const email = document.getElementById("email")
    const password = document.getElementById("password")
    const passwordToggleBtn = document.getElementById("passwordToggleBtn")

    if (loginBtn) {
        loginBtn.addEventListener("click", (event) => {
            event.preventDefault()
            event.stopPropagation()
            if (!loginBtn.disabled) login()
        }, true)
    }

    ;[email, password].forEach((input) => {
        input?.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault()
                login()
            }
        }, true)
    })

    passwordToggleBtn?.addEventListener("click", (event) => {
        event.preventDefault()
        event.stopImmediatePropagation()
        togglePasswordVisibility()
    }, true)
}

installLoginSafety()
