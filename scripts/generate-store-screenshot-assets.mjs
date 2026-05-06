import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const outDir = path.join(root, "dist", "store-assets");
const screenshotsDir = path.join(outDir, "screenshots");
const renderDir = path.join(outDir, ".render");
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));

if (!chromePath) {
  throw new Error("Chrome or Edge executable was not found. Set CHROME_PATH.");
}

mkdirSync(screenshotsDir, { recursive: true });
mkdirSync(renderDir, { recursive: true });

const css = `
  :root {
    font-family: "Yu Gothic UI", "Meiryo", "Noto Sans JP", "Segoe UI", sans-serif;
    color: #f6f8fb;
    background: #383838;
  }
  * { box-sizing: border-box; }
  body { margin: 0; width: 1280px; height: 800px; overflow: hidden; background: #383838; }
  .chrome { position: relative; width: 1280px; height: 800px; background: #3a3a3a; }
  .bar { height: 25px; background: #2d2d2d; display: flex; align-items: center; gap: 12px; padding: 0 14px; color: #e8eef8; font-size: 13px; }
  .bar .folder { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
  .folder-icon { width: 15px; height: 11px; border: 1px solid #c9d0d6; border-radius: 2px; display: inline-block; opacity: .9; }
  .google { position: absolute; left: 0; top: 25px; width: 800px; height: 775px; display: grid; place-items: center; }
  .google-inner { transform: translateY(-55px); text-align: center; }
  .logo { font-size: 78px; line-height: 1; font-weight: 500; margin-bottom: 44px; letter-spacing: 0; }
  .search { width: 510px; height: 49px; background: #f7f7f7; color: #42607a; border-radius: 26px; display: flex; align-items: center; padding: 0 18px; gap: 14px; font-size: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.25); }
  .shortcut { margin: 36px auto 0; width: 55px; height: 55px; border-radius: 50%; background: #464b4e; display: grid; place-items: center; font-size: 28px; }
  .shortcut-label { margin-top: 12px; font-size: 14px; }
  .side-shell { position: absolute; right: 0; top: 25px; width: 480px; height: 775px; background: #0b1014; border-left: 1px solid #1d2833; padding: 16px; overflow: hidden; }
  .side-title { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .side-title > div:first-child { min-width: 0; }
  h1 { margin: 0; font-size: 18px; line-height: 1.2; }
  .status { margin-top: 6px; color: #b9d0ff; font-size: 13px; }
  .button { border: 1px solid #314157; background: #141b23; color: #fff; border-radius: 7px; padding: 10px 14px; font-weight: 800; font-size: 13px; white-space: nowrap; }
  .button.primary { background: #3f5bd8; border-color: #3f5bd8; }
  .side-title .button.primary { padding: 10px 10px; font-size: 12px; }
  .button.danger { background: #ba2b22; border-color: #ba2b22; }
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 14px; }
  .metric, .panel, .card { background: #141b23; border: 1px solid #314157; border-radius: 7px; }
  .metric { height: 70px; padding: 12px; }
  .metric span { color: #b4c0d0; display: block; font-size: 12px; }
  .metric strong { display: block; margin-top: 8px; font-size: 21px; }
  .panel { margin-top: 14px; padding: 14px; }
  .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .panel-title { font-weight: 900; font-size: 16px; }
  .list { height: 250px; overflow: hidden; border: 1px solid #314157; border-radius: 7px; background: #111820; }
  .list.short { height: 170px; }
  .row { min-height: 76px; padding: 11px 12px; border-bottom: 1px solid #2f4050; }
  .row strong { display: block; font-size: 14px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row div { margin-top: 5px; color: #bdd4f3; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .backup { color: #8fa2ba; font-size: 12px; margin: 12px 0; }
  .message { margin-top: 12px; background: #0e1730; color: #cfe1ff; border-radius: 6px; padding: 13px; font-size: 13px; }
  .options { position: absolute; left: 0; top: 25px; width: 800px; height: 775px; background: #0a0f13; padding: 36px 42px; color: #f6f8fb; overflow: hidden; }
  .options h2 { margin: 0; font-size: 24px; }
  .tabs { display: flex; gap: 8px; margin: 22px 0 18px; }
  .tab { border: 1px solid #314157; border-radius: 7px; padding: 10px 16px; font-weight: 800; font-size: 13px; }
  .tab.active { background: #3f5bd8; border-color: #3f5bd8; }
  .form { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 14px; }
  .field label { display: block; font-weight: 900; font-size: 13px; margin-bottom: 6px; white-space: nowrap; }
  .field span { margin-left: 4px; border: 1px solid #4a73ae; border-radius: 999px; color: #bcd4ff; font-size: 10px; padding: 1px 5px; }
  .box { height: 38px; border: 1px solid #314157; background: #141b23; border-radius: 6px; padding: 9px 11px; color: #fff; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rule-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 18px; }
  .rule-card { min-height: 128px; border: 1px solid #314157; background: #141b23; border-radius: 7px; padding: 13px; display: grid; grid-template-columns: 40px 1fr; gap: 10px; }
  .icon { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid #314157; border-radius: 7px; font-weight: 900; color: #d7ecff; background: #0e151d; font-size: 12px; }
  .title { font-weight: 900; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { color: #bdd4f3; font-size: 12px; line-height: 1.45; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .menus { position: absolute; top: 58px; left: 30px; display: flex; align-items: flex-start; filter: drop-shadow(0 16px 22px rgba(0,0,0,.35)); }
  .menu { width: 165px; background: #1e1e1e; border-radius: 8px; padding: 8px 0; }
  .menu.mid { margin-left: 2px; width: 185px; }
  .menu.last { margin-left: 2px; width: 120px; }
  .menu div { height: 32px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; font-size: 14px; }
  .menu div.active { background: rgba(255,255,255,.08); }
  .dialog-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.64); display: flex; align-items: flex-start; justify-content: center; padding-top: 52px; }
  .dialog { width: 450px; min-height: 180px; background: #202020; border: 1px solid #5b5b5b; border-radius: 10px; padding: 24px; color: #fff; }
  .dialog-title { font-weight: 900; font-size: 16px; }
  .dialog-text { margin-top: 14px; font-weight: 800; line-height: 1.55; font-size: 13px; }
  .dialog-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 26px; }
`;

