# ブックマーク分類・フォルダ自動整理 開発パック

| 項目 | 内容 |
| --- | --- |
| 領域 | ChromeExtension |
| No. | 12 |
| 分野 | ブックマーク整理・分類 |
| アイデア | ブックマーク分類・フォルダ自動整理 |
| リポジトリ名 | domain-purpose-classifier-organizer |
| 概要 | 保存済みブックマークを Web サイトのドメイン、サイトの目的、用途、業務カテゴリ、学習テーマなど複数軸で分類し、分類結果に応じてブックマークフォルダへ整理する Chrome Extension。手動補正、分類ルール編集、複数観点の再分類にも対応する。 |
| 課題 | ブックマークが増えると一覧性が落ち、後から探せず、目的別に整理し直す作業も重い。既存のブックマーク管理では閲覧はできても、分類観点を切り替えながら実用的に整理しにくい。 |
| 類似サービス・アプリ | Raindrop.io, Toby, OneTab, Workona, Chrome bookmark manager, bookmark managers |
| 差別化ポイント | ブックマーク自体を対象にし、ドメインだけでなく用途やテーマなど複数観点で分類する。分類結果をそのままフォルダ構造へ反映し、ユーザーがルールを調整しながら再整理できる。 |

## 目的

このフォルダには、`ChromeExtension` 領域のアイデア `ブックマーク分類・フォルダ自動整理` を実装可能なプロジェクトへ落とし込むための初期ドキュメントが含まれています。

## 含まれるファイル

- START_PROMPT.md
- README.md
- 01_REQUIREMENTS.md
- 02_SPECIFICATION.md
- 03_DESIGN.md
- 04_IMPLEMENTATION_PLAN.md
- 05_TEST_PLAN.md
- 06_RELEASE_CHECKLIST.md
- AGENTS.md
- SKILL.md
- Design.md
- Architecture.md
- TODO.md
- metadata.json

## 使い方

1. `START_PROMPT.md` を起点に要件、仕様、設計を確認する。
2. `AGENTS.md` と `SKILL.md` で開発時の進め方と判断基準を揃える。
3. MVP を実装し、`05_TEST_PLAN.md` と `06_RELEASE_CHECKLIST.md` に沿って検証する。

## 出品前提

このアイデアパックは、将来的に `Chrome Web Store` へ出品する前提でドキュメントを揃える。

- ストア掲載に必要な説明文、スクリーンショット、アイコン、カテゴリ、サポート情報を準備する。
- `Manifest V3`、権限、`host_permissions`、`service worker`、`Options` / `Popup` / `Side Panel` の構成を前提に整理する。
- `Privacy Policy`、単一目的、権限利用理由、外部通信の有無を文書化する。
