# テスト結果

## 2026-05-07

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

- テスト数: 39
- 成功: 39
- 失敗: 0

確認した内容:

- 手動テスト用バックアップ作成と復元操作生成。
- 復元時の index なしフォールバック用オプション生成。
- 復元ジョブの進捗カウンター初期化。
- 保存済みフォルダパスを復元操作へ保持する検証。
- ブックマークツリーの整形。
- ドメイン、キーワード、フォールバック分類。
- 短い英字キーワードが `Gmail` や `AirStation` の部分文字列へ誤一致しないこと。
- 古い保存済みルールに現在の初期ルールを補完して分類すること。
- 選択軸に一致がない場合に、他軸の一致ルールをドメインフォールバックより優先すること。
- 現在ブックマーク向けの汎用初期ルール分類。
- 初期ルールでゲーム、成人向け、削除予定ブックマークを分類できること。
- 削除予定分類が整理計画上で削除アクションになり、作成予定フォルダを増やさないこと。
- ルール検証。
- URL に直接一致しない `category` ルールで分類先メタデータを保持できること。
- 削除した初期ルールを補完し直さず、明示的に編集したルール配列を保持できること。
- URL からのドメインルール作成。
- 大項目、中項目、アイコンを持つ分類ルールの生成。
- 現在ブックマーク向け候補ルールの大項目、中項目、アイコン推定。
- 現在のブックマークからの候補ルール生成。
- 現在のブックマーク以外に、主要サイトの静的ルールバンクから候補ルールを生成できること。
- 目的、用途、テーマの選択軸に応じて候補ルールを絞り込めること。
- 現在のブックマークからサイト割り当て用のホスト名、ドメイン名、代表タイトル、既存ルール情報を持つサイト一覧を生成すること。
- Options の分類先設定、サイト割り当て、ルール管理、JSON 編集モード。
- Options の分類先設定フォームが、分類先行、ルール属性行、補助情報行に分かれていること。
- Options の項目名と入力フォームが 2 行で揃い、単一行入力、ボタン、認識済みドメイン表示で高さを共通化し、項目名が改行されない CSS を持つこと。
- Options の必須/任意バッジ、URL 任意入力、分類先追加、分類先編集、分類先削除、全ルール削除が静的に維持されていること。
- 分類先設定とサイト割り当ての分類先が、現在の有効な JSON ルールと候補作成結果から生成され、空 JSON だけでは初期分類先プリセットを表示しないこと。
- Options の分類先ドロップダウン、新規分類先入力、アイコン選択、候補元/軸選択、サイト割り当て用分類先ドロップ先、favicon サムネイル、分類済み非表示、長文省略、JSON 編集の他モード同期、サイト一覧グリッド/リスト、ルール管理グループ/グリッド/リスト表示の静的検証。
- サイト割り当てのリスト表示でサイトカードが同じ幅になり、カード内部列幅が固定される CSS を持つこと。
- サイト割り当ての分類先ルール数と分類済み判定が、JSON 編集で追加した未保存ルールを含む現在のルール状態を参照すること。
- Options のモード制御が `MODE_CONFIG` を経由し、ルール管理表示が `RULE_VIEW_RENDERERS` の表示 Strategy を経由していること。
- Service Worker が編集済みルールを保存し、削除予定アクションと整理適用後の空フォルダ削除件数を返す静的検証。
- リンク切れチェックジョブ、HTTP 404/410 の削除候補判定、HTTP/HTTPS 以外のスキップ判定。
- Manifest V3 の基本権限とリンクチェック用 host permission。
- Manifest の `icons` と `action.default_icon` が 16/32/48/128px の実ファイルを参照していること。
- 整理計画、作成予定フォルダ、復元スナップショット。
- Side Panel 上部ステータスの完了表示。
- Side Panel 内の Options 埋め込み表示と、従来の別タブ Options 表示導線。
- Markdown の文字化け断片検査。

### 構文チェック

実行コマンド:

```powershell
Get-ChildItem -LiteralPath 'D:\AI\ChromeExtension\domain-purpose-classifier-organizer\extension' -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

結果:

- 成功: すべての拡張機能 JavaScript で構文エラーなし。

### リリース準備

実行コマンド:

```powershell
$package = Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json
$manifest = Get-Content -LiteralPath 'extension\manifest.json' -Raw | ConvertFrom-Json
if ($package.version -ne $manifest.version) { throw "Version mismatch: package=$($package.version), manifest=$($manifest.version)" }
# extension 配下を ZIP 直下に配置し、ZIP 内パスは Chrome Web Store 向けに / 区切りで作成する。
$zip = "dist\bookmark-purpose-organizer-store-$($manifest.version).zip"
```

結果:

- 成功: `package.json` と `extension/manifest.json` の version は `0.1.0` で一致。
- 成功: `docs/store_submission_icon_set_tight.zip` から `icon_16.png`、`icon_32.png`、`icon_48.png`、`icon_128.png` を `extension/icons/` へ組み込んだ。
- 成功: `extension/manifest.json` に `icons` と `action.default_icon` を追加した。
- 成功: `dist/bookmark-purpose-organizer-store-0.1.0.zip` を生成した。
- 成功: ZIP 直下に `manifest.json`、`icons/icon_16.png`、`icons/icon_32.png`、`icons/icon_48.png`、`icons/icon_128.png` が含まれることを確認した。
- SHA256: `468B19370ABDDCC71170779538E499046D73BC55EA86A5A1E7F60DD49BC9BA5D`
- ストア用 512px アイコンは `dist/store-assets/store_icon_512.png` に配置した。

### 手動テスト

手動テストは `docs/test/MANUAL_TESTS.md` の全項目を Chrome 実機で確認済み。2026-05-07 に利用者報告として全項目クリアを受領した。

### Chrome Web Store 申請素材

確認内容:

- 商品説明文を `docs/store/STORE_LISTING_JA.md` に作成した。
- Developer Dashboard のプライバシー入力欄向け文面を `docs/store/CHROME_WEB_STORE_INPUTS_JA.md` に作成した。
- プライバシーポリシーを `docs/PRIVACY_POLICY.md` に作成した。
- スクリーンショット 5 枚を `dist/store-assets/screenshots/` に作成した。
- 小プロモーション画像を `dist/store-assets/small_promo_440x280.png` に作成した。

寸法確認:

- `01-scan-results-1280x800.png`: 1280x800
- `02-apply-confirmation-1280x800.png`: 1280x800
- `03-folder-result-1280x800.png`: 1280x800
- `04-options-rules-1280x800.png`: 1280x800
- `05-link-check-backup-1280x800.png`: 1280x800
- `small_promo_440x280.png`: 440x280
