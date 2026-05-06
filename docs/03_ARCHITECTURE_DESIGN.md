# 03 アーキテクチャと設計

## 方針

MVP は Manifest V3 の Service Worker、Side Panel、Options、Chrome Storage で構成する。ブックマーク分類と整理計画生成は Chrome API から切り離し、Node.js 自動テストで検証できるようにする。

## 構成

| 層 | パス | 責務 |
| --- | --- | --- |
| Extension Shell | `extension/manifest.json` | 権限、画面、Service Worker 登録 |
| Background | `extension/background/service-worker.js` | Chrome API 操作、メッセージ処理、適用、復元 |
| Shared Core | `extension/src/shared/` | ブックマーク整形、分類、整理計画生成 |
| Storage Adapter | `extension/src/storage/` | `chrome.storage.local` の読み書き |
| UI | `extension/sidepanel/`、`extension/options/`、`extension/popup/` | 操作画面と状態表示 |
| Tests | `tests/` | Chrome API に依存しないロジックと manifest の検証 |

## 実装選択肢

| 選択肢 | 内容 | 利点 | 欠点 |
| --- | --- | --- | --- |
| A | Vanilla JavaScript + MV3 静的ファイル | 依存が少なく、Chrome へ直接読み込める | 大規模化すると UI 部品の整理が必要 |
| B | React + Vite | UI 状態管理と部品化がしやすい | ビルド工程と出力設定が増える |
| C | 外部 API / LLM 分類前提 | 高度な分類候補を作りやすい | 権限、プライバシー、コスト、審査説明が重くなる |

## 採用判断

MVP は選択肢 A を採用する。理由は、今回の中核価値が「安全なブックマーク整理」であり、最初に検証すべきリスクは UI の装飾ではなく、分類理由、差分プレビュー、復元可能性だからである。Shared Core を分離しておくことで、将来 React + Vite へ移す場合も分類ロジックを再利用できる。

## UI 設計

- Side Panel は「スキャン」「分類結果」「変更プレビュー」「危険操作」の順に並べる。
- Options は JSON ルール編集に絞り、MVP では高度なフォーム UI を後回しにする。
- Popup は短い状態要約と導線に限定し、長い処理を置かない。
- 危険操作ボタンは通常操作と視覚的に分け、確認ダイアログを必須にする。

## 安全設計

- 実行前に `ReorganizationPlan` を作り、UI で確認する。
- 適用時に `rollbackSnapshot` を保存する。
- 復元は直前ジョブ単位で行う。
- 外部通信を使わないため、ブックマーク URL やタイトルは端末外へ送信しない。
