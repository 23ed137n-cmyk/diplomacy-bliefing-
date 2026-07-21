// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: globe-asia;

// ─────────────────────────────────────────────────────────────
//  外交速報 ウィジェット（Scriptable / 大サイズ推奨）
//
//  gaiko-brief.json を読み込み、外交モーニング・ブリーフィングの
//  見出しをホーム画面に表示する。
//
//  データの取得先：
//   1) SOURCE_URL が設定されていれば、その URL から取得する。
//      Google Drive の場合は共有URLのファイルIDを使い、次の形式で入れる。
//        https://drive.google.com/uc?export=download&id=【ファイルID】
//   2) SOURCE_URL が空なら、iCloud Drive の Scriptable フォルダに置いた
//      gaiko-brief.json を読む（手動運用・Driveを使わない場合）。
// ─────────────────────────────────────────────────────────────

const SOURCE_URL = ""; // ← ここに Google Drive の直リンクを入れる（空ならローカル）
const LOCAL_FILENAME = "gaiko-brief.json";
const MAX_ITEMS = 8;

// ── 配色 ──────────────────────────────────────────────────────
const COLOR = {
  bg1: new Color("#0f172a"),
  bg2: new Color("#1e293b"),
  text: new Color("#e2e8f0"),
  muted: new Color("#94a3b8"),
  accent: new Color("#38bdf8"),
  tag: new Color("#7dd3fc"),
  priority: new Color("#fca5a5"),
  star: new Color("#fbbf24"),
};

async function loadData() {
  if (SOURCE_URL && SOURCE_URL.trim() !== "") {
    const req = new Request(SOURCE_URL.trim());
    req.timeoutInterval = 15;
    return await req.loadJSON();
  }
  // ローカル（iCloud Drive の Scriptable フォルダ）から読む。
  const fm = FileManager.iCloud();
  const path = fm.joinPath(fm.documentsDirectory(), LOCAL_FILENAME);
  if (!fm.fileExists(path)) {
    throw new Error(LOCAL_FILENAME + " が見つかりません");
  }
  if (fm.isFileStoredIniCloud(path) && !fm.isFileDownloaded(path)) {
    await fm.downloadFileFromiCloud(path);
  }
  const raw = fm.readString(path);
  return JSON.parse(raw);
}

function formatUpdated(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const df = new DateFormatter();
  df.dateFormat = "M/d HH:mm";
  return df.string(d);
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function buildWidget(data) {
  const w = new ListWidget();
  const grad = new LinearGradient();
  grad.colors = [COLOR.bg1, COLOR.bg2];
  grad.locations = [0, 1];
  w.backgroundGradient = grad;
  w.setPadding(14, 16, 14, 16);

  // タップで全文リンクを開く（あれば）。
  if (data && typeof data.url === "string" && data.url.trim() !== "") {
    w.url = data.url.trim();
  }

  // ── ヘッダー ──
  const header = w.addStack();
  header.centerAlignContent();
  const title = header.addText("外交速報");
  title.font = Font.boldSystemFont(17);
  title.textColor = COLOR.text;
  header.addSpacer();
  const upd = header.addText(formatUpdated(data && data.updated));
  upd.font = Font.systemFont(11);
  upd.textColor = COLOR.muted;

  const rule = w.addStack();
  rule.size = new Size(0, 6);
  w.addSpacer(4);

  const items = (data && Array.isArray(data.items)) ? data.items : [];
  if (items.length === 0) {
    const empty = w.addText("表示できる項目がありません。");
    empty.font = Font.systemFont(13);
    empty.textColor = COLOR.muted;
    return w;
  }

  // 重要度順：priority を先頭に、元の並び順を保持。
  const sorted = items
    .map((item, i) => ({ item, i }))
    .sort((a, b) =>
      (b.item.priority === true) - (a.item.priority === true) || a.i - b.i
    )
    .map((x) => x.item)
    .slice(0, MAX_ITEMS);

  for (const item of sorted) {
    w.addSpacer(6);
    const row = w.addStack();
    row.centerAlignContent();
    row.spacing = 6;

    const isPri = item.priority === true;

    if (isPri) {
      const star = row.addText("★");
      star.font = Font.systemFont(12);
      star.textColor = COLOR.star;
    }

    const tag = row.addText("［" + truncate(item.tag || "—", 6) + "］");
    tag.font = Font.mediumSystemFont(12);
    tag.textColor = COLOR.tag;
    tag.lineLimit = 1;

    const t = row.addText(truncate(item.title || "(無題)", 32));
    t.font = isPri ? Font.semiboldSystemFont(13) : Font.systemFont(13);
    t.textColor = isPri ? COLOR.priority : COLOR.text;
    t.lineLimit = 1;
    t.minimumScaleFactor = 0.7;
  }

  return w;
}

function errorWidget(message) {
  const w = new ListWidget();
  w.backgroundColor = COLOR.bg1;
  w.setPadding(16, 16, 16, 16);
  const title = w.addText("外交速報");
  title.font = Font.boldSystemFont(16);
  title.textColor = COLOR.text;
  w.addSpacer(8);
  const err = w.addText("読み込みエラー\n" + message);
  err.font = Font.systemFont(12);
  err.textColor = COLOR.muted;
  return w;
}

let widget;
try {
  const data = await loadData();
  widget = buildWidget(data);
} catch (e) {
  widget = errorWidget(String(e && e.message ? e.message : e));
}

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentLarge();
}
Script.complete();
