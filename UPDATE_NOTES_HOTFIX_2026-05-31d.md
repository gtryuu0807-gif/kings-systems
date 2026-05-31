# Kings App Hotfix 2026-05-31d

## 修正内容
- 管理画面の表示条件UIをメイン画面と同じ構成へ統一。
- 旧表示の「表示方法」「期間」「2026年5月」「2026」カードを撤去。
- メイン画面・管理画面の表示条件を「年」「月」「表示する」中心へ整理。
- 管理画面のみ社員選択を残し、同じデザインで表示。
- 起動画面のバージョン表示を下部固定に補強。
- エラーToastに「エラーコード：XXX-000」を明確に表示。
- グローバル例外・Promiseエラーにもエラーコードを付与。
- 勤怠編集エラーを ATT-004 として明確化。
- 管理画面の編集画面の白枠・白背景をKingsダークUIへ再補正。

## 修正ファイル
- index.html
- version.json
- js/bootstrap.js
- js/dom.js
- js/notify.js
- js/events/filterEvents.js
- js/events/rangeInputs.js
- js/attendance/edit.js
- components/main-screen.html
- components/admin-screen.html

## 追加ファイル
- css/kings-hotfix-2026-05-31d.css
- UPDATE_NOTES_HOTFIX_2026-05-31d.md

## 削除機能
- なし

## 影響範囲
- メイン画面の勤務履歴表示条件
- 管理画面の勤務履歴表示条件
- 起動画面バージョン表示
- エラーToast
- 管理画面の勤務編集UI

## Firestore Rules
- 更新なし
