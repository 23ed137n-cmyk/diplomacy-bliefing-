// HIPHOP ニューリリース ウィジェット
// Scriptable (iOS) — フォロー中ラッパーの新譜と、今週の「未フォローの2人」を表示する
//
// 設定：下の SOURCE_URL に releases.json の公開URLを入れてください。
// 空のままなら、iCloud Drive の Scriptable フォルダに置いた
// hiphop-releases.json を読みます。
// ウィジェットをタップすると、hiphop/index.html（url フィールド）が開きます。

const SOURCE_URL = "";              // 例: "https://drive.google.com/uc?export=download&id=xxxx"
const LOCAL_FILE = "hiphop-releases.json";
const STALE_DAYS = 8;               // これを超えたら「更新なし」を表示

// ── 意匠：レコード盤。黒盤にマゼンタのラベル、白のトラック表記 ──
const VINYL   = new Color("#101014");
const LABEL   = new Color("#F472B6");
const CYAN    = new Color("#38BDF8");
const TEXT    = new Color("#F1F5F9");
const TEXTDIM = new Color("#8B94A3");
const GROOVE  = new Color("#2A2A33");

const GOTHIC   = "HiraginoSans-W3";
const GOTHIC_B = "HiraginoSans-W6";

const FAMILY = config.widgetFamily || "large";
const CAPACITY = { small: 2, medium: 3, large: 7, extraLarge: 10 }[FAMILY] || 7;

const data = await loadReleases();
const widget = buildWidget(data);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentLarge();
}
Script.complete();

// ───────────────────────────── データ取得 ─────────────────────────────

async function loadReleases() {
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
  return readCache();
}

function cachePath() {
  const fm = FileManager.local();
  return fm.joinPath(fm.cacheDirectory(), "hiphop-releases-cache.json");
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
  w.backgroundColor = VINYL;
  w.setPadding(14, 15, 12, 15);

  const releases = d && Array.isArray(d.releases) ? d.releases : [];
  const discover = d && Array.isArray(d.discover) ? d.discover : [];

  if (releases.length === 0 && discover.length === 0) {
    emptyState(w, d);
    return w;
  }

  header(w, d, releases.length);
  rule(w, GROOVE);
  w.addSpacer(FAMILY === "small" ? 7 : 9);

  // 新譜を先に、残り枠で「今週の2人」を出す（最低1枠は discover に残す）
  const discoverSlots = discover.length === 0 ? 0 : Math.min(discover.length, FAMILY === "small" ? 1 : 2);
  const releaseSlots = Math.max(0, CAPACITY - discoverSlots);
  const shownReleases = releases.slice(0, releaseSlots);
  const shownDiscover = discover.slice(0, discoverSlots);

  shownReleases.forEach((item, i) => {
    if (i > 0) {
      w.addSpacer(6);
      rule(w, GROOVE, true);
      w.addSpacer(6);
    }
    releaseRow(w, item);
  });

  if (shownDiscover.length) {
    w.addSpacer(9);
    sectionLabel(w, "今週の2人 / 未フォロー");
    w.addSpacer(6);
    shownDiscover.forEach((item, i) => {
      if (i > 0) w.addSpacer(6);
      discoverRow(w, item);
    });
  }

  w.addSpacer();
  footer(w, d, releases.length);

  if (d && d.url) w.url = d.url;
  return w;
}

function header(w, d, count) {
  const bar = w.addStack();
  bar.layoutHorizontally();
  bar.centerAlignContent();

  const dot = bar.addStack();
  dot.size = new Size(9, 9);
  dot.backgroundColor = LABEL;
  dot.cornerRadius = 4.5;

  bar.addSpacer(7);
  const title = bar.addText("NEW HIPHOP");
  title.font = new Font(GOTHIC_B, FAMILY === "small" ? 12 : 14);
  title.textColor = TEXT;

  bar.addSpacer();

  const stamp = bar.addText(stampText(d));
  stamp.font = new Font(GOTHIC, 9.5);
  stamp.textColor = isStale(d) ? LABEL : TEXTDIM;
  stamp.lineLimit = 1;

  w.addSpacer(8);
}

