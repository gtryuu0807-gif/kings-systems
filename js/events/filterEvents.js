import { dom } from "../dom.js"
import { state } from "../state.js"

import {
    renderHistory,
    renderAdminHistory
} from "../ui.js"

import {
    toggleMyRangeInputs,
    toggleAdminRangeInputs
} from "./rangeInputs.js"

export function setupFilterEvents() {
    dom.myHistoryRangeType.addEventListener("change", () => {
        state.currentPage = 0
        toggleMyRangeInputs()
        renderHistory()
    })

    dom.myHistoryMonth.addEventListener("change", () => {
        state.currentPage = 0
        renderHistory()
    })

    dom.myHistoryYear.addEventListener("change", () => {
        state.currentPage = 0
        renderHistory()
    })

    dom.adminHistoryEmployeeSelect.addEventListener("change", () => {
        state.adminCurrentPage = 0
        renderAdminHistory()
    })

    dom.adminHistoryRangeType.addEventListener("change", () => {
        state.adminCurrentPage = 0
        toggleAdminRangeInputs()
        renderAdminHistory()
    })

    dom.adminHistoryMonth.addEventListener("change", () => {
        state.adminCurrentPage = 0
        renderAdminHistory()
    })

    dom.adminHistoryYear.addEventListener("change", () => {
        state.adminCurrentPage = 0
        renderAdminHistory()
    })
}

