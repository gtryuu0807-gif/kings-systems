import { dom } from "../dom.js"
import { state } from "../state.js"
import { escapeHtml } from "../utils.js"

import {
    confirmNotice,
    deleteNotice,
    isNoticeConfirmedByMe
} from "../notices.js"

const NOTICE_BODY_LIMIT_LINES = 20

export function renderNotices() {
    if (!dom.noticeList) return

    if (state.allNotices.length === 0) {
        dom.noticeList.innerHTML = `
        <div class="noticeEmpty">
            お知らせはありません
        </div>
        `
        return
    }

    dom.noticeList.innerHTML = state.allNotices
        .map((notice) => {
            const isConfirmed = isNoticeConfirmedByMe(notice)
            const isNew = isNewNotice(notice.createdAt)
            const confirmedUsers = notice.confirmedUsers || []

            return `
            <div class="noticeCard">

                <div class="noticeHeader">
                    <div class="noticeTitleArea">
                        <strong>
                            ${isNew ? createNewBadgeSvg() : ""}
                            ${escapeHtml(notice.title)}
                        </strong>
                    </div>
                </div>

                ${createNoticeBodyHtml(notice)}

                <div class="noticeMetaBox">
                    <div>投稿者：${escapeHtml(notice.authorName || "投稿者不明")}</div>
                    <div>投稿日：${escapeHtml(formatDate(notice.createdAt))}</div>
                </div>

                <div class="noticeConfirmArea">
                    <button
                        class="noticeConfirmBtn ${isConfirmed ? "confirmed" : ""}"
                        data-notice-id="${escapeHtml(notice.id)}"
                        ${isConfirmed ? "disabled" : ""}
                    >
                        ${createConfirmButtonLabel(isConfirmed)}
                    </button>

                    ${createConfirmedUsersHtml(confirmedUsers, "社員")}
                </div>

            </div>
            `
        })
        .join("")

    setupNoticeButtons(dom.noticeList)
}

export function renderAdminNoticeList() {
    if (!dom.adminNoticeList) return

    if (state.allNotices.length === 0) {
        dom.adminNoticeList.innerHTML = `
        <div class="noticeEmpty">
            お知らせはありません
        </div>
        `
        return
    }

    dom.adminNoticeList.innerHTML = state.allNotices
        .map((notice) => {
            const confirmedUsers = notice.confirmedUsers || []
            const isNew = isNewNotice(notice.createdAt)

            return `
            <div class="adminNoticeCard">

                <div class="noticeHeader">
                    <div class="noticeTitleArea">
                        <strong>
                            ${isNew ? createNewBadgeSvg() : ""}
                            ${escapeHtml(notice.title)}
                        </strong>
                    </div>
                </div>

                ${createNoticeBodyHtml(notice)}

                <div class="noticeMetaBox">
                    <div>投稿者：${escapeHtml(notice.authorName || "投稿者不明")}</div>
                    <div>投稿日：${escapeHtml(formatDate(notice.createdAt))}</div>
                </div>

                <div class="adminNoticeConfirmBox">
                    <strong>
                        確認した社員（${confirmedUsers.length}人）
                    </strong>

                    ${createConfirmedUsersHtml(confirmedUsers, "管理者")}
                </div>

                <button
                    class="noticeDeleteBtn"
                    data-notice-id="${escapeHtml(notice.id)}"
                >
                    お知らせを削除
                </button>

            </div>
            `
        })
        .join("")

    setupNoticeButtons(dom.adminNoticeList)
}


function createNewBadgeSvg() {
    return `
    <span class="noticeNewBadge svgNewBadge" aria-label="新着">
        <svg viewBox="0 0 44 24" focusable="false" aria-hidden="true">
            <rect x="1" y="1" width="42" height="22" rx="7" fill="currentColor" opacity="0.16"/>
            <rect x="1" y="1" width="42" height="22" rx="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9 16V8h1.8l3.4 4.8V8H16v8h-1.8l-3.4-4.8V16H9Zm9.5 0V8h6v1.6h-4.1v1.5H24v1.6h-3.6v1.7h4.2V16h-6.1Zm9.3 0L25.9 8h2l1 4.9L30.2 8h1.7l1.3 4.9 1-4.9h2L34.3 16h-1.9L31 10.9 29.7 16h-1.9Z" fill="currentColor"/>
        </svg>
    </span>
    `
}

function createConfirmButtonLabel(isConfirmed) {
    const text = isConfirmed ? "確認済み" : "確認する"

    return `
    <span class="noticeBtnIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M5 12.5 9.2 16.5 19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </span>
    <span>${text}</span>
    `
}

