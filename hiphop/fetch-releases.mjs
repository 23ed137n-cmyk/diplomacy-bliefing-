#!/usr/bin/env node
// hiphop/fetch-releases.mjs
//
// フォロー中アーティストの「直近リリース」を iTunes Search API で拾い、
// HIPHOP だけに絞って releases.json に書き出す。
//
// iTunes Search API は認証不要・無料。ただし Apple のホストへ出られる回線が要る
// （Claude の実行環境は Apple ドメインが遮断されているため、手元の Mac / iPhone で走らせる）。
//
//   node hiphop/fetch-releases.mjs            # 直近7日
//   node hiphop/fetch-releases.mjs --days 14  # 期間を変える
//
// 出力: hiphop/releases.json の releases[] を置き換える（discover[] は保持）

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ARTISTS_PATH = join(HERE, "artists.json");
const RELEASES_PATH = join(HERE, "releases.json");

const days = Number(argValue("--days") ?? 7);
if (!Number.isFinite(days) || days <= 0) {
  console.error("--days には正の数を指定してください");
  process.exit(1);
}

const artists = JSON.parse(await readFile(ARTISTS_PATH, "utf8"));
const storefront = artists.storefront || "jp";
const genreKeywords = (artists.genreKeywords || ["Hip-Hop", "Rap"]).map((s) => s.toLowerCase());
const following = Array.isArray(artists.following) ? artists.following : [];

if (following.length === 0) {
  console.error(
    "artists.json の following[] が空です。Apple Music でフォロー中のラッパーを\n" +
    '  { "name": "Kendrick Lamar" }\n' +
    "の形で並べてから、もう一度実行してください。"
  );
  process.exit(1);
}

const since = new Date(Date.now() - days * 86400000);
const found = [];
const misses = [];
let dirty = false;

for (const entry of following) {
  const name = typeof entry === "string" ? entry : entry.name;
  if (!name) continue;

  let id = typeof entry === "string" ? null : entry.appleArtistId;
  if (!id) {
    id = await resolveArtistId(name);
    if (id && typeof entry === "object") {
      entry.appleArtistId = id; // 次回以降のために artists.json へ書き戻す
      dirty = true;
    }
  }
  if (!id) {
    misses.push(name);
    continue;
  }

  for (const album of await recentAlbums(id)) {
    const released = new Date(album.releaseDate);
    if (!(released >= since)) continue;
    if (!isHipHop(album.primaryGenreName)) continue;

    found.push({
      artist: album.artistName || name,
      title: album.collectionName,
      kind: album.trackCount === 1 ? "song" : "album",
      trackCount: album.trackCount,
      releaseDate: album.releaseDate.slice(0, 10),
      genre: album.primaryGenreName,
      catalogId: String(album.collectionId),
      catalogKind: "albums",
      url: album.collectionViewUrl || searchUrl(`${name} ${album.collectionName}`),
      added: false,
    });
  }

  await sleep(250); // iTunes API のレート制限（約20req/分）に配慮
}

found.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.artist.localeCompare(b.artist));

const prev = JSON.parse(await readFile(RELEASES_PATH, "utf8").catch(() => "{}"));
const out = {
  updated: new Date().toISOString(),
  week: `${since.toISOString().slice(0, 10)}/${new Date().toISOString().slice(0, 10)}`,
  storefront,
  releases: found,
  discover: Array.isArray(prev.discover) ? prev.discover : [],
};

await writeFile(RELEASES_PATH, JSON.stringify(out, null, 2) + "\n");
if (dirty) await writeFile(ARTISTS_PATH, JSON.stringify(artists, null, 2) + "\n");

console.log(`${found.length} 件の HIPHOP ニューリリース（直近 ${days} 日 / ${following.length} アーティスト）`);
for (const r of found) console.log(`  ${r.releaseDate}  ${r.artist} — ${r.title} [${r.kind}]`);
if (misses.length) console.log(`\nApple Music 上で特定できなかった名前: ${misses.join(", ")}`);

// ───────────────────────────── iTunes Search API ─────────────────────────────

async function resolveArtistId(name) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(name)}` +
              `&entity=musicArtist&limit=5&country=${storefront}`;
  const results = await getJson(url);
  // 完全一致を優先し、無ければ HIPHOP ジャンルの先頭を採る
  const exact = results.find((r) => (r.artistName || "").toLowerCase() === name.toLowerCase());
  const hit = exact || results.find((r) => isHipHop(r.primaryGenreName)) || results[0];
  return hit ? String(hit.artistId) : null;
}

async function recentAlbums(artistId) {
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(artistId)}` +
              `&entity=album&limit=20&sort=recent&country=${storefront}`;
  const results = await getJson(url);
  return results.filter((r) => r.wrapperType === "collection" && r.releaseDate);
}

async function getJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "hiphop-new-releases/1.0" } });
      if (res.status === 403) throw new Error("403 (レート制限の可能性)");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      return Array.isArray(body.results) ? body.results : [];
    } catch (err) {
      if (attempt === 2) {
        console.error(`  取得失敗 ${url}: ${err.message}`);
        return [];
      }
      await sleep(1000 * 2 ** attempt);
    }
  }
  return [];
}

// ───────────────────────────── 補助 ─────────────────────────────

function isHipHop(genre) {
  const g = String(genre || "").toLowerCase();
  return genreKeywords.some((k) => g.includes(k));
}

function searchUrl(term) {
  return `https://music.apple.com/${storefront}/search?term=${encodeURIComponent(term)}`;
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
