# 06 リリース確認チェックリスト

## 判定方針

MVP リリースでは「安全に分類候補を確認し、バックアップと復元を持った状態で整理できること」を合格条件にする。高度な自動分類やクラウド同期は MVP 後へ回す。

## 2026-05-07 リリース準備状況

- 自動テスト、拡張機能 JavaScript 構文チェック、manifest/package version 一致確認は完了。
- Chrome 実機の手動テストは 2026-05-07 に全項目クリア。
- Chrome Web Store に投入する ZIP として `dist/bookmark-purpose-organizer-store-0.1.0.zip` を生成済み。
- 拡張機能用アイコンは `extension/icons/` に組み込み済み。ストア用 512px アイコンは `dist/store-assets/store_icon_512.png` に配置済み。
- ストア用スクリーンショットは利用者添付で確認済み。
- プライバシーポリシーは公開ページとして用意する必要がある。

## 必須確認

- [ ] `npm test` が成功している。
- [ ] `chrome://extensions` で拡張機能を読み込める。
- [ ] Popup から Side Panel と Options を開ける。
- [ ] Side Panel 内の `Side Panelで編集` で Options を埋め込み表示できる。
- [ ] Side Panel 内の `別タブ` で従来の Options タブを開ける。
- [ ] Options の分類先設定フォームが、分類先行、ルール属性行、補助情報行に分かれて表示される。
- [ ] JSON 編集で作成した有効なルールが分類先設定、サイト割り当て、ルール管理へ反映される。
- [ ] サイト割り当てでサイトカードを分類先へドラッグ & ドロップし、ルールを作成または更新できる。
- [ ] ルール管理でグループ、グリッド、リスト表示を切り替えられる。
- [ ] ルール管理で削除したルールが保存後も復活しない。
- [ ] 全ルール削除が確認ダイアログ後だけ実行され、保存後も空のルールセットを維持できる。
- [ ] スキャン後に分類結果と変更プレビューが表示される。
- [ ] ゲーム、成人向け、削除予定の初期分類が有効になっている。
- [ ] 整理適用前に確認ダイアログが表示される。
- [ ] `整理 / 削除予定` のブックマークは整理適用確認後だけ削除される。
- [ ] 整理適用後に空になった対象フォルダが削除される。
- [ ] 直前復元で直前ジョブの移動を戻せる。
- [ ] テスト用バックアップから保存時点へ戻せる。
- [ ] リンク切れチェックで HTTP 404/410 だけが削除候補になる。
- [ ] リンク切れ削除前に確認ダイアログが表示される。
- [ ] Side Panel 上部ステータスが各長時間操作の完了状態へ更新される。

## 権限とプライバシー

- [ ] `manifest.json` の基本権限は `bookmarks`、`storage`、`sidePanel` である。
- [ ] host permission はリンク切れチェック用の `http://*/*` と `https://*/*` に限定されている。
- [ ] 分類、候補生成、整理、復元のためにブックマークの完全 URL やタイトルを外部 API へ送信しない。
- [ ] favicon サムネイル表示ではドメイン名だけが外部 favicon サービスへ送られることを README と仕様書で説明している。

## 文書

- [ ] `README.md` が現在の機能と権限を説明している。
- [ ] `docs/01_REQUIREMENTS.md` が現行 MVP の要件を説明している。
- [ ] `docs/02_SPECIFICATION.md` が実装済みフローを説明している。
- [ ] `docs/03_ARCHITECTURE_DESIGN.md` が責務分割と設計パターンを説明している。
- [ ] `docs/test/MANUAL_TESTS.md` が最新の手動確認手順になっている。
- [ ] `docs/test/TEST_RESULTS.md` に最終確認結果を追記している。
- [ ] `docs/07_POST_MVP_BACKLOG.md` に MVP 後の候補を分離している。

## 公開前に別途必要な作業

- [x] Chrome Web Store 用アイコンを用意する。
- [x] Chrome Web Store 用スクリーンショットを用意する。
- [x] プライバシーポリシーを用意する。
- [x] ストア説明文に、ブックマーク権限、リンク切れチェック用通信、favicon 表示の扱いを明記する。

## Chrome Web Store 申請素材

- 商品説明文: `docs/store/STORE_LISTING_JA.md`
- プライバシー入力ガイド: `docs/store/CHROME_WEB_STORE_INPUTS_JA.md`
- プライバシーポリシー: `docs/PRIVACY_POLICY.md`
- ストアアイコン: `dist/store-assets/store_icon_512.png`
- 小プロモーション画像: `dist/store-assets/small_promo_440x280.png`
- スクリーンショット: `dist/store-assets/screenshots/`
