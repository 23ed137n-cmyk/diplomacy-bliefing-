#!/usr/bin/env node
// hiphop/add-to-library.mjs
//
// releases.json に並んだニューリリースを Apple Music のライブラリへ追加する。
// Apple Music API の POST /v1/me/library を叩くので、次の2つが要る:
//
//   APPLE_MUSIC_DEV_TOKEN   Apple Developer Program の MusicKit キー(.p8)から作る JWT
//   APPLE_MUSIC_USER_TOKEN  hiphop/token-helper.html で Apple ID 認可して取る Music User Token
//
//   export APPLE_MUSIC_DEV_TOKEN=...
//   export APPLE_MUSIC_USER_TOKEN=...
//   node hiphop/add-to-library.mjs           # 追加を実行
//   node hiphop/add-to-library.mjs --dry-run # 何を追加するか見るだけ
//
// 追加できたものは releases.json の added を true にするので、再実行しても二重に追加しない。

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RELEASES_PATH = join(HERE, "releases.json");

const dryRun = process.argv.includes("--dry-run");
const devToken = process.env.APPLE_MUSIC_DEV_TOKEN;
const userToken = process.env.APPLE_MUSIC_USER_TOKEN;

if (!dryRun && (!devToken || !userToken)) {
  console.error(
    "APPLE_MUSIC_DEV_TOKEN と APPLE_MUSIC_USER_TOKEN を環境変数に設定してください。\n" +
    "（取り方は README の「ライブラリへ自動追加する」を参照）"
  );
  process.exit(1);
}

const data = JSON.parse(await readFile(RELEASES_PATH, "utf8"));
const pending = (data.releases || []).filter((r) => !r.added && r.catalogId);

if (pending.length === 0) {
  console.log("追加待ちのリリースはありません。");
  process.exit(0);
}

// catalogKind ごと（albums / songs）にまとめて1リクエストで投げる
const byKind = new Map();
for (const r of pending) {
  const kind = r.catalogKind || "albums";
  if (!byKind.has(kind)) byKind.set(kind, []);
  byKind.get(kind).push(r);
}

if (dryRun) {
  console.log(`追加対象 ${pending.length} 件（--dry-run のため実行しません）:`);
  for (const r of pending) console.log(`  [${r.catalogKind}] ${r.artist} — ${r.title}`);
  process.exit(0);
}

let addedCount = 0;

for (const [kind, items] of byKind) {
  // Apple Music API は ids[...] を一度に多数受け付けるが、安全のため25件ずつ
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    const ids = chunk.map((r) => r.catalogId).join(",");
    const url = `https://api.music.apple.com/v1/me/library?ids[${kind}]=${encodeURIComponent(ids)}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${devToken}`,
          "Music-User-Token": userToken,
        },
      });

      // 追加成功は 202 Accepted（本文なし）
      if (res.status === 202 || res.ok) {
        for (const r of chunk) {
          r.added = true;
          console.log(`  追加: ${r.artist} — ${r.title}`);
          addedCount++;
        }
      } else {
        const body = await res.text().catch(() => "");
        console.error(`  失敗 (HTTP ${res.status}) ${kind}: ${body.slice(0, 300)}`);
        if (res.status === 401 || res.status === 403) {
          console.error("  → トークンの期限切れ、または権限不足です。token-helper.html で取り直してください。");
        }
      }
    } catch (err) {
      console.error(`  通信失敗 ${kind}: ${err.message}`);
    }
  }
}

if (addedCount > 0) {
  await writeFile(RELEASES_PATH, JSON.stringify(data, null, 2) + "\n");
}
console.log(`\n${addedCount} / ${pending.length} 件をライブラリに追加しました。`);
