import {
    renderAdminHistory,
    renderUsers
} from "../ui.js"

import {
    renderAdminSummary
} from "../ui/summary.js"

import {
    renderAdminWorkChart
} from "../ui/charts.js"

import {
    renderAdminDashboard
} from "../ui/dashboard.js"

import {
    renderAdminSelectOptions
} from "./adminSelectOptions.js"

export function setupUsersChangedEvents() {
    document.addEventListener("usersChanged", () => {
        renderAdminSelectOptions()
        renderUsers()
        renderAdminHistory()
        renderAdminSummary()
        renderAdminWorkChart()
        renderAdminDashboard()
    })
}

