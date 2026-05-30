import { dom } from "../dom.js"
import { state } from "../state.js"

import {
    renderHistory,
    renderAdminHistory
} from "../ui.js"

import {
    deleteAllAttendance
} from "../admin.js"

export function setupPaginationEvents() {
    dom.deleteAllBtn.addEventListener("click", () => {
        deleteAllAttendance()
    })

    dom.prevPageBtn.addEventListener("click", () => {
        if (state.currentPage > 0) {
            state.currentPage--
            renderHistory()
        }
    })

    dom.nextPageBtn.addEventListener("click", () => {
        state.currentPage++
        renderHistory()
    })

    dom.adminPrevPageBtn.addEventListener("click", () => {
        if (state.adminCurrentPage > 0) {
            state.adminCurrentPage--
            renderAdminHistory()
        }
    })

    dom.adminNextPageBtn.addEventListener("click", () => {
        state.adminCurrentPage++
        renderAdminHistory()
    })
}

