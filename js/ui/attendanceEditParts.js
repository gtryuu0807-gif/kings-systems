import { escapeHtml } from "../utils.js"

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

    editBtn.addEventListener("click", () => {
        if (record) {
            if (isAdmin) {
                updateAttendanceTimeByAdmin(record.id, editInput.value)
            } else {
                updateAttendanceTime(record.id, editInput.value)
            }

            return
        }

        createAttendanceRecord(
            type,
            editInput.value,
            targetUser,
            setNumber
        )
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
