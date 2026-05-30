import { dom } from "../dom.js"
import { addNotice } from "../notices.js"

export function setupNoticeEvents() {
    dom.addNoticeBtn.addEventListener("click", () => {
        addNotice()
    })
}