function createNoticeBodyHtml(notice) {
    const body = String(notice.body || "")
    const lines = body.split(/\r?\n/)
    const isLongBody = lines.length > NOTICE_BODY_LIMIT_LINES

    const previewText = isLongBody
        ? lines.slice(0, NOTICE_BODY_LIMIT_LINES).join("\n")
        : body

    const fullBodyId =
        `noticeBody_${String(notice.id || Math.random()).replaceAll("-", "_")}_${Math.random().toString(36).slice(2)}`

    if (!isLongBody) {
        return `
        <div class="noticeBody">
            ${escapeHtml(body).replaceAll("\n", "<br>")}
        </div>
        `
    }

    return `
    <div class="noticeBody noticeBodyPreview" id="${fullBodyId}">
        ${escapeHtml(previewText).replaceAll("\n", "<br>")}
    </div>

    <button
        class="noticeBodyToggleBtn"
        data-target-id="${fullBodyId}"
        data-preview="${escapeHtml(previewText)}"
        data-full="${escapeHtml(body)}"
        data-open="false"
    >
        全文を見る
    </button>
    `
}

function setupNoticeButtons(container) {
    container
        .querySelectorAll(".noticeConfirmBtn")
        .forEach((button) => {
            button.addEventListener("click", () => {
                confirmNotice(button.dataset.noticeId)
            })
        })

    container
        .querySelectorAll(".noticeDeleteBtn")
        .forEach((button) => {
            button.addEventListener("click", () => {
                deleteNotice(button.dataset.noticeId)
            })
        })

    container
        .querySelectorAll(".confirmedToggleBtn")
        .forEach((button) => {
            button.addEventListener("click", () => {
                const targetId = button.dataset.targetId
                const target = document.getElementById(targetId)

                if (!target) return

                target.classList.toggle("show")

                button.textContent =
                    target.classList.contains("show")
                        ? "閉じる"
                        : "すべて見る"
            })
        })

    container
        .querySelectorAll(".noticeBodyToggleBtn")
        .forEach((button) => {
            button.addEventListener("click", () => {
                const target = document.getElementById(button.dataset.targetId)

                if (!target) return

                const isOpen = button.dataset.open === "true"
                const nextText = isOpen
                    ? button.dataset.preview
                    : button.dataset.full

                target.innerHTML = escapeHtml(nextText).replaceAll("\n", "<br>")
                target.classList.toggle("noticeBodyExpanded", !isOpen)

                button.dataset.open = isOpen ? "false" : "true"
                button.textContent = isOpen ? "全文を見る" : "閉じる"
            })
        })
}

function createConfirmedUsersHtml(confirmedUsers, mode) {
    const count = confirmedUsers.length

    if (count === 0) {
        if (mode === "管理者") return ""
        return `
        <div class="confirmedUserSummary">
            確認済み：0人
        </div>
        `
    }

    const previewUsers = getPreviewUsers(confirmedUsers)
    const hiddenCount = Math.max(0, count - previewUsers.length)

    const fullListId =
        `confirmedList_${mode}_${Math.random().toString(36).slice(2)}`

    return `
    ${mode === "管理者" ? "" : `<div class="confirmedUserSummary">確認済み：${count}人</div>`}

    <div class="confirmedPreviewList">
        ${previewUsers
            .map((user) => {
                return `
                <span class="confirmedPreviewItem">
                    ${escapeHtml(user.name || user.email || "社員")}
                </span>
                `
            })
            .join("")}

        ${hiddenCount > 0 ? `
        <span class="confirmedMoreBadge">
            +${hiddenCount}
        </span>
        ` : ""}
    </div>

    ${count >= 10 ? `
    <button
        class="confirmedToggleBtn"
        data-target-id="${fullListId}"
    >
        すべて見る
    </button>

    <div id="${fullListId}" class="confirmedFullList">
        ${confirmedUsers
            .map((user, index) => {
                return `
                <div class="confirmedUserItem">
                    <span>${index + 1}</span>
                    <strong>${escapeHtml(user.name || user.email || "社員")}</strong>
                </div>
                `
            })
            .join("")}
    </div>
    ` : ""}
    `
}

function getPreviewUsers(confirmedUsers) {
    if (confirmedUsers.length <= 5) {
        return confirmedUsers
    }

    return confirmedUsers.slice(0, 5)
}

function isNewNotice(createdAt) {
    const createdTime = getTimeValue(createdAt)

    if (!createdTime) return false

    const diff = Date.now() - createdTime

    return diff <= 48 * 60 * 60 * 1000
}

function getTimeValue(timeValue) {
    const date = getDate(timeValue)

    if (!date) return 0

    return date.getTime()
}

function getDate(timeValue) {
    if (timeValue?.seconds) {
        return new Date(timeValue.seconds * 1000)
    }

    if (timeValue instanceof Date) {
        return timeValue
    }

    return null
}

function formatDate(timeValue) {
    const date = getDate(timeValue)

    if (!date) return "-"

    return date.toLocaleString()
}

