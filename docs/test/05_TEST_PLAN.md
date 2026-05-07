# 05 テスト計画

## 自動テスト

| 項目 | 対象 | 確認内容 |
| --- | --- | --- |
| ブックマーク整形 | `bookmarks.js` | Chrome のツリー構造から URL ブックマークを抽出できる |
| 分類 | `classifier.js` | ドメイン、キーワード、フォールバック分類、ゲーム、成人向け、削除予定分類が動く |
| ルール検証 | `classifier.js` | 無効なルールを検出できる |
| 整理計画 | `reorgPlan.js` | 移動予定、削除予定、作成予定フォルダ、復元スナップショットを生成できる |
| バックアップ | `bookmarkBackup.js` | 手動テスト用バックアップと復元操作を生成できる |
| ルール候補 | `ruleSuggestions.js` | 現在ブックマーク、主要サイト、対象軸から候補ルールとサイト割り当て用サイト一覧を生成できる |
| ルール保存 | `classifier.js`、`service-worker.js` | 削除したルールが初期補完で復活せず、編集済みルールとして保存される |
| リンク切れ | `brokenLinks.js` | HTTP 404/410 の削除候補判定、対象外 URL のスキップ、集計が動く |
| Options 静的 UI | `options.html`、`options.js`、`options.css` | 分類先設定の 2 行入力レイアウト、必須/任意バッジ、URL 任意入力、分類先の追加/編集/削除、全ルール削除、サイト割り当て、favicon サムネイル、候補元/軸選択、分類先が JSON ルールと候補作成結果から生成されること、分類済み非表示、長文省略、ルール管理、JSON 編集の同期、表示切替、モード設定、表示 Strategy が維持されている |
| Side Panel 静的 UI | `sidepanel.html`、`sidepanel.js`、`sidepanel.css` | 上部ステータス、リンク切れチェック、Options 埋め込み表示、別タブ Options 表示が維持されている |
| Service Worker 静的検証 | `service-worker.js` | 空フォルダ削除、削除予定アクション、編集済みルール保存の処理が維持されている |
| Manifest | `extension/manifest.json` | Manifest V3、基本権限、リンクチェック用 host permission が維持されている |
| Markdown | `docs/`、ルート文書 | 文字化け断片が混入していない |

## 実行コマンド

```powershell
cd D:\AI\ChromeExtension\domain-purpose-classifier-organizer
npm test
```

## 期待結果

- すべての Node.js 自動テストが成功する。
- 基本権限は `bookmarks`、`storage`、`sidePanel` である。
- リンク切れチェック用 host permission は `http://*/*`、`https://*/*` に限定されている。
- Markdown 文書に典型的な文字化け断片が含まれていない。

## 手動テスト

手動テストの項目と確認手順は `docs/test/MANUAL_TESTS.md` に記録する。
