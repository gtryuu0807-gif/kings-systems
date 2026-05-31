import { dom } from "../dom.js"
import { state } from "../state.js"
import { escapeHtml } from "../utils.js"

import { confirmNotice, deleteNotice, isNoticeConfirmedByMe } from "../notices.js"

const NOTICE_BODY_LIMIT_LINES = 20
const LATEST_NOTICE_BODY_LIMIT_LINES = 10

export function renderNotices() {
    if (!dom.noticeList) return

    const visibleNotices = state.allNotices.filter(isNoticeVisibleNow)

    if (visibleNotices.length === 0) {
        dom.noticeList.innerHTML = `<div class="noticeCard latestNoticeCard empty"><div class="noticeHeader"><span class="menuItemSvg icon-notice" aria-hidden="true"></span><strong>お知らせ</strong></div><div class="noticeEmpty">お知らせはありません</div></div>`
        return
    }

    const latest = visibleNotices[0]
    const restCount = Math.max(0, visibleNotices.length - 1)
    const isConfirmed = isNoticeConfirmedByMe(latest)
    const isNew = isNewNotice(latest.createdAt)

    dom.noticeList.innerHTML = `
        <div class="noticeCard latestNoticeCard">
            <div class="noticeHeader">
                <div class="noticeTitleArea">
                    <span class="menuItemSvg icon-notice" aria-hidden="true"></span>
                    <strong>お知らせ</strong>
                </div>
                ${isNew ? createNewBadgeSvg() : ""}
            </div>
            <div class="latestNoticeSummary latestNoticeSummaryStatic">
                <strong>${escapeHtml(latest.title)}</strong>
                <span>${createNoticeScheduleText(latest)}</span>
            </div>
            <div id="latestNoticeDetail" class="latestNoticeDetail">
                ${createNoticeBodyHtml(latest, LATEST_NOTICE_BODY_LIMIT_LINES)}
                <div class="noticeMetaBox">
                    <div>投稿者：${escapeHtml(latest.authorName || "投稿者不明")}</div>
                    <div>投稿日：${escapeHtml(formatDate(latest.createdAt))}</div>
                </div>
                <div class="noticeConfirmArea">
                    <button class="noticeConfirmBtn ${isConfirmed ? "confirmed" : ""}" data-notice-id="${escapeHtml(latest.id)}" ${isConfirmed ? "disabled" : ""}>${createConfirmButtonLabel(isConfirmed)}</button>
                </div>
            </div>
            ${restCount > 0 ? `<button type="button" class="noticeListToggleBtn" data-closed-label="他${restCount}件あります" aria-expanded="false">他${restCount}件あります</button>` : ""}
            <div id="noticeAllList" class="noticeAllList" hidden>
                ${visibleNotices.slice(1).map((notice) => `<button type="button" class="noticeMiniItem" data-notice-mini="${escapeHtml(notice.id)}"><strong>${isNewNotice(notice.createdAt) ? "NEW " : ""}${escapeHtml(notice.title)}</strong><span>${escapeHtml(formatDate(notice.createdAt))}</span></button>`).join("")}
            </div>
        </div>
    `

    setupNoticeButtons(dom.noticeList)
}

