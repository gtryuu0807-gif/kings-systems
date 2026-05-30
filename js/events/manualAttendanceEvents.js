import { dom } from "../dom.js"
import { state } from "../state.js"

import {
    createManualAttendanceSets
} from "../attendance/manualAdd.js"

import {
    showWarning
} from "../notify.js"

export function setupManualAttendanceEvents() {
    const myList = createManualRowsController({
        container: dom.manualAttendanceRows,
        addRowBtn: dom.addManualAttendanceRowBtn,
        submitBtn: dom.addManualAttendanceBtn
    })

    const adminList = createManualRowsController({
        container: dom.adminManualAttendanceRows,
        addRowBtn: dom.addAdminManualAttendanceRowBtn,
        submitBtn: dom.adminAddManualAttendanceBtn
    })

    dom.addManualAttendanceBtn?.addEventListener("click", async () => {
        const ok = await createManualAttendanceSets({
            rows: myList.getRows()
        })

        if (ok) myList.reset()
    })

    dom.adminAddManualAttendanceBtn?.addEventListener("click", async () => {
        const selectedUserId = dom.adminManualEmployeeSelect.value

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

        const ok = await createManualAttendanceSets({
            rows: adminList.getRows(),
            targetUser: {
                uid: targetUser.uid || "",
                email: targetUser.email
            }
        })

        if (ok) adminList.reset()
    })
}

function createManualRowsController({
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

                    <div class="manualFormGrid multiEntryGrid">
                        <label>
                            <span>日付</span>
                            <input type="date" class="manualRowDate">
                        </label>

                        <label>
                            <span>出勤時間（任意）</span>
                            <input type="time" class="manualRowClockIn">
                        </label>

                        <label>
                            <span>退勤時間（任意）</span>
                            <input type="time" class="manualRowClockOut">
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
        const currentRows = getRows()
        rowCount += 1
        render()
        setRows([...currentRows, {}])
    }

    function removeRow(index) {
        if (index <= 0) return
        if (rowCount <= 1) return

        const currentRows = getRows()
        currentRows.splice(index, 1)
        rowCount -= 1
        render()
        setRows(currentRows)
    }

    function reset() {
        rowCount = 1
        render()
    }

    function getRows() {
        if (!container) return []

        return Array.from(container.querySelectorAll(".multiEntryItem"))
            .map((item) => {
                return {
                    workDate: item.querySelector(".manualRowDate")?.value || "",
                    clockInTime: item.querySelector(".manualRowClockIn")?.value || "",
                    clockOutTime: item.querySelector(".manualRowClockOut")?.value || ""
                }
            })
    }

    function setRows(rows) {
        if (!container) return

        const items = Array.from(container.querySelectorAll(".multiEntryItem"))

        items.forEach((item, index) => {
            const row = rows[index] || {}

            const date = item.querySelector(".manualRowDate")
            const clockIn = item.querySelector(".manualRowClockIn")
            const clockOut = item.querySelector(".manualRowClockOut")

            if (date) date.value = row.workDate || ""
            if (clockIn) clockIn.value = row.clockInTime || ""
            if (clockOut) clockOut.value = row.clockOutTime || ""
        })
    }

    function updateSubmitText() {
        if (!submitBtn) return

        submitBtn.textContent = rowCount === 1
            ? "登録"
            : "まとめて登録"
    }

    addRowBtn?.addEventListener("click", addRow)

    render()

    return {
        getRows,
        reset
    }
}
