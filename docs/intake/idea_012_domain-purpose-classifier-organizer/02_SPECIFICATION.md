# 02 仕様検討: ブックマーク分類・フォルダ自動整理

## 画面構成

- `Popup`: 現在状態の要約、直近分類ジョブ、再実行導線
- `Options`: ルール設定、カテゴリ管理、除外条件、バックアップ設定
- `Side Panel`: ブックマーク一覧、分類候補、差分プレビュー、実行導線

## データ構造

- BookmarkItem: id, title, url, parentId, path
- ClassificationRule: id, name, type, priority, matcher, targetFolder
- ClassificationResult: bookmarkId, suggestedCategory, suggestedFolder, confidence, reasons
- ReorgJob: id, createdAt, sourceSnapshot, results, appliedChanges, rollbackSnapshot

## 主要フロー

1. ブックマークツリーを取得する。
2. ルールを適用して分類候補を算出する。
3. ユーザーが候補を確認し、必要なら補正する。
4. 差分プレビューを確認後、フォルダ変更を適用する。
5. 実行結果とロールバック情報を保存する。

## 判定ロジック

- ドメイン一致
- URL パスやタイトルのキーワード一致
- ユーザー定義タグやテーマルール
- 除外条件と優先度ルール

## 例外処理

- 権限拒否時は実行不能理由を明示する。
- 対象フォルダが存在しない場合は作成前確認を行う。
- 競合する複数候補がある場合は、ユーザー選択または優先度で解決する。
