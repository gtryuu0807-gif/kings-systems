import { dom } from "../dom.js"

export function toggleMyRangeInputs() {
    if (dom.myHistoryRangeType.value === "year") {
        dom.myHistoryMonth.style.display = "none"
        dom.myHistoryYear.style.display = "block"
    } else {
        dom.myHistoryMonth.style.display = "block"
        dom.myHistoryYear.style.display = "none"
    }
}

export function toggleAdminRangeInputs() {
    if (dom.adminHistoryRangeType.value === "year") {
        dom.adminHistoryMonth.style.display = "none"
        dom.adminHistoryYear.style.display = "block"
    } else {
        dom.adminHistoryMonth.style.display = "block"
        dom.adminHistoryYear.style.display = "none"
    }
}

export function setInitialRangeDisplay() {
    toggleMyRangeInputs()
    toggleAdminRangeInputs()
}