export function renderAdminNoticeList() {
    if (!dom.adminNoticeList) return

    if (state.allNotices.length === 0) {
        dom.adminNoticeList.innerHTML = `<div class="noticeEmpty">お知らせはありません</div>`
        return
    }

    dom.adminNoticeList.innerHTML = state.allNotices.map((notice) => {
        const confirmedUsers = notice.confirmedUsers || []
        const isNew = isNewNotice(notice.createdAt)
        return `
            <div class="adminNoticeCard">
                <div class="noticeHeader">
                    <div class="noticeTitleArea"><span class="menuItemSvg icon-notice" aria-hidden="true"></span><strong>${isNew ? createNewBadgeSvg() : ""}${escapeHtml(notice.title)}</strong></div>
                    <span class="noticeStateBadge ${getNoticeStateClass(notice)}">${getNoticeStateLabel(notice)}</span>
                </div>
                ${createNoticeBodyHtml(notice)}
                <div class="noticeMetaBox">
                    <div>投稿者：${escapeHtml(notice.authorName || "投稿者不明")}</div>
                    <div>投稿日：${escapeHtml(formatDate(notice.createdAt))}</div>
                    ${notice.startAt ? `<div>開始：${escapeHtml(formatInputDate(notice.startAt))}</div>` : ""}
                    ${notice.endAt ? `<div>終了：${escapeHtml(formatInputDate(notice.endAt))}</div>` : ""}
                </div>
                <div class="adminNoticeConfirmBox"><strong>確認した社員（${confirmedUsers.length}人）</strong>${createConfirmedUsersHtml(confirmedUsers, "管理者")}</div>
                <button class="noticeDeleteBtn" data-notice-id="${escapeHtml(notice.id)}">お知らせを削除</button>
            </div>
        `
    }).join("")

    setupNoticeButtons(dom.adminNoticeList)
}

function setupNoticeButtons(container) {
    container.querySelectorAll(".noticeConfirmBtn").forEach((button) => button.addEventListener("click", () => confirmNotice(button.dataset.noticeId)))
    container.querySelectorAll(".noticeDeleteBtn").forEach((button) => button.addEventListener("click", () => deleteNotice(button.dataset.noticeId)))
    container.querySelectorAll(".latestNoticeSummary").forEach((button) => button.addEventListener("click", () => {
        const detail = container.querySelector("#latestNoticeDetail")
        if (detail) detail.hidden = !detail.hidden
    }))
    container.querySelectorAll(".noticeListToggleBtn").forEach((button) => button.addEventListener("click", () => {
        const list = container.querySelector("#noticeAllList")
        if (!list) return
        const shouldOpen = list.hidden
        list.hidden = !shouldOpen
        button.setAttribute("aria-expanded", String(shouldOpen))
        button.textContent = shouldOpen ? "お知らせ一覧を閉じる" : button.dataset.closedLabel || "他のお知らせがあります"
    }))
    container.querySelectorAll(".noticeMiniItem").forEach((button) => button.addEventListener("click", () => {
        const notice = state.allNotices.find((item) => item.id === button.dataset.noticeMini)
        if (!notice) return
        const detail = container.querySelector("#latestNoticeDetail")
        if (!detail) return
        detail.hidden = false
        detail.innerHTML = `${createNoticeBodyHtml(notice)}<div class="noticeMetaBox"><div>投稿者：${escapeHtml(notice.authorName || "投稿者不明")}</div><div>投稿日：${escapeHtml(formatDate(notice.createdAt))}</div></div>`
    }))
    container.querySelectorAll(".confirmedToggleBtn").forEach((button) => button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.targetId)
        if (!target) return
        target.classList.toggle("show")
        button.textContent = target.classList.contains("show") ? "閉じる" : "すべて見る"
    }))
    container.querySelectorAll(".noticeBodyToggleBtn").forEach((button) => button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.targetId)
        if (!target) return
        const isOpen = button.dataset.open === "true"
        const nextText = isOpen ? button.dataset.preview : button.dataset.full
        target.innerHTML = escapeHtml(nextText).replaceAll("\n", "<br>")
        target.classList.toggle("noticeBodyExpanded", !isOpen)
        button.dataset.open = isOpen ? "false" : "true"
        button.textContent = isOpen ? "続きを読む" : "閉じる"
    }))
}

