import { dom } from "../dom.js"
import { saveMainTab } from "../screenState.js"

import {
    renderHistory
} from "./history.js"

import {
    renderMySummary
} from "./summary.js"

import {
    renderMyWorkChart
} from "./charts.js"

export function setupMainTabs() {
    dom.mainTabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const tabName = button.dataset.mainTab
            showMainTab(tabName)
        })
    })
}

export function showMainTab(tabName) {
    saveMainTab(tabName)
    dom.mainTabButtons.forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.mainTab === tabName
        )
    })

    dom.mainTabPanels.forEach((panel) => {
        panel.classList.remove("show")
    })

    const targetPanel = getPanelByTabName(tabName)

    if (targetPanel) {
        targetPanel.classList.add("show")
    }

    refreshMainTab(tabName)
}

function getPanelByTabName(tabName) {
    if (tabName === "history") return dom.mainTabHistory
    if (tabName === "manual") return dom.mainTabManual
    if (tabName === "holiday") return dom.mainTabHoliday
    if (tabName === "report") return dom.mainTabReport
    if (tabName === "settings") return dom.mainTabSettings

    return dom.mainTabHistory
}

function refreshMainTab(tabName) {
    if (tabName === "history") {
        renderHistory()
        renderMySummary()
        renderMyWorkChart()
    }
}

