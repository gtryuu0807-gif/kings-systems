import { auth } from "../firebase.js"
import { dom } from "../dom.js"
import { state } from "../state.js"

export function showWelcomeName() {
    const user = auth.currentUser

    if (!user) {
        hideWelcomeName()
        return
    }

    const email = String(user.email || "").toLowerCase()

    const userData = state.allUsers.find((item) => {
        return String(item.email || "").toLowerCase() === email
    })

    const displayName =
        userData?.name ||
        user.displayName ||
        user.email ||
        "社員"

    const role =
        userData?.role ||
        state.currentUserRole ||
        "employee"

    dom.welcomeName.textContent =
        role === "admin"
            ? `👑 ${displayName}`
            : displayName

    dom.welcomeBox.style.display = "flex"
}

export function hideWelcomeName() {
    dom.welcomeName.textContent = ""
    dom.welcomeBox.style.display = "none"
}