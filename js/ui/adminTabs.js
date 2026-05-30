import { dom } from "../dom.js"

import {
    renderAdminDashboard
} from "./dashboard.js"

import {
    renderAdminNoticeList
} from "./notices.js"

import {
    renderUsers
} from "./users.js"

import {
    renderAdminHistory
} from "./adminHistory.js"

import {
    renderAdminSummary
} from "./summary.js"

import {
    renderAdminWorkChart
} from "./charts.js"

import {
    renderMaintenanceAdminForm
} from "../maintenance/maintenance.js"

export function setupAdminTabs() {
    dom.adminTabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const tabName = button.dataset.adminTab
            showAdminTab(tabName)
        })
    })
}

export function showAdminTab(tabName) {
    dom.adminTabButtons.forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.adminTab === tabName
        )
    })

    dom.adminTabPanels.forEach((panel) => {
        panel.classList.remove("show")
    })

    const targetPanel = getPanelByTabName(tabName)

    if (targetPanel) {
        targetPanel.classList.add("show")
    }

    refreshAdminTab(tabName)
}

function getPanelByTabName(tabName) {
    if (tabName === "dashboard") return dom.adminTabDashboard
    if (tabName === "notice") return dom.adminTabNotice
    if (tabName === "employees") return dom.adminTabEmployees
    if (tabName === "history") return dom.adminTabHistory
    if (tabName === "manual") return dom.adminTabManual
    if (tabName === "holiday") return dom.adminTabHoliday
    if (tabName === "report") return dom.adminTabReport
    if (tabName === "maintenance") return dom.adminTabMaintenance

    return dom.adminTabDashboard
}

function refreshAdminTab(tabName) {
    if (tabName === "dashboard") {
        renderAdminDashboard()
        return
    }

    if (tabName === "notice") {
        renderAdminNoticeList()
        return
    }

    if (tabName === "employees") {
        renderUsers()
        return
    }

    if (tabName === "maintenance") {
        renderMaintenanceAdminForm()
        return
    }

    if (tabName === "history") {
        renderAdminHistory()
        renderAdminSummary()
        renderAdminWorkChart()
    }
}
