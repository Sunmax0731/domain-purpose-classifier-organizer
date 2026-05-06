# domain-purpose-classifier-organizer

Chrome の保存済みブックマークを、ドメイン、サイト目的、用途、テーマなどの複数軸で分類し、フォルダ整理の差分プレビュー、適用、直前復元まで扱う Chrome Extension です。

## MVP

- 保存済みブックマークツリーを読み込む。
- ローカルのルールベースで分類候補と分類理由を出す。
- Side Panel で分類結果と移動予定先を確認する。
- 手動テスト前に現在のブックマーク配置をバックアップする。
- 確認後にフォルダ作成とブックマーク移動を実行する。
- 直前ジョブの復元情報を保存し、可能な範囲で元の親フォルダへ戻す。
- 保存済みバックアップから、テスト前の親フォルダと順序へ戻す。
- Options で分類ルールを編集する。

## ディレクトリ

| パス | 内容 |
| --- | --- |
| `extension/` | Chrome Extension 本体 |
| `extension/src/shared/` | Chrome API に依存しない分類、ブックマーク整形、整理計画生成 |
| `docs/` | 現行の要件、仕様、設計、実装、テスト文書 |
| `docs/intake/` | 元 idea パックと ZIP |
| `docs/reference/` | 開発開始時に参照した補助文書 |
| `tests/` | Node.js 自動テスト |

## 開発

```powershell
npm test
```

Chrome で手動確認する場合は、`chrome://extensions` の「パッケージ化されていない拡張機能を読み込む」から次のフォルダを指定します。

```text
D:\AI\ChromeExtension\domain-purpose-classifier-organizer\extension
```

## 権限

- `bookmarks`: ブックマークツリー取得、フォルダ作成、ブックマーク移動に使う。
- `storage`: 分類ルール、実行履歴、直前復元用スナップショット、テスト用バックアップの保存に使う。
- `sidePanel`: 一覧確認、差分プレビュー、実行導線を Side Panel に表示する。

## テスト文書

- 自動テスト計画: `docs/test/05_TEST_PLAN.md`
- 手動テスト項目と確認手順: `docs/test/MANUAL_TESTS.md`
- 実行結果: `docs/test/TEST_RESULTS.md`