function releaseRow(w, item) {
  const line = w.addStack();
  line.layoutHorizontally();
  line.topAlignContent();

  const mark = line.addStack();
  mark.size = new Size(2, FAMILY === "small" ? 30 : 28);
  mark.backgroundColor = item.added ? new Color("#4ADE80") : LABEL;

  line.addSpacer(9);

  const body = line.addStack();
  body.layoutVertically();

  const top = body.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();

  const artist = top.addText(String(item.artist || ""));
  artist.font = new Font(GOTHIC_B, FAMILY === "small" ? 12 : 13);
  artist.textColor = TEXT;
  artist.lineLimit = 1;

  if (item.releaseDate) {
    top.addSpacer(6);
    const date = top.addText(String(item.releaseDate).slice(5));
    date.font = new Font(GOTHIC, 9);
    date.textColor = TEXTDIM;
    date.lineLimit = 1;
  }

  body.addSpacer(2);

  const title = body.addText(String(item.title || ""));
  title.font = new Font(GOTHIC, FAMILY === "small" ? 11 : 11.5);
  title.textColor = TEXTDIM;
  title.lineLimit = FAMILY === "small" ? 2 : 1;
  title.minimumScaleFactor = 0.9;
}

function discoverRow(w, item) {
  const line = w.addStack();
  line.layoutHorizontally();
  line.topAlignContent();

  const mark = line.addStack();
  mark.size = new Size(2, FAMILY === "small" ? 26 : 24);
  mark.backgroundColor = CYAN;

  line.addSpacer(9);

  const body = line.addStack();
  body.layoutVertically();

  const name = body.addText(String(item.name || ""));
  name.font = new Font(GOTHIC_B, FAMILY === "small" ? 11.5 : 12.5);
  name.textColor = CYAN;
  name.lineLimit = 1;

  const sub = item.startWith ? `♪ ${item.startWith}` : String(item.why || "");
  if (sub) {
    body.addSpacer(2);
    const s = body.addText(sub);
    s.font = new Font(GOTHIC, FAMILY === "small" ? 10 : 10.5);
    s.textColor = TEXTDIM;
    s.lineLimit = FAMILY === "small" ? 2 : 1;
    s.minimumScaleFactor = 0.9;
  }
}

function sectionLabel(w, text) {
  const t = w.addText(text);
  t.font = new Font(GOTHIC_B, 9);
  t.textColor = CYAN;
  t.lineLimit = 1;
}

function footer(w, d, total) {
  w.addSpacer(9);
  rule(w, GROOVE);
  w.addSpacer(6);

  const f = w.addStack();
  f.layoutHorizontally();
  f.centerAlignContent();

  const n = f.addText(countText(d, total));
  n.font = new Font(GOTHIC, 9.5);
  n.textColor = TEXTDIM;

  f.addSpacer();

  if (d && d.url) {
    const cta = f.addText("一覧を開く");
    cta.font = new Font(GOTHIC_B, 9.5);
    cta.textColor = TEXT;
  }
}

function emptyState(w, d) {
  const t = w.addText("NEW HIPHOP");
  t.font = new Font(GOTHIC_B, 14);
  t.textColor = TEXT;
  w.addSpacer(6);
  rule(w, GROOVE);
  w.addSpacer(10);

  const m = w.addText(d ? "今週の新譜はありませんでした。" : "リリース一覧がまだ届いていません。");
  m.font = new Font(GOTHIC, 12);
  m.textColor = TEXT;
  w.addSpacer(4);

  const s = w.addText("スクリプト先頭の SOURCE_URL を設定するか、Scriptable フォルダに hiphop-releases.json を置いてください。");
  s.font = new Font(GOTHIC, 10.5);
  s.textColor = TEXTDIM;
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
  return (Date.now() - t.getTime()) / 86400000 > STALE_DAYS;
}

function stampText(d) {
  const t = parsed(d);
  if (!t) return "";
  if (isStale(d)) return "更新なし";
  const df = new DateFormatter();
  df.dateFormat = "M/d";
  return df.string(t) + " 更新";
}

function countText(d, total) {
  const added = (d && Array.isArray(d.releases) ? d.releases : []).filter((r) => r.added).length;
  if (total === 0) return "新譜なし";
  return added > 0 ? `新譜 ${total} 件 / 追加済み ${added}` : `新譜 ${total} 件`;
}
