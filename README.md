# diplomacy-briefing

外交ブリーフィングの見出しを表示するシンプルな静的サイトです。

## 構成

- `index.html` — `data.json` を読み込んで見出し一覧を表示する画面
- `data.json` — 表示するデータ（`updated`, `url`, `items[]`）

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
