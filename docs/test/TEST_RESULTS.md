# テスト結果

## 2026-05-06

### 自動テスト

実行ディレクトリ:

```powershell
D:\AI\ChromeExtension\domain-purpose-classifier-organizer
```

実行コマンド:

```powershell
npm test
```

結果:

- テスト数: 11
- 成功: 11
- 失敗: 0

確認した内容:

- ブックマークツリーの整形。
- ドメイン、キーワード、フォールバック分類。
- ルール検証。
- 整理計画、作成予定フォルダ、復元スナップショット。
- Manifest V3 と MVP 権限。
- Markdown の文字化け断片検査。

### 手動テスト

手動テストは `docs/test/MANUAL_TESTS.md` に項目と確認手順を起票済み。Chrome 実機での読み込みとブックマーク移動は利用者プロファイルへ影響するため、自動実行はしていない。
