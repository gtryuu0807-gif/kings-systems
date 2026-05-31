# Kings Hotfix 2026-05-31g

## 変更内容
- メインメニュー内の「設定」を復旧しました。
- 設定画面を復元し、Version / Build、更新確認、システム情報を表示できるようにしました。
- 勤務履歴の確認欄で、出勤・退勤記録が詳細を開かなくても表示されるようにしました。
- エラーコード表示行が画面上で見えるようにToast表示を補強しました。
- 出勤・退勤、打刻忘れ追加、休み登録、履歴ページ送り、編集ボタン類にKings Premiumボタンを再適用しました。
- 管理画面編集エリアの白枠・白背景が再発しないよう補強しました。

## 修正ファイル
- index.html
- components/header.html
- components/main-screen.html
- components/admin-screen.html
- components/settings-screen.html
- js/bootstrap.js
- js/events/menuEvents.js
- js/kingsV3MenuRoutePatch.js
- js/ui/history.js
- js/ui/adminHistory.js
- version.json
- css/kings-hotfix-2026-05-31g.css

## 追加ファイル
- components/settings-screen.html
- css/kings-hotfix-2026-05-31g.css
- UPDATE_NOTES_HOTFIX_2026-05-31g.md

## 削除機能
- なし

## 影響範囲
- メインメニュー
- 設定画面
- 勤務履歴確認
- 管理画面勤務履歴
- エラーToast
- 勤怠操作ボタン

## Firestore Rules
- 更新なし
