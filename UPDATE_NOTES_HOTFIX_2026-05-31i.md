# Kings Hotfix 2026-05-31i

## 変更点
- 出勤・退勤履歴が存在するのに自動休み扱いになる問題を再修正。
- 勤怠レコードの `type` 以外の保存形式にも対応し、過去データの判定を強化。
- typeが空の過去レコードでも時刻順で出勤・退勤を推定して表示・集計できるよう補強。
- ダッシュボードの最新お知らせ日時表示で例外が出る問題を修正。
- ダッシュボードの勤怠判定を `time` 以外の時刻フィールドにも対応。
- ログイン画面の目アイコンに通常ボタンCSSが当たらないよう最終CSSで固定。

## 修正ファイル
- `index.html`
- `js/data.js`
- `js/attendance/workTime.js`
- `js/ui/attendanceGroups.js`
- `js/ui/dashboard.js`
- `version.json`

## 追加ファイル
- `css/kings-hotfix-2026-05-31i.css`
- `UPDATE_NOTES_HOTFIX_2026-05-31i.md`

## 削除機能
- なし

## 影響範囲
- 勤務履歴
- 管理ダッシュボード
- 今日の社員状態
- ログイン画面
- エラー表示

## Firestore Rules
- 更新なし
