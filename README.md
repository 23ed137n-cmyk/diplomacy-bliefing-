# diplomacy-briefing

外交モーニング・ブリーフィングの見出しを表示する仕組み一式です。
毎朝のブリーフィング生成タスクが JSON を出力し、ブラウザ画面と
iPhone ウィジェットの両方がその JSON を読み込んで見出しを表示します。

## 構成

- `index.html` — `data.json` を読み込んで見出し一覧を表示するブラウザ画面
- `data.json` — 表示するデータ（`updated`, `url`, `items[]`）
- `gaiko-brief-widget.js` — Scriptable（iPhone）用ウィジェット。
  Google Drive の `gaiko-brief.json`（またはローカルの同名ファイル）を読む
- ブリーフィング生成タスクは、本文作成後に同じスキーマの `gaiko-brief.json` を
  出力する（Google Drive 上書き保存）。`data.json` はそのブラウザ確認用サンプル

## iPhone ウィジェットの設定（`gaiko-brief-widget.js`）

1. iPhone に Scriptable（無料）をインストールする。
2. `gaiko-brief-widget.js` の中身を新規スクリプトとして貼り付け、名前を「外交速報」にする。
3. Google Drive の `gaiko-brief.json` を「リンクを知っている全員が閲覧可」で共有し、
   共有URLからファイルIDを取り出して、スクリプト先頭の `SOURCE_URL` に次の形式で入れる。

   ```
   https://drive.google.com/uc?export=download&id=【ファイルID】
   ```

4. ホーム画面を長押し → ＋ → Scriptable → 大サイズを配置 → ウィジェットを長押しして
   「ウィジェットを編集」→ Script に「外交速報」を指定する。

`SOURCE_URL` を空にした場合は、iCloud Drive の Scriptable フォルダに置いた
`gaiko-brief.json` を読む（手動運用・Drive を使わない場合）。

### `data.json` のスキーマ

```json
{
  "updated": "ISO8601 の更新時刻",
  "url": "任意の関連URL（未使用可）",
  "items": [
    { "tag": "分類タグ", "title": "見出し", "priority": true }
  ]
}
```

- `priority: true` の項目は一覧の先頭に、強調表示（赤系）＋★付きで表示されます。
- それ以外は元の並び順を保って表示されます。

## ローカルでの確認

`fetch` を使うため、ファイルを直接開くのではなくローカルサーバー経由で開いてください。

```sh
python3 -m http.server 8000
# ブラウザで http://localhost:8000/ を開く
```

---

# hiphop — Apple Music の HIPHOP ニューリリース

毎週日曜に、Apple Music でフォロー中のラッパーの新譜を拾い、
未フォローのラッパーを2人だけ紹介する仕組みです。外交ブリーフィングと同じく
「生成タスクが JSON を出す → ブラウザ画面と iPhone ウィジェットが読む」構成です。

## 構成

- `hiphop/artists.json` — フォロー中アーティスト（手で維持）と、紹介済みラッパーの履歴
- `hiphop/releases.json` — 週次の出力（`releases[]` = 新譜、`discover[]` = 今週の2人）
- `hiphop/index.html` — `releases.json` を読んで一覧表示するブラウザ画面
- `hiphop/hiphop-widget.js` — Scriptable（iPhone）用ウィジェット
- `hiphop/fetch-releases.mjs` — iTunes Search API で新譜を拾って `releases.json` を書く
- `hiphop/add-to-library.mjs` — 拾った新譜を Apple Music のライブラリに追加する
- `hiphop/token-helper.html` — Music User Token を取るための補助ページ

## 前提：Apple Music の制約

- **フォロー一覧は API で取れません。** Apple はフォロー中アーティストの取得を
  公開 API にしていないため、`artists.json` の `following[]` は手で維持します。
  Apple Music アプリでフォローを増やしたら、ここにも足してください。
- **ライブラリへの追加には本人のトークンが要ります。** Apple Music API の
  `POST /v1/me/library` は Developer Token と Music User Token を要求するため、
  ライブラリ追加だけは手元の環境で実行する必要があります。
