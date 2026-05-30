import { dom } from "../dom.js"

import {
    login,
    togglePasswordVisibility
} from "../auth.js"

export function setupAuthEvents() {
    dom.loginBtn.addEventListener("click", () => {
        login()
    })

    dom.email.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            login()
        }
    })

    dom.password.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            login()
        }
    })

    dom.passwordToggleBtn.addEventListener("click", () => {
        togglePasswordVisibility()
    })
}

