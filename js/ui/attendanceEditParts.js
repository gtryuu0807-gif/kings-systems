import { escapeHtml } from "../utils.js"
import { showSuccess, showError, showWarning } from "../notify.js"

import {
    updateAttendanceTime,
    updateAttendanceTimeByAdmin,
    createAttendanceRecord,
    deleteAttendanceRecord,
    deleteAttendanceRecordByAdmin
} from "../attendance.js"

import { toDateTimeLocalValue } from "./attendanceGroups.js"

export function createAttendanceEditBlock(
    label,
    record,
    type,
    targetUser = null,
    setNumber = 1
) {
    return createEditBlock({
        label,
        record,
        type,
        targetUser,
        setNumber,
        isAdmin: false
    })
}

export function createAdminEditBlock(
    label,
    record,
    type,
    targetUser,
    setNumber = 1
) {
    return createEditBlock({
        label,
        record,
        type,
        targetUser,
        setNumber,
        isAdmin: true
    })
}

export function createAttendanceEditSetBlock(set, setNumber, targetUser = null) {
    return createEditSetBlock({
        set,
        setNumber,
        targetUser,
        isAdmin: false
    })
}

export function createAdminEditSetBlock(set, setNumber, targetUser) {
    return createEditSetBlock({
        set,
        setNumber,
        targetUser,
        isAdmin: true
    })
}


function createEditSetBlock({
    set,
    setNumber,
    targetUser,
    isAdmin
}) {
    const block = document.createElement("div")
    block.className = "attendanceEditSetBlock attendanceEditSetBlockUnified attendanceEditSetBlockSeparate"

    const title = document.createElement("div")
    title.className = "attendanceEditSetTitle"
    title.innerHTML = getSetNumberLabel(setNumber)

    const clockInRecord = set?.clockIn || null
    const clockOutRecord = set?.clockOut || null

    block.appendChild(title)

    block.appendChild(createEditControl({
        label: "出勤",
        record: clockInRecord,
        type: "出勤",
        targetUser,
        setNumber,
        isAdmin
    }))

    const divider = document.createElement("div")
    divider.className = "attendanceEditDivider"
    block.appendChild(divider)

    block.appendChild(createEditControl({
        label: "退勤",
        record: clockOutRecord,
        type: "退勤",
        targetUser,
        setNumber,
        isAdmin
    }))

    return block
}

function createUnifiedInput(label, record) {
    const element = document.createElement("label")
    element.className = "attendanceUnifiedTimeRow"

    const title = document.createElement("span")
    title.className = "attendanceUnifiedTimeLabel"
    title.textContent = label

    const input = document.createElement("input")
    input.type = "datetime-local"
    input.className = "historyEditInput"
    input.value = record ? toDateTimeLocalValue(record) : ""

    element.appendChild(title)
    element.appendChild(input)

    return { element, input }
}

function createEditControl({
    label,
    record,
    type,
    targetUser,
    setNumber,
    isAdmin
}) {
    const control = document.createElement("div")
    control.className = "attendanceEditControl"

    const title = document.createElement("div")
    title.className = "attendanceEditTitle"
    title.innerHTML = escapeHtml(label)

    const editInput = document.createElement("input")
    editInput.type = "datetime-local"
    editInput.className = "historyEditInput"
    editInput.value = record ? toDateTimeLocalValue(record) : ""

    const editBtn = document.createElement("button")
    editBtn.className = "attendanceEditBtn"
    editBtn.innerHTML = record
        ? `${escapeHtml(label)}を変更`
        : `${escapeHtml(label)}を追加`

    editBtn.addEventListener("click", async () => {
        if (!editInput.value) {
            showWarning(`${label}時間を入力してください`)
            return
        }

        editBtn.disabled = true
        try {
            if (record) {
                if (isAdmin) {
                    await updateAttendanceTimeByAdmin(record.id, editInput.value)
                } else {
                    await updateAttendanceTime(record.id, editInput.value)
                }
                showSuccess(`${label}を変更しました`)
                return
            }

            await createAttendanceRecord(
                type,
                editInput.value,
                targetUser,
                setNumber
            )
            showSuccess(`${label}を追加しました`)
        } catch (error) {
            console.error(error)
            showError(`${label}の変更に失敗しました`, "ATT-004")
        } finally {
            editBtn.disabled = false
        }
    })

    control.appendChild(title)
    control.appendChild(editInput)
    control.appendChild(editBtn)

    if (record) {
        const deleteBtn = document.createElement("button")
        deleteBtn.className = "attendanceDeleteBtn"
        deleteBtn.innerHTML = `${escapeHtml(label)}を削除`

        deleteBtn.addEventListener("click", () => {
            if (isAdmin) {
                deleteAttendanceRecordByAdmin(record.id)
            } else {
                deleteAttendanceRecord(record.id)
            }
        })

        control.appendChild(deleteBtn)
    }

    return control
}

function getSetNumberLabel(setNumber) {
    if (setNumber === 1) return "①"
    if (setNumber === 2) return "②"
    if (setNumber === 3) return "③"
    return `${setNumber}`
}

function createEditBlock({
    label,
    record,
    type,
    targetUser,
    setNumber,
    isAdmin
}) {
    const block = document.createElement("div")
    block.className = "attendanceEditBlock"

    const title = document.createElement("div")
    title.className = "attendanceEditTitle"
    title.innerHTML = escapeHtml(label)

    const editInput = document.createElement("input")
    editInput.type = "datetime-local"
    editInput.className = "historyEditInput"
    editInput.value = record ? toDateTimeLocalValue(record) : ""

    const editBtn = document.createElement("button")
    editBtn.className = "attendanceEditBtn"
    editBtn.innerHTML = record
        ? `${escapeHtml(label)}を変更`
        : `${escapeHtml(label)}を追加`

    editBtn.addEventListener("click", async () => {
        if (!editInput.value) {
            showWarning(`${label}時間を入力してください`)
            return
        }

        editBtn.disabled = true
        try {
            if (record) {
                if (isAdmin) {
                    await updateAttendanceTimeByAdmin(record.id, editInput.value)
                } else {
                    await updateAttendanceTime(record.id, editInput.value)
                }
                showSuccess(`${label}を変更しました`)
                return
            }

            await createAttendanceRecord(
                type,
                editInput.value,
                targetUser,
                setNumber
            )
            showSuccess(`${label}を追加しました`)
        } catch (error) {
            console.error(error)
            showError(`${label}の変更に失敗しました`, "ATT-004")
        } finally {
            editBtn.disabled = false
        }
    })

    block.appendChild(title)
    block.appendChild(editInput)
    block.appendChild(editBtn)

    if (record) {
        const deleteBtn = document.createElement("button")
        deleteBtn.className = "attendanceDeleteBtn"
        deleteBtn.innerHTML = `${escapeHtml(label)}を削除`

        deleteBtn.addEventListener("click", () => {
            if (isAdmin) {
                deleteAttendanceRecordByAdmin(record.id)
            } else {
                deleteAttendanceRecord(record.id)
            }
        })

        block.appendChild(deleteBtn)
    }

    return block
}
