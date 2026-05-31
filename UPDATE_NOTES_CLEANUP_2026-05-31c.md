# Kings Cleanup Hotfix 2026-05-31c

## 変更点
- 設定画面関連の未使用HTML/CSS読み込みを削除
- 配布ZIP内の開発用UPDATE_NOTESとリファクタリングガイドを削除
- 表示条件カードの旧番号表記を整理
- 管理画面の勤務履歴編集カードが白枠/白背景になる問題をCSSで統一
- 管理画面の社員選択リスト生成を uid/id/email フォールバック対応に補強

## 修正ファイル
- index.html
- style.css
- components/main-screen.html
- components/admin-screen.html
- js/bootstrap.js
- js/events/adminSelectOptions.js
- js/events/menuEvents.js
- js/kingsV3MenuRoutePatch.js
- version.json

## 追加ファイル
- css/kings-cleanup-2026-05-31c.css

## 削除ファイル
- components/settings-screen.html
- css/kings-settings-screen.css
- UPDATE_NOTES_2026-05-31.md
- UPDATE_NOTES_HOTFIX_2026-05-31b.md
- UPDATE_NOTES_NEXT_UPDATE_2026-05-31.md
- docs/FULL_REFACTOR_GUIDE.md

## Firestore Rules
更新なし