function createNoticeBodyHtml(notice, limitLines = NOTICE_BODY_LIMIT_LINES) {
    const body = String(notice.body || "")
    const lines = body.split(/\r?\n/)
    const isLongBody = lines.length > limitLines
    const previewText = isLongBody ? lines.slice(0, limitLines).join("\n") : body
    const fullBodyId = `noticeBody_${String(notice.id || Math.random()).replaceAll("-", "_")}_${Math.random().toString(36).slice(2)}`
    if (!isLongBody) return `<div class="noticeBody">${escapeHtml(body).replaceAll("\n", "<br>")}</div>`
    return `<div class="noticeBody noticeBodyPreview" id="${fullBodyId}">${escapeHtml(previewText).replaceAll("\n", "<br>")}</div><button class="noticeBodyToggleBtn" data-target-id="${fullBodyId}" data-preview="${escapeHtml(previewText)}" data-full="${escapeHtml(body)}" data-open="false">続きを読む</button>`
}

function createNewBadgeSvg() { return `<span class="noticeNewBadge svgNewBadge" aria-label="新着">NEW</span>` }
function createConfirmButtonLabel(isConfirmed) { return `<span class="noticeBtnIcon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5 9.2 16.5 19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>${isConfirmed ? "確認済み" : "確認する"}</span>` }

function createConfirmedUsersHtml(confirmedUsers, mode) {
    const count = confirmedUsers.length
    if (count === 0) return mode === "管理者" ? "" : `<div class="confirmedUserSummary">確認済み：0人</div>`
    const previewUsers = count <= 5 ? confirmedUsers : confirmedUsers.slice(0, 5)
    const hiddenCount = Math.max(0, count - previewUsers.length)
    const fullListId = `confirmedList_${mode}_${Math.random().toString(36).slice(2)}`
    return `${mode === "管理者" ? "" : `<div class="confirmedUserSummary">確認済み：${count}人</div>`}<div class="confirmedPreviewList">${previewUsers.map((user) => `<span class="confirmedPreviewItem">${escapeHtml(user.name || user.email || "社員")}</span>`).join("")}${hiddenCount > 0 ? `<span class="confirmedMoreBadge">+${hiddenCount}</span>` : ""}</div>${count >= 10 ? `<button class="confirmedToggleBtn" data-target-id="${fullListId}">すべて見る</button><div id="${fullListId}" class="confirmedFullList">${confirmedUsers.map((user, index) => `<div class="confirmedUserItem"><span>${index + 1}</span><strong>${escapeHtml(user.name || user.email || "社員")}</strong></div>`).join("")}</div>` : ""}`
}


function isNoticeVisibleNow(notice) {
    const now = Date.now()
    const start = notice.startAt ? new Date(notice.startAt).getTime() : 0
    const end = notice.endAt ? new Date(notice.endAt).getTime() : 0
    if (start && now < start) return false
    if (end && now > end) return false
    return true
}

function getNoticeStateLabel(notice) {
    const now = Date.now(); const start = notice.startAt ? new Date(notice.startAt).getTime() : 0; const end = notice.endAt ? new Date(notice.endAt).getTime() : 0
    if (start && now < start) return "予約中"
    if (end && now > end) return "終了"
    return "公開中"
}
function getNoticeStateClass(notice) { return getNoticeStateLabel(notice) === "公開中" ? "active" : getNoticeStateLabel(notice) === "予約中" ? "reserved" : "ended" }
function createNoticeScheduleText(notice) { const parts=[]; if(notice.startAt) parts.push(`${formatInputDate(notice.startAt)}開始`); if(notice.endAt) parts.push(`${formatInputDate(notice.endAt)}終了`); return escapeHtml(parts.join(" / ") || formatDate(notice.createdAt)) }
function formatInputDate(value) { if(!value) return ""; const d=new Date(value); if(Number.isNaN(d.getTime())) return value; return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` }
function isNewNotice(createdAt) { const t=getTimeValue(createdAt); return Boolean(t && Date.now()-t <= 48*60*60*1000) }
function getTimeValue(timeValue) { const d=getDate(timeValue); return d ? d.getTime() : 0 }
function getDate(timeValue) { if (timeValue?.seconds) return new Date(timeValue.seconds*1000); if(timeValue instanceof Date) return timeValue; return null }
function formatDate(timeValue) { const d=getDate(timeValue); return d ? d.toLocaleString() : "-" }
