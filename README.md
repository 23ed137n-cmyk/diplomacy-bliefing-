# diplomacy-briefing

外交モーニング・ブリーフィングの見出しを表示する仕組み一式です。
毎朝のブリーフィング生成タスクが JSON を出力し、ブラウザ画面と
iPhone ウィジェットの両方がその JSON を読み込んで見出しを表示します。

## 構成

- `index.html` — `data.json` を読み込んで見出し一覧を表示するブラウザ画面
- `data.json` — 表示するデータ（`updated`, `url`, `items[]`）
- `gaiko-brief-widget.js` — Scriptable（iPhone）用ウィジェット。
  公開URL（GitHub Pages / Google Drive）またはローカルの `gaiko-brief.json` を読む
- `manifest.webmanifest` / `icon.svg` / `icon-192.png` / `icon-512.png` —
  PWA（アプリ化）用のマニフェストとアイコン。Windows で Edge の「アプリとして
  インストール」に使う
- ブリーフィング生成タスクは、本文作成後に同じスキーマの `gaiko-brief.json` を
  出力する。`data.json` はそのブラウザ確認用サンプル（両ファイルは同一内容で更新）

## 配信（GitHub Pages）と PC・iPhone ウィジェット

PC と iPhone の両方に「同じ1つの公開URL」を読ませるのが基本形。GitHub Pages で
このリポジトリを公開すると、ブラウザ画面もウィジェット用 JSON も同じ場所から配信できる。

### 1. GitHub Pages を有効化（配信元）

1. GitHub のリポジトリ → **Settings → Pages**。
2. **Source** を「Deploy from a branch」にし、Branch = 公開したいブランチ（`main` など）、
   フォルダ = **/(root)** を選んで Save。
   - まだ既定ブランチに取り込んでいない場合は、作業ブランチを `main` にマージしてから
     設定するのが簡単（または Pages の Branch に作業ブランチを直接指定してもよい）。
3. 数十秒〜数分で公開される。公開URLは:
   - 画面: `https://23ed137n-cmyk.github.io/diplomacy-bliefing-/`
   - データ: `https://23ed137n-cmyk.github.io/diplomacy-bliefing-/gaiko-brief.json`
4. 以降は `git push` するたびに自動更新（生成タスクが両 JSON を更新 → push）。

### 2. iPhone：ホーム画面ウィジェット（Scriptable）

1. iPhone に **Scriptable**（無料）をインストール。
2. `gaiko-brief-widget.js` の中身を新規スクリプトに貼り付け、名前を「外交速報」に。
   - 先頭の `SOURCE_URL` は上記 Pages URL を指定済み（Drive を使う場合のみ差し替え）。
3. ホーム画面を長押し → ＋ → **Scriptable** → 大サイズを配置 → ウィジェットを長押し →
   「ウィジェットを編集」→ Script に「外交速報」を指定。地域・タグ・優先度が反映される。

`SOURCE_URL` を空にすると iCloud Drive の Scriptable フォルダの `gaiko-brief.json` を読む
（Drive/Pages を使わない手動運用）。Drive を使う場合は
`https://drive.google.com/uc?export=download&id=【ファイルID】` を入れる。

### 3. Windows：ホーム画面（スタート／タスクバー）

Windows には自作Web内容の純正ウィジェット枠がないため、**Edge でページを「アプリ」として
インストール**して常駐させるのが最も手軽（画面は 30 分ごと＋復帰時に自動更新）。

1. Microsoft Edge で公開URL `https://23ed137n-cmyk.github.io/diplomacy-bliefing-/` を開く。
2. 右上「…」→ **アプリ → このサイトをアプリとしてインストール**。
3. インストール時に「タスクバーにピン留め」「スタートにピン留め」「起動時に開く」を選べる。
   スタートのタイルが実質のホーム画面ウィジェット代わりになり、1クリックで開ける。
4. よりデスクトップ常駐の“ウィジェット感”が欲しい場合は、Microsoft Store の
   「Widget Launcher」等、URL を表示できるデスクトップウィジェットアプリに上記URLを
   設定する方法もある（サードパーティ製）。

### `data.json` のスキーマ

```json
{
  "updated": "ISO8601 の更新時刻",
  "url": "任意の関連URL（未使用可）",
  "items": [
    {
      "region": "地域名",
      "tag": "分類タグ",
      "title": "見出し",
      "priority": true,
      "confidence": "高",
      "sourceName": "媒体名",
      "source": "https://出典URL"
    }
  ]
}
```

- `confidence` は信頼度タグ。`高`＝複数の主要紙・一次情報で日付含め一致／`中`＝
  単独ソースまたは当日以外・細部に幅／`低`＝未確認。ブラウザ画面では色付きバッジで表示。
- `source` は出典URL、`sourceName` は媒体名。ブラウザ画面の各見出し下に
  「出典: 媒体名」リンクとして表示されます（別タブで開く）。
- リサーチは各国主要紙・通信社と一次情報（政府・国際機関の発表）を優先。
  裏取りできない項目は掲載しない方針。
- **外務省（mofa.go.jp）は毎回必ず参照する**（会見記録・報道発表・談話・会談記録）。
  最低1件は外務省を出典に含める。詳しい生成ルールは `CLAUDE.md` を参照。

- `region` は見出しをまとめる地域区分。ブラウザ画面は次の順で地域ごとに
  セクション表示します（データに存在する地域だけ表示）。
  `日本 / ASEAN / 中国 / 朝鮮半島 / 西アジア / 中東 / 東アフリカ / 西アフリカ /
  西ヨーロッパ / 東ヨーロッパ / 北ヨーロッパ / 南ヨーロッパ / ロシア / アメリカ /
  北米 / 中南米 / 大洋州`。この一覧にない地域は末尾に、`region` 未指定は「その他」に入ります。
- `priority: true` の項目は各地域内で先頭に、強調表示（赤系）＋★付きで表示されます。
- `tag` は地域内の小分類（例：南シナ海、ウクライナ）。`region` はセクション見出しに使われます。

## Claude Code スキル（Agent Skills）

このリポジトリには [anthropics/skills](https://github.com/anthropics/skills) の
プラグインマーケットプレイス（`anthropic-agent-skills`）を `.claude/settings.json` で
登録済みです。Claude Code でこのフォルダを開くと、以下のプラグイン（全17スキル）が
利用可能になります。

- `document-skills` — `xlsx` / `docx` / `pptx` / `pdf`
- `example-skills` — `algorithmic-art` / `brand-guidelines` / `canvas-design` /
  `doc-coauthoring` / `frontend-design` / `internal-comms` / `mcp-builder` /
  `skill-creator` / `slack-gif-creator` / `theme-factory` /
  `web-artifacts-builder` / `webapp-testing`
- `claude-api` — `claude-api`

ターミナルの Claude Code CLI では `/plugin` でも管理できます。クラウド/Web セッションでは
`.claude/settings.json` の `enabledPlugins` で宣言する方式が公式に案内されており、
本リポジトリはその方式を採用しています。不要なプラグインは `enabledPlugins` から
該当行を削除すれば無効化できます。

## ローカルでの確認

`fetch` を使うため、ファイルを直接開くのではなくローカルサーバー経由で開いてください。

```sh
python3 -m http.server 8000
# ブラウザで http://localhost:8000/ を開く
```