function side(status, message, includeLinkCheck = false) {
  return `
    <aside class="side-shell">
      <div class="side-title">
        <div><h1>Bookmark Purpose Organizer</h1><div class="status">${status}</div></div>
        <div class="button primary">スキャンして分類</div>
      </div>
      <div class="metrics">
        <div class="metric"><span>ブックマーク</span><strong>305</strong></div>
        <div class="metric"><span>整理候補</span><strong>305</strong></div>
        <div class="metric"><span>作成予定</span><strong>18</strong></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div class="panel-title">分類結果</div><div><span class="button">Side Panelで編集</span> <span class="button">別タブ</span></div></div>
        <div class="list">
          ${row("凹みTips", "tips.hecomi.com", "移動先: 知識/学習・リファレンス", "理由: tips.hecomi.com ドメイン")}
          ${row("untitled", "jstage.jst.go.jp", "移動先: 知識/調査・論文", "理由: J-STAGE ドメイン / 調査関連キーワード")}
          ${row("SurfaceFlow - Realtime Surface Deformation - Superhive", "superhivemarket.com", "移動先: 知識/調査・資料", "理由: superhivemarket.com ドメイン")}
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">変更プレビュー</div>
        <div class="list short">
          ${row("凹みTips", "現在: ブックマーク バー / 分類済みブックマーク / 知識 / 学習・リファレンス", "予定: 分類済みブックマーク / 知識 / 学習・リファレンス", "")}
          ${row("untitled", "現在: ブックマーク バー / 分類済みブックマーク / 知識 / 調査・論文", "予定: 分類済みブックマーク / 知識 / 調査・論文", "")}
        </div>
      </div>
      ${includeLinkCheck ? `
      <div class="panel">
        <div class="panel-head"><div class="panel-title">リンク切れチェック</div><div class="button">リンク切れを確認</div></div>
        <div class="backup">未チェックです。<br>リンク切れ候補はまだありません。</div>
        <span class="button danger">確認してリンク切れを削除</span>
      </div>` : ""}
      <div class="panel">
        <div class="panel-head"><div class="panel-title">テスト用バックアップ</div><div class="button">現在状態をバックアップ</div></div>
        <div class="backup">保存済み: 2026/5/7 3:51:52 / 305 件</div>
        <div class="button" style="text-align:center;">バックアップから復元</div>
      </div>
      <div class="button danger" style="margin-top:12px;text-align:center;">プレビュー済みの整理を適用</div>
      <div class="message">${message}</div>
    </aside>
  `;
}

