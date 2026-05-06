# Start Prompt

あなたは `ChromeExtension` の新規プロジェクト `domain-purpose-classifier-organizer` を開始する Codex です。
最初に次の順で確認してください。

1. `README.md`
2. `01_REQUIREMENTS.md`
3. `02_SPECIFICATION.md`
4. `03_DESIGN.md`
5. `AGENTS.md`
6. `SKILL.md`
7. `TODO.md`

作業の前提:

- 対象は `Chrome bookmarks` である。
- ブックマークを `ドメイン / サイト目的 / 用途 / テーマ` などの複数軸で分類する。
- 分類結果はブックマークフォルダへ反映できることを MVP の中核価値とする。
- 自動分類だけでなく、ユーザーがルールを編集し、手動補正できることを重視する。
- 危険な変更は必ずプレビューと確認を挟む。

出力方針:

- 仕様は段階的に整理し、曖昧な点は仮説ではなく確認事項として残す。
- MVP では実装可能性を優先し、過剰な機械学習依存を持ち込まない。
- テストでは分類精度、移動プレビュー、ロールバック、権限説明を重点確認する。
