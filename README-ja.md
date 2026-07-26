# claude-session-limit-breaker

[English](README.md) | **日本語**

日本時間の **3:00 / 8:10 / 13:20 / 18:30**（デフォルト）に `claude -p` を実行し、ランダムな軽いタスクを1つ投げるだけのスクリプトです。[Purus](https://purus.work)で書かれており、Linux上でpm2による常時起動を想定しています。

内部の仕組み（スケジューリング・limit検知・i18nなど）は[CONTRIBUTING.md](CONTRIBUTING.md)（英語）を参照してください。

## 必要なもの

- Node.js 22以上（[Purus](https://purus.work)コンパイラの要件）
- [Claude Code CLI](https://code.claude.com/docs/ja/quickstart) がインストール済み・ログイン済みであること（pm2を動かすユーザーで）

## セットアップ

```bash
git clone <このリポジトリ>
cd claude-session-limit-breaker
npm install
```

## 実行

```bash
npm start        # フォアグラウンド実行、Ctrl+Cで終了
```

### pm2での常時起動

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup       # 表示されたsudoコマンドを実行するとOS起動時に自動起動
```

```bash
pm2 logs claude-session-limit-breaker
pm2 restart claude-session-limit-breaker
pm2 stop claude-session-limit-breaker
```

## 設定

[src/main.purus](src/main.purus)冒頭の`CONFIG`にすべてまとまっています。編集して保存するだけで反映されます（ビルド不要。稼働中のプロセスは再起動してください）。

```
const CONFIG be [
  times be [[3, 0], [8, 10], [13, 20], [18, 30]], -- [時, 分] の配列
  timezone be //;Asia/Tokyo;//,
  model be //;haiku;//,
  tasksFile be //;tasks.yaml;//,
  discordWebhook be process.env.DISCORD_WEBHOOK,
  lang be detect-lang[]
]
```

### タスク

[tasks.yaml](tasks.yaml)を編集してください。YAMLのフラットなリスト（1行1タスク、`#`コメント可）:

```yaml
- 好きなタスクをここに1行ずつ追加
- もう1つタスクを追加
```

### Discord通知（任意）

1. Discordのチャンネル設定 > 連携サービス > ウェブフック から新しいウェブフックを作成
2. `cp .env.example .env` し、`DISCORD_WEBHOOK`にそのURLを設定

未設定のままでも通知処理は自動的にスキップされ、動作に支障はありません。

### 表示言語

ログ・Discord通知の言語はデフォルトで`en`（英語）です。`.env`に`LANG=ja`を設定すると日本語になります。OS側で`LANG`が既に設定されていても、プロジェクトの`.env`が優先されます。

## ライセンス

[WTFPL](LICENSE)
