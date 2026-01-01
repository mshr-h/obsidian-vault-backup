# Vault スナップショット ZIP バックアッププラグイン

- plugin name: obsidian vault backup

**前提・制約**
- バックアップはローカル完結（保存先はユーザー指定のローカルフォルダ）。
- Vault全体を対象（hidden file/directory も含める）。
- スナップショット方式（実行時点の状態を1つのZIPにする）。
- 終了時バックアップはbest-effort。強制終了/クラッシュでは走らない。

**トリガー**
- 手動: コマンド「今すぐバックアップ」。
- 自動:
  - 起動時: 設定ロード後に `startupDelayMs`（設定可能な短い遅延）を待って実行。
  - 終了時: `onunload` で実行（完了保証なし）。

**ZIP生成（Atomic + temp運用）**
- 拡張子は `.zip` 固定。
- 保存先フォルダ内に temp を作る: `<finalName>.tmp.<randomSuffix>`
- ZIP書き込み完了後、temp→最終ファイル名へrename（同一フォルダ内でのrenameでatomic性を担保）。
- 成功/失敗どちらでも finally でtemp削除を試みる（削除失敗はログ/通知最小）。

**同時実行ポリシー**
- バックアップ中に再実行されたら拒否し、Notice表示（キューしない）。

**ファイル名テンプレート（Obsidian一般的記法）**
- ObsidianコアTemplates準拠: `{{var}}` / `{{var:FORMAT}}`（Moment.jsフォーマット）
- プレースホルダー（最低限）:
  - `{{vault}}`（Vault名、ファイル名として安全になるようサニタイズ）
  - `{{date}}` / `{{date:YYYY-MM-DD}}`
  - `{{time}}` / `{{time:HHmmss}}`
  - `{{datetime}}` / `{{datetime:YYYY-MM-DD_HHmmss}}`
- `.zip` は固定なのでテンプレに拡張子を含めても最終的には `.zip` になる（仕様として「zip固定」を優先）。

**世代管理（Retention）**
- 条件は2軸:
  - 「直近N個」保持
  - 「何日以内」保持
- AND/OR（両方満たす/いずれか満たす）はユーザーが設定。
- 対象範囲は「テンプレートに一致するファイル名のZIPのみ」＝自プラグイン生成分のみ。
- 実行タイミング: バックアップ成功後に世代管理を実行（失敗時は削除しない）。

**テンプレ→正規表現変換（一覧/世代管理の対象判定）**
- ユーザーのテンプレート文字列を正規表現へ変換して、保存先内のファイル名にマッチするものだけを対象にする。
- リテラル部分はescapeし、`{{vault}}`や`{{datetime:...}}`等の変数部分はワイルドカード（例: `.+?`）相当に置換する方針（厳密にFORMAT解釈はしない＝実装容易優先）。

**UI/コマンド**
- コマンド3つ:
  - 「今すぐバックアップ」：実行（リボンアイコンにも表示）
  - 「バックアップ先フォルダを開く」：保存先を開く
  - 「バックアップ一覧」：モーダルで一覧表示
- バックアップ一覧:
  - モーダルで、テンプレ一致のZIPのみを表示（＝自プラグイン生成分のみ）。

**設定項目（実装に落とす形）**
- `backupFolderPath: string`
- `filenameTemplate: string`
- `compressionLevel: number (0..9)`
- `runOnStartup: boolean`
- `startupDelayMs: number`
- `runOnShutdown: boolean`
- `retentionKeepLastN: number`
- `retentionKeepDays: number`
- `retentionMode: "keepLastN" | "keepDays" | "and" | "or"`（表現は実装都合で調整）