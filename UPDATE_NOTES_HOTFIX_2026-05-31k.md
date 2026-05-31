# UPDATE NOTES HOTFIX 2026-05-31k

## 変更内容
- メニュー内の「設定」の上に「情報」ボタンを追加。
- 情報画面を追加し、Version / Build / Environment / 更新確認 / システム情報を表示。
- 設定画面からバージョン情報・更新確認を分離し、設定用画面として整理。
- 同じ勤務セット内に退勤履歴がある場合、出勤履歴の削除を禁止。
- 出勤削除禁止時は `ATT-011` を画面に表示。
- 勤務履歴編集内の日時入力欄がiPhoneで枠からはみ出ないように補正。
- 勤怠履歴は初期状態では非表示にし、「表示する」ボタン押下後に表示。
- 管理画面の勤務履歴も初期非表示にし、「表示する」押下後に表示。

## 修正ファイル
- index.html
- components/header.html
- components/settings-screen.html
- js/bootstrap.js
- js/events/menuEvents.js
- js/events/filterEvents.js
- js/kingsV3MenuRoutePatch.js
- js/state.js
- js/ui/history.js
- js/ui/adminHistory.js
- js/attendance/rules.js
- js/attendance/delete.js
- version.json

## 追加ファイル
- components/info-screen.html
- css/kings-hotfix-2026-05-31k.css
- UPDATE_NOTES_HOTFIX_2026-05-31k.md

## 削除機能
- なし

## 影響範囲
- メインメニュー
- 情報画面
- 設定画面
- 勤務履歴表示
- 管理画面勤務履歴
- 勤務履歴編集
- 勤怠削除制約

## Firestore Rules
- 更新なし
