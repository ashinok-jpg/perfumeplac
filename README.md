# perfumeplac

香水を、ノート・濃度・1mlあたりの価格という事実だけで比べるサイト。runnersplac と同じ作り（Express + EJS）だが、コードもデータも完全に別。

## 動かす

```bash
npm install
npm start   # http://localhost:3400
```

## データの更新

1. `research/perfume-data.csv` を直す
   - ノートは `・` 区切り、容量は `30・100` のように ml の数字を `・` 区切り
   - 濃度は `パルファム` / `EDP` / `EDT` / `コロン` のどれか
   - `price` と `priceVolume`（その価格の容量 ml）を入れると 1ml あたりの価格が出る
   - `source`（公式ページの URL）と `checkedAt`（確認日）を両方入れると「確認済み」になる
2. `npm run build-data` で `data/perfumes.json` を作り直す
3. コミットして push する
