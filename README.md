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
    { "region": "地域名", "tag": "分類タグ", "title": "見出し", "priority": true }
  ]
}
```

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
