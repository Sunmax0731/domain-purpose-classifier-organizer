# 05 テスト計画

## 自動テスト

| 項目 | 対象 | 確認内容 |
| --- | --- | --- |
| ブックマーク整形 | `bookmarks.js` | Chrome のツリー構造から URL ブックマークを抽出できる |
| 分類 | `classifier.js` | ドメイン、キーワード、フォールバック分類が動く |
| ルール検証 | `classifier.js` | 無効なルールを検出できる |
| 整理計画 | `reorgPlan.js` | 移動予定、作成予定フォルダ、復元スナップショットを生成できる |
| Manifest | `extension/manifest.json` | Manifest V3 と最小権限が維持されている |
| Markdown | `docs/`、ルート文書 | 文字化け断片が混入していない |

## 実行コマンド

```powershell
cd D:\AI\ChromeExtension\domain-purpose-classifier-organizer
npm test
```

## 期待結果

- すべての Node.js 自動テストが成功する。
- `bookmarks`、`storage`、`sidePanel` 以外の権限が追加されていない。
- Markdown 文書に `繧` `郢` `髫` `�` が含まれていない。

## 手動テスト

手動テストの項目と確認手順は `docs/test/MANUAL_TESTS.md` に記録する。
