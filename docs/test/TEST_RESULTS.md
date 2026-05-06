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

- テスト数: 14
- 成功: 14
- 失敗: 0

確認した内容:

- 手動テスト用バックアップ作成と復元操作生成。
- ブックマークツリーの整形。
- ドメイン、キーワード、フォールバック分類。
- ルール検証。
- 整理計画、作成予定フォルダ、復元スナップショット。
- Manifest V3 と MVP 権限。
- Markdown の文字化け断片検査。

### 構文チェック

実行コマンド:

```powershell
Get-ChildItem -LiteralPath 'D:\AI\ChromeExtension\domain-purpose-classifier-organizer\extension' -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

結果:

- 成功: すべての拡張機能 JavaScript で構文エラーなし。

### 手動テスト

手動テストは `docs/test/MANUAL_TESTS.md` に項目と確認手順を起票済み。Chrome 実機での読み込み、バックアップ作成、ブックマーク移動、バックアップ復元は利用者プロファイルへ影響するため、自動実行はしていない。
