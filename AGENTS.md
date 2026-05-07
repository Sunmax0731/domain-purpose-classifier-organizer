# AGENTS

## 目的

このリポジトリは、Chrome の保存済みブックマークをドメイン、サイト目的、用途、テーマなどの複数軸で分類し、確認可能なフォルダ整理へつなげる Chrome Extension です。

## 作業開始順

1. `README.md`
2. `AGENTS.md`
3. `SKILL.md`
4. `docs/01_REQUIREMENTS.md`
5. `docs/02_SPECIFICATION.md`
6. `docs/03_ARCHITECTURE_DESIGN.md`
7. `extension/manifest.json`

## 進め方

- 危険操作は必ず `プレビュー -> 確認 -> 実行 -> 復元手段の提示` の順で扱う。
- 分類精度だけでなく、分類理由の説明可能性と手動補正のしやすさを重視する。
- `Manifest V3`、`chrome.bookmarks`、`chrome.storage`、`Side Panel` を前提にする。
- MVP では外部 API や LLM に依存せず、ローカルのルールベース分類を優先する。
- 元 idea パックは `docs/intake/` に保存し、現在の正規仕様は `docs/` 直下を参照する。

## ドキュメント運用

- Markdown は固有名詞を除いて日本語で記述し、UTF-8 で保存する。
- 典型的な文字化け断片を残さない。検出用の具体値はテストコード側で Unicode escape として管理する。
- 手動テスト項目と確認手順は `docs/test/MANUAL_TESTS.md` に起票する。
