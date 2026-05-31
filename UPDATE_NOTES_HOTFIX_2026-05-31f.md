# UPDATE NOTES - HOTFIX 2026-05-31f

## 変更内容
- 出勤ボタン・退勤ボタンが表示されない問題を修正。
- 3セット完了時もボタンを完全非表示にせず、無効状態として表示するよう修正。
- 旧cleanup CSSが `mainHistoryMenu` を非表示にしていたため、打刻忘れ追加・休み登録へ進めない問題を修正。
- 打刻忘れ追加・休み登録の追加行ボタン、登録ボタン、入力行エリアを強制表示補強。
- Kings Premiumボタンデザインを勤怠操作・打刻忘れ追加・休み登録ボタンへ再適用。

## 修正ファイル
- `index.html`
- `js/ui/workButtons.js`
- `version.json`

## 追加ファイル
- `css/kings-hotfix-2026-05-31f.css`

## 削除機能
- なし

## 影響範囲
- メイン画面
- 出勤・退勤ボタン
- 打刻忘れ追加
- 休み登録
- Kingsボタン表示

## Firestore Rules
- 更新なし
