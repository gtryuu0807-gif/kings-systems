import { dom } from "../dom.js"

function padMonth(value) {
    return String(value || "").padStart(2, "0")
}

function getCurrentYear() {
    return String(new Date().getFullYear())
}

function getCurrentMonth() {
    return String(new Date().getMonth() + 1)
}

function syncHiddenMonth({ yearInput, monthSelect, hiddenMonth }) {
    if (!hiddenMonth || !yearInput || !monthSelect) return
    const year = String(yearInput.value || getCurrentYear())
    const month = padMonth(monthSelect.value || getCurrentMonth())
    hiddenMonth.value = `${year}-${month}`
}

function syncVisibleMonth({ yearInput, monthSelect, hiddenMonth }) {
    if (!hiddenMonth || !yearInput || !monthSelect) return
    const value = String(hiddenMonth.value || "")
    const match = value.match(/^(\d{4})-(\d{2})$/)
    if (match) {
        yearInput.value = yearInput.value || match[1]
        monthSelect.value = String(Number(match[2]))
        return
    }
    yearInput.value = yearInput.value || getCurrentYear()
    monthSelect.value = monthSelect.value || getCurrentMonth()
    syncHiddenMonth({ yearInput, monthSelect, hiddenMonth })
}

function setMode({ rangeType, monthField, yearModeBtn }, mode) {
    // 勤務履歴は「年・月・表示する」のみに統一。旧年別表示は廃止。
    if (rangeType) rangeType.value = "month"
    if (monthField) monthField.hidden = false
    if (yearModeBtn) yearModeBtn.hidden = true
}

export function syncMyHistoryMonth() {
    syncHiddenMonth({
        yearInput: dom.myHistoryYear,
        monthSelect: dom.myHistoryMonthSelect,
        hiddenMonth: dom.myHistoryMonth
    })
}

export function syncAdminHistoryMonth() {
    syncHiddenMonth({
        yearInput: dom.adminHistoryYear,
        monthSelect: dom.adminHistoryMonthSelect,
        hiddenMonth: dom.adminHistoryMonth
    })
}

export function toggleMyRangeInputs() {
    const monthField = dom.myHistoryMonthSelect?.closest?.(".kingsMonthField")
    setMode({
        rangeType: dom.myHistoryRangeType,
        monthField,
        yearModeBtn: dom.myHistoryYearModeBtn
    }, "month")
    syncMyHistoryMonth()
}

export function toggleAdminRangeInputs() {
    const monthField = dom.adminHistoryMonthSelect?.closest?.(".kingsMonthField")
    setMode({
        rangeType: dom.adminHistoryRangeType,
        monthField,
        yearModeBtn: dom.adminHistoryYearModeBtn
    }, "month")
    syncAdminHistoryMonth()
}

export function setInitialRangeDisplay() {
    syncVisibleMonth({
        yearInput: dom.myHistoryYear,
        monthSelect: dom.myHistoryMonthSelect,
        hiddenMonth: dom.myHistoryMonth
    })
    syncVisibleMonth({
        yearInput: dom.adminHistoryYear,
        monthSelect: dom.adminHistoryMonthSelect,
        hiddenMonth: dom.adminHistoryMonth
    })
    toggleMyRangeInputs()
    toggleAdminRangeInputs()
}
