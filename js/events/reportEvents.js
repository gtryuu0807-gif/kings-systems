export function setupReportEvents() {
    // 社員画面の月次レポートボタンは非表示・削除済みのため、
    // ここでは管理者画面のPDF出力だけを登録します。

    const adminPdfBtn = document.getElementById("downloadAdminPdfBtn")

    if (!adminPdfBtn) return

    adminPdfBtn.addEventListener("click", async () => {
        const { downloadAdminMonthlyPdf } = await import("../report/pdf.js")
        downloadAdminMonthlyPdf()
    })
}

