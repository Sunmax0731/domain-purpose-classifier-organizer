# 02 仕様

## 画面

| 画面 | 役割 |
| --- | --- |
| Popup | 状態要約、Side Panel と Options への導線 |
| Side Panel | スキャン、分類結果一覧、移動プレビュー、テスト用バックアップ、適用、直前復元 |
| Options | 分類ルール JSON の編集、初期ルール復元 |

## データモデル

### BookmarkItem

- `id`: Chrome bookmark id
- `title`: 表示名
- `url`: ブックマーク URL
- `parentId`: 現在の親フォルダ id
- `index`: 現在フォルダ内の順序
- `path`: 現在のフォルダパス
- `domain`: URL から抽出したドメイン

### ClassificationRule

- `id`
- `name`
- `type`: `domain` または `keyword`
- `axis`: `purpose`、`usage`、`theme` のいずれか
- `priority`
- `pattern`
- `targetFolder`
- `reason`

### ClassificationResult

- `bookmarkId`
- `title`
- `url`
- `domain`
- `axes`: ドメイン、目的、用途、テーマの分類結果
- `suggestedCategory`
- `suggestedFolder`
- `confidence`
- `reasons`
- `matchedRuleIds`

### ReorganizationPlan

- `id`
- `createdAt`
- `rootTitle`
- `axis`
- `actions`: 移動予定
- `foldersToCreate`: 作成予定フォルダパス
- `rollbackSnapshot`: 復元用の親フォルダ、順序、タイトル、URL

### BookmarkBackup

- `id`
- `createdAt`
- `source`: `manual`
- `bookmarkCount`
- `snapshot`: 保存時点の URL ブックマーク ID、タイトル、URL、親フォルダ、順序、パス

## 主要フロー

1. Side Panel で「スキャン」を実行する。
2. `chrome.bookmarks.getTree` でブックマークツリーを取得する。
3. ルールを読み込み、URL を持つブックマークを分類する。
4. 選択軸に基づき、整理先フォルダ案を生成する。
5. ユーザーがプレビューを確認する。
6. 確認ダイアログで了承した場合だけ、フォルダ作成と移動を実行する。
7. 実行履歴と復元スナップショットを `chrome.storage.local` に保存する。
8. 直前復元では保存済み `parentId` と `index` を使い、可能な範囲で元へ戻す。

## テスト用バックアップフロー

1. Side Panel で「現在状態をバックアップ」を押す。
2. `chrome.bookmarks.getTree` で現行ブックマークツリーを取得する。
3. URL を持つブックマークの `id`、`parentId`、`index`、`title`、`url`、`path` を `chrome.storage.local` に保存する。
4. 繰り返しテスト後に「バックアップから復元」を押す。
5. 保存済みバックアップの各ブックマークを保存時点の `parentId` と `index` へ戻す。
6. 復元できない項目は警告件数として表示する。

バックアップ復元は、ブックマーク本体の配置復元を目的とする。テスト中に作成された空フォルダは自動削除しない。

## 分類ルール

- ドメイン一致は `example.com` とサブドメインを対象にする。
- キーワード一致はタイトル、URL、ドメイン、パスを小文字化して判定する。
- 複数ルールが一致した場合は軸ごとに `priority` が高いルールを採用する。
- 一致がない場合はドメイン分類へフォールバックし、理由に「ドメインによる暫定分類」を表示する。

## 例外処理

- Chrome API エラーは UI に表示する。
- 無効なルールは Options で保存しない。
- 移動前に対象件数が 0 件の場合は適用ボタンを無効化する。
- 復元時に移動元フォルダが存在しない場合は、その項目を警告として記録する。