function row(title, domain, target, reason) {
  return `<div class="row"><strong>${title}</strong><div>${domain}</div><div>${target}</div>${reason ? `<div>${reason}</div>` : ""}</div>`;
}

function chromeShell(main, sideHtml, menuHtml = "") {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${css}</style></head><body>
    <div class="chrome">
      <div class="bar">
        <span>▦</span>
        ${["凹みTips","Microsoft Office ホーム","アナリティクス | ホーム","Material 3 Expressive...","Tailscale | Secure Co...","NetBird - Open Sou...","分類済みブックマーク","モバイルのブックマーク","よく見るサイト","ウェブサイト","個人","バイク論文","新しいフォルダ","Blender"].map((t) => `<span class="folder"><i class="folder-icon"></i>${t}</span>`).join("")}
      </div>
      ${main}
      ${sideHtml}
      ${menuHtml}
    </div>
  </body></html>`;
}

const googleMain = `
  <main class="google">
    <div class="google-inner">
      <div class="logo">Google</div>
      <div class="search">⌕ <span style="flex:1;text-align:left;">Google で検索または URL を入力</span> 🎙 ⚙ <span>AI モード</span></div>
      <div class="shortcut">+</div>
      <div class="shortcut-label">ショートカット...</div>
    </div>
  </main>
`;

const pages = [
  {
    file: "01-scan-results-1280x800.png",
    html: chromeShell(googleMain, side("バックアップ復元完了: 305/305", "バックアップから復元しました。復元 305 / 305 件、順序調整 0 件、パス復元 297 件、警告 0 件。")),
  },
  {
    file: "02-apply-confirmation-1280x800.png",
    html: chromeShell(googleMain, side("整理適用前", "分類が完了しました。305 件の移動候補があります。", true)) + "",
    overlay: `<div class="dialog-backdrop"><div class="dialog"><div class="dialog-title">拡張機能 Bookmark Purpose Organizer の記述</div><div class="dialog-text">移動 305 件、削除予定 0 件の整理を適用します。削除予定カテゴリのブックマークと、移動後に空になったフォルダも削除します。実行しますか？</div><label style="display:block;margin-top:10px;font-size:13px;"><input type="checkbox"> このページで追加のダイアログが作成されないようにする</label><div class="dialog-actions"><div class="button primary" style="min-width:84px;text-align:center;">OK</div><div class="button" style="background:#13548b;min-width:90px;text-align:center;">キャンセル</div></div></div></div>`,
  },
  {
    file: "03-folder-result-1280x800.png",
    html: chromeShell(
      googleMain,
      side("整理適用完了: 移動 305 件 / 削除 0 件 / 空フォルダ 0 件 / 警告 0 件", "整理を適用しました。移動 305 件、削除予定 0 件、空フォルダ削除 0 件、警告 0 件。", true),
      `<div class="menus"><div class="menu">${["知識","業務","サイト運営","制作","開発","生活","インターネット","娯楽","制限付き","メディア"].map((x,i)=>`<div class="${i===0?"active":""}"><span><i class="folder-icon"></i> ${x}</span><span>›</span></div>`).join("")}</div><div class="menu mid"><div class="active"><span><i class="folder-icon"></i> 学習・リファレンス</span><span>›</span></div><div><span><i class="folder-icon"></i> 調査・論文</span><span>›</span></div><div><span><i class="folder-icon"></i> 調査・資料</span><span>›</span></div></div><div class="menu last"><div class="active">🐸 凹みTips</div></div></div>`
    ),
  },
  {
    file: "04-options-rules-1280x800.png",
    html: `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${css}</style></head><body><div class="chrome"><div class="bar"><span>▦</span>${["分類済みブックマーク","モバイルのブックマーク","よく見るサイト","ウェブサイト","個人","バイク論文","新しいフォルダ","Blender"].map((t)=>`<span class="folder"><i class="folder-icon"></i>${t}</span>`).join("")}</div><main class="options"><h2>分類ルール</h2><div class="status">分類先の設定、サイトの割り当て、ルール管理、JSON 直接編集に対応します。</div><div class="tabs"><div class="tab active">分類先設定</div><div class="tab">サイト割り当て</div><div class="tab">ルール管理</div><div class="tab">JSON 編集</div></div><div class="form">${field("大項目","インターネット")} ${field("新規大項目","開発")} ${field("中項目","検索・ポータル")} ${field("新規中項目","コード管理")} ${field("アイコン / サムネイル","WWW ドメイン")} ${field("カスタムアイコン / 画像 URL","AI または https://example.com/icon.png")} ${field("軸","目的")} ${field("優先度","85")} ${field("理由","未入力ならドメイン理由")} ${field("サイト URL","https://example.com/page")} ${field("認識ドメイン","ドメイン未検出")} <div class="field"><label>&nbsp;</label><div class="button primary" style="text-align:center;height:38px;">分類先を追加</div></div></div><div class="rule-grid">${ruleCards()}</div></main>${side("整理適用完了: 移動 305 件 / 削除 0 件 / 空フォルダ 0 件 / 警告 0 件", "整理を適用しました。移動 305 件、削除予定 0 件、空フォルダ削除 0 件、警告 0 件。")}</div></body></html>`,
  },
  {
    file: "05-link-check-backup-1280x800.png",
    html: chromeShell(googleMain, side("リンク切れ確認", "リンク切れ候補は確認後に削除できます。", true)),
  },
];

function field(label, value) {
  return `<div class="field"><label>${label}<span>必須</span></label><div class="box">${value}</div></div>`;
}

function ruleCards() {
  const rules = [
    ["WWW","google.co.jp","インターネット / 検索・ポータル","目的 / 優先度 88 / 割り当て 1件"],
    ["MAP","85po.com","インターネット / 地図・交通","目的 / 優先度 88 / 割り当て 6件"],
    ["ID","facebook.com","サイト運営 / プロフィール","目的 / 優先度 88 / 割り当て 4件"],
    ["↗","Google Analytics","サイト運営 / 分析","目的 / 優先度 86 / 割り当て 1件"],
    ["SNS","X","メディア / SNS・投稿","目的 / 優先度 98 / 割り当て 3件"],
    ["▶","YouTube","メディア / 動画・視聴","目的 / 優先度 90 / 割り当て 5件"],
    ["AI","AI ツール","開発 / AI・自動化","目的 / 優先度 75 / 割り当て 1件"],
    ["{}","GitHub","開発 / コード管理","目的 / 優先度 100 / 割り当て 1件"],
    ["NW","Cloudflare","開発 / ネットワーク","目的 / 優先度 88 / 割り当て 7件"],
    ["✓","プロジェクト管理","業務 / プロジェクト管理","目的 / 優先度 65 / 割り当て 1件"],
    ["@","Gmail","業務 / 連絡・Office","目的 / 優先度 90 / 割り当て 5件"],
    ["GAME","Steam","娯楽 / ゲーム","目的 / 優先度 90 / 割り当て 8件"],
  ];
  return rules.map(([i,t,p,m]) => `<div class="rule-card"><div class="icon">${i}</div><div><div class="title">${t}</div><div class="sub">${p}</div><div class="sub">${m}</div><div style="margin-top:10px;"><span class="button">編集</span> <span class="button">削除</span></div></div></div>`).join("");
}

function withOverlay(html, overlay) {
  return html.replace("</body></html>", `${overlay}</body></html>`);
}

function cropPng(sourcePath, targetPath, width, height) {
  const script = `
    Add-Type -AssemblyName System.Drawing
    $src = $env:PNG_SOURCE
    $dst = $env:PNG_TARGET
    $w = [int]$env:PNG_WIDTH
    $h = [int]$env:PNG_HEIGHT
    $source = [System.Drawing.Image]::FromFile($src)
    try {
      $bitmap = New-Object System.Drawing.Bitmap($w, $h)
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
          $graphics.DrawImage($source, 0, 0, (New-Object System.Drawing.Rectangle(0, 0, $w, $h)), [System.Drawing.GraphicsUnit]::Pixel)
        } finally {
          $graphics.Dispose()
        }
        $bitmap.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
      } finally {
        $bitmap.Dispose()
      }
    } finally {
      $source.Dispose()
    }
  `;
  const result = spawnSync("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ], {
    encoding: "utf8",
    env: {
      ...process.env,
      PNG_SOURCE: sourcePath,
      PNG_TARGET: targetPath,
      PNG_WIDTH: String(width),
      PNG_HEIGHT: String(height),
    },
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
}

function render(page) {
  const html = page.overlay ? withOverlay(page.html, page.overlay) : page.html;
  const htmlPath = path.join(renderDir, page.file.replace(".png", ".html"));
  const outPath = path.join(screenshotsDir, page.file);
  const capturePath = path.join(renderDir, page.file.replace(".png", ".full.png"));
  writeFileSync(htmlPath, html, "utf8");
  const result = spawnSync(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1280,900",
    `--screenshot=${capturePath}`,
    pathToFileURL(htmlPath).href,
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
  cropPng(capturePath, outPath, 1280, 800);
  unlinkSync(capturePath);
}

for (const page of pages) {
  render(page);
}

const promoHtml = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${css} body{width:440px;height:280px;background:#0a0f13;padding:18px}.promo{border:1px solid #314157;background:#141b23;border-radius:12px;padding:24px;height:244px}h1{font-size:22px;margin:0 0 12px}.lead{color:#bdd4f3;font-size:15px;line-height:1.45}.chips{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:22px}.chip{border:1px solid #314157;background:#0e151d;border-radius:8px;padding:12px;font-weight:900}.chip span{display:block;color:#bdd4f3;font-size:12px;margin-top:7px;font-weight:500}</style></head><body><div class="promo"><h1>Bookmark Purpose Organizer</h1><div class="lead">ブックマークを分類、確認、バックアップ付きで安全に整理</div><div class="chips"><div class="chip">分類先設定<span>GUI / JSON / D&D 対応</span></div><div class="chip">安全に適用<span>プレビューと復元を用意</span></div></div></div></body></html>`;
const promoHtmlPath = path.join(renderDir, "small_promo_440x280.html");
writeFileSync(promoHtmlPath, promoHtml, "utf8");
const promoCapturePath = path.join(renderDir, "small_promo_440x280.full.png");
const promoResult = spawnSync(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  "--window-size=440,380",
  `--screenshot=${promoCapturePath}`,
  pathToFileURL(promoHtmlPath).href,
], { encoding: "utf8" });
if (promoResult.status !== 0) {
  throw new Error(promoResult.stderr || promoResult.stdout);
}
cropPng(promoCapturePath, path.join(outDir, "small_promo_440x280.png"), 440, 280);
unlinkSync(promoCapturePath);

rmSync(renderDir, { recursive: true, force: true });
console.log(`Generated ${pages.length} screenshots and small promo image.`);
