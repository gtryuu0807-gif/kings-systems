import { dom } from "../dom.js"
import { state } from "../state.js"

import {
    renderHistory,
    renderAdminHistory
} from "../ui.js"

import {
    toggleMyRangeInputs,
    toggleAdminRangeInputs,
    syncMyHistoryMonth,
    syncAdminHistoryMonth
} from "./rangeInputs.js"

function onMyFilterChanged() {
    state.currentPage = 0
    state.hasAppliedMyHistoryFilter = true
    syncMyHistoryMonth()
    renderHistory()
}

function onAdminFilterChanged() {
    state.adminCurrentPage = 0
    state.hasAppliedAdminHistoryFilter = true
    syncAdminHistoryMonth()
    renderAdminHistory()
}

export function setupFilterEvents() {
    dom.myHistoryRangeType?.addEventListener("change", () => {
        state.currentPage = 0
        toggleMyRangeInputs()
        state.hasAppliedMyHistoryFilter = false
        renderHistory()
    })

    dom.myHistoryMonth?.addEventListener("change", syncMyHistoryMonth)
    dom.myHistoryMonthSelect?.addEventListener("change", syncMyHistoryMonth)
    dom.myHistoryYear?.addEventListener("change", () => {})
    dom.myHistoryApplyBtn?.addEventListener("click", onMyFilterChanged)
    dom.adminHistoryEmployeeSelect?.addEventListener("change", () => {})

    dom.adminHistoryRangeType?.addEventListener("change", () => {
        state.adminCurrentPage = 0
        toggleAdminRangeInputs()
        state.hasAppliedAdminHistoryFilter = false
        renderAdminHistory()
    })

    dom.adminHistoryMonth?.addEventListener("change", syncAdminHistoryMonth)
    dom.adminHistoryMonthSelect?.addEventListener("change", syncAdminHistoryMonth)
    dom.adminHistoryYear?.addEventListener("change", () => {})
    dom.adminHistoryApplyBtn?.addEventListener("click", onAdminFilterChanged)
}
