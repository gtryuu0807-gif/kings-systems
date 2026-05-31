import { dom } from "../dom.js"
import { addNotice } from "../notices.js"

function syncNoticeScheduleFields() {
    const startCustom = dom.noticeStartDatetimeRadio?.checked === true
    const endCustom = dom.noticeEndDatetimeRadio?.checked === true
    if (dom.noticeStartAtField) dom.noticeStartAtField.hidden = !startCustom
    if (dom.noticeEndAtField) dom.noticeEndAtField.hidden = !endCustom
    if (!startCustom && dom.noticeStartAt) dom.noticeStartAt.value = ""
    if (!endCustom && dom.noticeEndAt) dom.noticeEndAt.value = ""
}

export function setupNoticeEvents() {
    dom.addNoticeBtn?.addEventListener("click", () => {
        addNotice()
    })
    ;[dom.noticeStartNowRadio, dom.noticeStartDatetimeRadio, dom.noticeEndNoneRadio, dom.noticeEndDatetimeRadio].forEach((radio) => {
        radio?.addEventListener("change", syncNoticeScheduleFields)
    })
    syncNoticeScheduleFields()
}
