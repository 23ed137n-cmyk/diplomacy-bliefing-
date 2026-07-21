// 外交速報ウィジェット / Diplomatic Brief Widget
// Scriptable (iOS) — ホーム画面に常駐させる 48時間ブリーフィングの一覧面
//
// 設定：下の SOURCE_URL に、ブリーフィングJSONの公開URLを入れてください。
// 空のままでも、iCloud Drive の Scriptable フォルダに置いた
// gaiko-brief.json を読みます。

const SOURCE_URL = "";              // 例: "https://drive.google.com/uc?export=download&id=xxxx"
const LOCAL_FILE = "gaiko-brief.json";
const STALE_HOURS = 26;             // これを超えたら「更新なし」を表示

// ── 意匠：外務省の公電用紙。淡青の罫紙に墨、優先事項だけ朱線 ──
const PAPER   = new Color("#E7EBEF");
const INK     = new Color("#14202E");
const INKSOFT = new Color("#556577");
const RULE    = new Color("#A8B6C2");
const SHU     = new Color("#B8342A");

const MINCHO = "HiraMinProN-W6";
const GOTHIC = "HiraginoSans-W3";
const GOTHIC_B = "HiraginoSans-W6";

const FAMILY = config.widgetFamily || "large";
const CAPACITY = { small: 1, medium: 3, large: 6, extraLarge: 8 }[FAMILY] || 6;

const data = await loadBrief();
const widget = buildWidget(data);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentLarge();
}
Script.complete();

// ───────────────────────────── データ取得 ─────────────────────────────

async function loadBrief() {
  if (SOURCE_URL) {
    try {
      const req = new Request(SOURCE_URL);
      req.timeoutInterval = 12;
      const json = await req.loadJSON();
      cache(json);
      return json;
    } catch (e) {
      // 通信失敗時はキャッシュへ
    }
  }
  const local = readCache();
  if (local) return local;
  return null;
}

function cachePath() {
  const fm = FileManager.local();
  return fm.joinPath(fm.cacheDirectory(), "gaiko-brief-cache.json");
}

function cache(json) {
  try {
    FileManager.local().writeString(cachePath(), JSON.stringify(json));
  } catch (e) {}
}

function readCache() {
  // 1) iCloud Drive の Scriptable フォルダ
  try {
    const fm = FileManager.iCloud();
    const path = fm.joinPath(fm.documentsDirectory(), LOCAL_FILE);
    if (fm.fileExists(path)) {
      fm.downloadFileFromiCloud(path);
      return JSON.parse(fm.readString(path));
    }
  } catch (e) {}
  // 2) 直近の取得結果
  try {
    const fm = FileManager.local();
    if (fm.fileExists(cachePath())) return JSON.parse(fm.readString(cachePath()));
  } catch (e) {}
  return null;
}

// ───────────────────────────── 描画 ─────────────────────────────

function buildWidget(d) {
  const w = new ListWidget();
  w.backgroundColor = PAPER;
  w.setPadding(14, 15, 12, 15);

  if (!d || !Array.isArray(d.items) || d.items.length === 0) {
    emptyState(w);
    return w;
  }

  header(w, d);
  rule(w, RULE);
  w.addSpacer(FAMILY === "small" ? 8 : 9);

  const items = d.items.slice(0, CAPACITY);
  items.forEach((item, i) => {
    if (i > 0) {
      w.addSpacer(7);
      rule(w, RULE, true);
      w.addSpacer(7);
    }
    row(w, item);
  });

  w.addSpacer();
  footer(w, d);

  if (d.url) w.url = d.url;
  return w;
}

function header(w, d) {
  const bar = w.addStack();
  bar.layoutHorizontally();
  bar.centerAlignContent();

  const seal = bar.addStack();
  seal.size = new Size(9, 9);
  seal.backgroundColor = SHU;
  seal.cornerRadius = 1;

  bar.addSpacer(7);
  const title = bar.addText("外交速報");
  title.font = new Font(MINCHO, FAMILY === "small" ? 14 : 16);
  title.textColor = INK;

  bar.addSpacer(6);
  const span = bar.addText("48H");
  span.font = new Font(GOTHIC_B, 9);
  span.textColor = INKSOFT;

  bar.addSpacer();

  const stamp = bar.addText(stampText(d));
  stamp.font = new Font(GOTHIC, 10);
  stamp.textColor = isStale(d) ? SHU : INKSOFT;
  stamp.lineLimit = 1;

  w.addSpacer(8);
}

function row(w, item) {
  const line = w.addStack();
  line.layoutHorizontally();
  line.topAlignContent();

  const mark = line.addStack();
  mark.size = new Size(2, FAMILY === "small" ? 34 : 30);
  mark.backgroundColor = item.priority ? SHU : new Color("#C3CDD6");

  line.addSpacer(9);

  const body = line.addStack();
  body.layoutVertically();

  if (item.tag) {
    const tag = body.addText(String(item.tag));
    tag.font = new Font(GOTHIC_B, 9);
    tag.textColor = INKSOFT;
    tag.lineLimit = 1;
    body.addSpacer(2);
  }

  const head = body.addText(String(item.title || ""));
  head.font = new Font(MINCHO, FAMILY === "small" ? 13 : 13.5);
  head.textColor = INK;
  head.lineLimit = FAMILY === "small" ? 3 : 2;
  head.minimumScaleFactor = 0.9;
}

function footer(w, d) {
  w.addSpacer(9);
  rule(w, RULE);
  w.addSpacer(6);

  const f = w.addStack();
  f.layoutHorizontally();
  f.centerAlignContent();

  const n = f.addText(countText(d));
  n.font = new Font(GOTHIC, 9.5);
  n.textColor = INKSOFT;

  f.addSpacer();

  if (d.url) {
    const cta = f.addText("全文を開く");
    cta.font = new Font(GOTHIC_B, 9.5);
    cta.textColor = INK;
  }
}

function emptyState(w) {
  const t = w.addText("外交速報");
  t.font = new Font(MINCHO, 16);
  t.textColor = INK;
  w.addSpacer(6);
  rule(w, RULE);
  w.addSpacer(10);

  const m = w.addText("ブリーフィングがまだ届いていません。");
  m.font = new Font(GOTHIC, 12);
  m.textColor = INK;
  w.addSpacer(4);

  const s = w.addText("スクリプト先頭の SOURCE_URL を設定するか、Scriptable フォルダに gaiko-brief.json を置いてください。");
  s.font = new Font(GOTHIC, 10.5);
  s.textColor = INKSOFT;
  s.lineLimit = 4;
}

function rule(w, color, faint) {
  const s = w.addStack();
  s.size = new Size(0, faint ? 0.5 : 1);
  s.backgroundColor = color;
  s.addSpacer();
}

// ───────────────────────────── 補助 ─────────────────────────────

function parsed(d) {
  if (!d || !d.updated) return null;
  const t = new Date(d.updated);
  return isNaN(t.getTime()) ? null : t;
}

function isStale(d) {
  const t = parsed(d);
  if (!t) return false;
  return (Date.now() - t.getTime()) / 3600000 > STALE_HOURS;
}

function stampText(d) {
  const t = parsed(d);
  if (!t) return "";
  if (isStale(d)) return "更新なし";
  const df = new DateFormatter();
  df.dateFormat = "M/d HH:mm";
  return df.string(t) + " 発信";
}

function countText(d) {
  const total = Array.isArray(d.items) ? d.items.length : 0;
  const shown = Math.min(total, CAPACITY);
  return total > shown ? `${shown} / ${total} 件` : `${total} 件`;
}
