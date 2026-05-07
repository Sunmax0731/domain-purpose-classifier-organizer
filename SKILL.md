# SKILL

## 開発の基本方針

- ユーザーの自然文指示は、目的、制約、期待出力、確認事項、完了条件へ内部で分解して扱う。
- 自動分類だけでなく、分類理由の説明と手動補正のしやすさを重視する。
- 安全に戻せることを MVP の中心要件として扱う。
- 実装変更後は `npm test` を実行し、結果を `docs/test/TEST_RESULTS.md` に反映する。

## ChromeExtension 特有の観点

- `Manifest V3` を前提にする。
- 主処理は `service worker`、主 UI は `Side Panel`、ルール編集は `Options` に分ける。
- `content script` は必要になるまで足さない。
- 権限は `bookmarks`、`storage`、`sidePanel` に絞り、要求理由を説明できる形にする。
- ブックマーク移動は差分プレビューと確認を通した操作だけにする。

## ディレクトリ基準

- `extension/`: Chrome Extension 本体。
- `extension/src/shared/`: Chrome API に依存しない分類、計画生成、整形ロジック。
- `docs/`: 現在の要件、仕様、設計、テスト文書。
- `docs/intake/`: 元 idea パック。
- `tests/`: Node.js の自動テスト。

## ドキュメント運用

- Markdown は UTF-8 で保存し、保存後に文字化けがないか確認する。
- 典型的な文字化け断片が見えたら再生成する。検出用の具体値はテストコード側で Unicode escape として管理する。
