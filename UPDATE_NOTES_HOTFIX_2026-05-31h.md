# UPDATE NOTES HOTFIX 2026-05-31h

## 変更内容
- 出勤・退勤履歴が存在するのに自動休み扱いになる問題を修正。
- 勤怠種別の判定を強化し、`type` 以外の保存形式にも対応。
- 勤務履歴の確認欄に出勤・退勤記録が表示されるよう補強。
- ログイン画面のパスワード表示アイコン（目アイコン）の見た目崩れを修正。
- ダッシュボード移動時の `SYS-001` を防止し、ダッシュボード専用エラー `DASH-001` へ分離。
- ダッシュボード描画時にデータ未読込でも落ちにくいよう安全化。

## 修正ファイル
- `index.html`
- `js/attendance/workTime.js`
- `js/ui/attendanceGroups.js`
- `js/ui/dashboard.js`
- `js/utils.js`
- `version.json`

## 追加ファイル
- `css/kings-hotfix-2026-05-31h.css`
- `UPDATE_NOTES_HOTFIX_2026-05-31h.md`

## 削除機能
- なし

## 影響範囲
- 勤務履歴
- 管理画面ダッシュボード
- ログイン画面
- エラーコード表示

## Firestore Rules
- 更新なし
