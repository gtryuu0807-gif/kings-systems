import { dom } from "../dom.js"
import { punch } from "../attendance.js"

export function setupPunchEvents() {
    dom.clockInBtn.addEventListener("click", () => {
        punch("出勤")
    })

    dom.clockOutBtn.addEventListener("click", () => {
        punch("退勤")
    })
}

