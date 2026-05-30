import { dom } from "../dom.js"
import { state } from "../state.js"

import {
    addHolidays
} from "../attendance/holiday.js"

import {
    showWarning
} from "../notify.js"

export function setupHolidayEvents() {
    const myList = createHolidayRowsController({
        container: dom.myHolidayRows,
        addRowBtn: dom.addMyHolidayRowBtn,
        submitBtn: dom.addMyHolidayBtn
    })

    const adminList = createHolidayRowsController({
        container: dom.adminHolidayRows,
        addRowBtn: dom.addAdminHolidayRowBtn,
        submitBtn: dom.addAdminHolidayBtn
    })

    dom.addMyHolidayBtn?.addEventListener("click", async () => {
        const ok = await addHolidays(myList.getDates())
        if (ok) myList.reset()
    })

    dom.addAdminHolidayBtn?.addEventListener("click", async () => {
        const selectedUserId = dom.adminHolidayEmployeeSelect.value

        if (!selectedUserId) {
            showWarning("社員を選択してください")
            return
        }

        const targetUser = state.allUsers.find((user) => {
            return user.id === selectedUserId
        })

        if (!targetUser) {
            showWarning("社員情報が見つかりません")
            return
        }

        const ok = await addHolidays(adminList.getDates(), {
            uid: targetUser.uid || "",
            email: targetUser.email
        })

        if (ok) adminList.reset()
    })
}

function createHolidayRowsController({
    container,
    addRowBtn,
    submitBtn
}) {
    let rowCount = 1

    function render() {
        if (!container) return

        container.innerHTML = Array.from({ length: rowCount })
            .map((_, index) => {
                const rowNumber = index + 1

                return `
                <div class="multiEntryItem" data-index="${index}">
                    <div class="multiEntryHeader">
                        <strong>${rowNumber}件目</strong>
                        ${index > 0 ? `
                        <button type="button" class="removeMultiEntryBtn" data-index="${index}">
                            削除
                        </button>
                        ` : ""}
                    </div>

                    <div class="manualFormGrid multiEntryGrid singleDateGrid">
                        <label>
                            <span>休みにする日付</span>
                            <input type="date" class="holidayRowDate">
                        </label>
                    </div>
                </div>
                `
            })
            .join("")

        container
            .querySelectorAll(".removeMultiEntryBtn")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    removeRow(Number(button.dataset.index))
                })
            })

        updateSubmitText()
    }

    function addRow() {
        const currentDates = getDates()
        rowCount += 1
        render()
        setDates([...currentDates, ""])
    }

    function removeRow(index) {
        if (index <= 0) return
        if (rowCount <= 1) return

        const currentDates = getDates()
        currentDates.splice(index, 1)
        rowCount -= 1
        render()
        setDates(currentDates)
    }

    function reset() {
        rowCount = 1
        render()
    }

    function getDates() {
        if (!container) return []

        return Array.from(container.querySelectorAll(".holidayRowDate"))
            .map((input) => input.value || "")
    }

    function setDates(dates) {
        if (!container) return

        Array.from(container.querySelectorAll(".holidayRowDate"))
            .forEach((input, index) => {
                input.value = dates[index] || ""
            })
    }

    function updateSubmitText() {
        if (!submitBtn) return

        submitBtn.textContent = rowCount === 1
            ? "登録"
            : "まとめて休み登録"
    }

    addRowBtn?.addEventListener("click", addRow)

    render()

    return {
        getDates,
        reset
    }
}