- **生成タスクの実行環境からは Apple のドメインに出られません。** そのため
  `fetch-releases.mjs` と `add-to-library.mjs` は手元の Mac / iPhone で走らせます。
  週次タスク側は Web 検索で新譜を調べて `releases.json` に書き込みます。

## 1. フォロー中アーティストを登録する

`hiphop/artists.json` の `following[]` に名前を並べます。`appleArtistId` は
省略可で、初回実行時に名前から解決して書き戻されます。

```json
{
  "storefront": "jp",
  "following": [
    { "name": "Kendrick Lamar" },
    { "name": "JJJ" }
  ],
  "introduced": []
}
```

`introduced[]` には紹介済みのラッパー名が積まれます。週次の「今週の2人」は
ここに載っている名前を避けて選ばれるので、同じ人が繰り返し出ません。

## 2. 新譜を拾う

```sh
node hiphop/fetch-releases.mjs            # 直近7日
node hiphop/fetch-releases.mjs --days 14  # 期間を変える
```

認証不要の iTunes Search API を使い、`genreKeywords` に一致するジャンル
（既定は Hip-Hop / Rap）のリリースだけを `releases.json` に書き出します。

## 3. ライブラリへ自動追加する

Apple Developer Program（有料）の MusicKit キーが必要です。

1. Apple Developer で MusicKit の秘密鍵（`.p8`）、Key ID、Team ID を用意する
2. その鍵で ES256 の JWT（Developer Token）を作る
3. `hiphop/token-helper.html` をローカルサーバー経由で開き、Developer Token を貼って
   Apple ID で認可し、表示された Music User Token を控える
4. 環境変数に入れて実行する

```sh
export APPLE_MUSIC_DEV_TOKEN=...
export APPLE_MUSIC_USER_TOKEN=...
node hiphop/add-to-library.mjs --dry-run   # 何が追加されるか確認
node hiphop/add-to-library.mjs             # 実行
```

追加できたものは `releases.json` の `added` が `true` になるので、再実行しても
二重には追加されません。Music User Token の有効期限はおおよそ半年です。

Developer Program を使わない場合は、`index.html` かウィジェットの各項目を
タップして Apple Music を開き、「＋」で追加してください。

## 4. iPhone ウィジェットの設定（`hiphop/hiphop-widget.js`）

1. `hiphop/hiphop-widget.js` の中身を Scriptable の新規スクリプトに貼り、
   名前を「NEW HIPHOP」にする。
2. `releases.json` を Google Drive に「リンクを知っている全員が閲覧可」で共有し、
   共有URLのファイルIDを使って先頭の `SOURCE_URL` を設定する。

   ```
   https://drive.google.com/uc?export=download&id=【ファイルID】
   ```

3. `SOURCE_URL` を空にした場合は、iCloud Drive の Scriptable フォルダに置いた
   `hiphop-releases.json` を読みます。
4. ホーム画面を長押し → ＋ → Scriptable → 大サイズを配置 → ウィジェットを長押しして
   「ウィジェットを編集」→ Script に「NEW HIPHOP」を指定する。

`releases.json` の `url` に一覧ページのURLを入れておくと、ウィジェットのタップで
そこへ飛べます。

### `releases.json` のスキーマ

```json
{
  "updated": "ISO8601 の更新時刻",
  "week": "YYYY-MM-DD/YYYY-MM-DD（対象期間）",
  "storefront": "jp",
  "url": "一覧ページのURL（任意）",
  "releases": [
    {
      "artist": "アーティスト名",
      "title": "アルバム／曲名",
      "kind": "album | song",
      "releaseDate": "YYYY-MM-DD",
      "catalogId": "Apple Music のカタログID",
      "catalogKind": "albums | songs",
      "url": "https://music.apple.com/...",
      "added": false
    }
  ],
  "discover": [
    {
      "name": "ラッパー名",
      "origin": "出身地",
      "why": "なぜ聴くべきか",
      "startWith": "まずこの1曲",
      "url": "https://music.apple.com/..."
    }
  ]
}
```

- `added: true` の項目は緑の印と「✓ 追加済み」で表示されます。
- `discover[]` は毎週2人だけ。フォローしていないラッパーから選びます。

## ローカルでの確認

```sh
python3 -m http.server 8000
# ブラウザで http://localhost:8000/hiphop/ を開く
```
