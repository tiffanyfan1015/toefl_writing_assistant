# TOEFL Assistant: Writing & Speaking

**TOEFL Assistant** is an AI-powered prep platform designed for TOEFL candidates. Integrated with Google’s Gemini AI, the platform automates question generation, delivers a seamless practice environment, and provides instant, AI-driven scoring and actionable feedback.

Currently, the platform supports two core modules: Writing (including Email and Academic Discussion) and Speaking (Interview format).

## 核心功能

### ✍️ TOEFL Writing
- **雙題型支援**：`Email Response` 與 `Academic Discussion`。
- **AI 自動命題**：可手動輸入題目，或由 Gemini 產生符合 TOEFL 難度的模擬題。
- **寫作實驗室**：提供打字練習區、倒數計時、字數統計及即時草稿存檔。
- **深度評分**：Gemini 依官方 Rubric 給分（0.5 分級），提供整體回饋並標記語法、內容發展等錯誤。
- **版本對比**：保留每次寫作紀錄 (Revisions)，並使用 Diff Viewer 顯示修改差異。

### 🎙️ TOEFL Speaking (Interview)
- **模擬口說面試**：AI 產生包含 Introduction 與 4 個延伸問題的連續面試題目。
- **語音互動**：系統自動透過 TTS (Text-to-Speech) 讀取 AI 考官題目。
- **即時錄音與轉錄**：支援瀏覽器錄音，並由 AI 自動將語音轉為文字 (Transcription)。
- **口說診斷**：針對 Pronunciation, Fluency, Grammar, Elaboration 等維度進行分析。
- **歷史紀錄**：可回聽錄音檔、查看 AI 評分與改進建議。

## 技術架構

### Frontend
- **Framework**: React (TypeScript) + Vite
- **Routing**: React Router 7
- **Icons**: Lucide React
- **HTTP**: Axios (封裝帶有 Authorization 驗證與模型切換攔截器)
- **UI Components**: Vanilla CSS (現代化卡片式設計)

### Backend
- **Runtime**: Node.js (Express)
- **Language**: TypeScript (tsx)
- **Database**: Prisma + SQLite
- **AI Engine**: Google Gemini API (`@google/generative-ai`)
- **Validation**: Zod (嚴格校驗 AI 回傳之 JSON 格式)

## 專案結構

```text
writing_assistant/
  backend/
    prisma/schema.prisma     # 資料庫模型 (Writing + Speaking)
    src/index.ts             # API 路由與驗證中介軟體
    src/services/gemini.ts   # Gemini AI 核心邏輯 (Zod, Timeout, Prompt)
    scripts/                 # API Key 產生工具
    uploads/speaking/        # 使用者口說錄音存檔 (.webm)
  frontend/
    src/api.ts               # API 請求封裝
    src/pages/               # 頁面組件 (包含 Speaking 系列)
    src/types.ts             # 統一型別定義
```

## 環境需求
- Node.js (建議 v18 以上)
- npm
- Google Gemini API Key (可至 [Google AI Studio](https://aistudio.google.com/apikey) 申請)

## 快速開始

### 1. 設定環境變數

後端設定 (`backend/.env`)：
```bash
cd backend
cp .env.example .env
```
使用工具產生 API 通行證：
```bash
npm run gen-api-key -- --write
```
*這會自動在 `.env` 中填入 `API_KEY`。  
記得手動填入你的 `GEMINI_API_KEY`。*

`backend/.env` 範例：

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="YOUR-GEMINI-API-KEY-HERE"
API_KEY="your-local-api-key"
ALLOWED_ORIGIN="http://localhost:5173"
BIND_ADDRESS="127.0.0.1"
PORT=3001
GEMINI_MODEL="gemini-flash-latest"
GEMINI_MODEL_OPTIONS="gemini-flash-latest,gemini-3.1-flash-lite"
```

前端設定 (`frontend/.env`)：
```bash
cd frontend
cp .env.example .env
```
```env
VITE_API_KEY="your-local-api-key"
```
*請確保 `VITE_API_KEY` 與後端的 `API_KEY` 完全一致。*

Frontend 預設會呼叫同 hostname 的 `3001` port：

```text
http://<frontend-host>:3001/api
```

若需要指定 API endpoint，可在 frontend 設定：

```env
VITE_API_URL="http://localhost:3001/api"
```

### 2. 安裝與啟動

安裝依賴：
```bash
# 後端
cd backend && npm install
# 前端
cd frontend && npm install
```

初始化資料庫：
```bash
cd backend
npx prisma generate
npx prisma db push
```

如果要載入 seed data：

```bash
npx tsx prisma/seed.ts
```

啟動 backend：

```bash
cd backend
npm run dev
```

預設 API server：

```text
http://localhost:3001
```
啟動 frontend：

```bash
cd frontend
npm run dev
```

Vite 會顯示可用的本機網址，通常是：

```text
http://localhost:5173
```

## 常用指令

Frontend：

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Backend：

```bash
npm run dev
npx prisma generate
npx prisma db push
npx prisma studio
```

- `npm run gen-api-key`: 產生前後端通訊金鑰。
- `npm test`: 執行 Vitest 測試（後端含 Gemini 邏輯測試）。
- `npx prisma studio`: 可視化管理資料庫內容。


## 評分標準與錯誤分類

### Writing 錯誤分類
- `Grammar and Spelling`: 文法、拼字、時態、句構。
- `Elaboration`: 例子、細節、論點發展與說明完整度
- `Tone and Social Conventions`: 禮貌、語氣、email 格式、討論禮儀
- `Idiomatic Word Choice`: 用字自然度與慣用語。
- `Relevance to Discussion`: 是否回應教授與同學的討論脈絡
- `Adherence to Task`: 是否漏答題目要求、離題或沒有回應 prompt

### Speaking 錯誤分類
- `Pronunciation and Intelligibility`: 發音清晰度。
- `Fluency and Pausing`: 流暢度與停頓。
- `Rhythm and Intonation`: 語調與節奏。
- `Grammar and Word Choice`: 口說文法與選字。
- `Elaboration`: 內容深度。

## API 安全性
所有 API 請求均受 `requireApiKey` 保護，必須在 Header 帶上：
`Authorization: Bearer <API_KEY>`

系統支援在前端切換 Gemini 模型（Flash/Pro），透過 `X-Gemini-Model` Header 傳遞給後端。

## HTTP API

所有 `/api/*` 路由都需要 header：

```http
Authorization: Bearer <API_KEY>
```

`API_KEY` 需與 frontend 的 `VITE_API_KEY` 相同。

### `GET /api/questions`

列出所有題目（新到舊）。

**Response `200`:** `Question[]`

```json
{
  "id": 1,
  "type": "Email",
  "title": "...",
  "content": "...",
  "createdAt": "..."
}
```

### `GET /api/questions/:id`

取得單一題目。

**Response `200`:** `Question`  
**Response `404`:** `{ "error": "Question not found" }`

### `POST /api/questions`

建立題目；可手動輸入或由 Gemini 自動產生。

**Body:**

```json
{
  "type": "Email",
  "title": "Optional title",
  "content": "Optional prompt",
  "autoGenerate": false
}
```

- `type`: `"Email"` 或 `"Academic"`
- `autoGenerate: true` 時會忽略 `title` / `content`，改由 AI 填入

**Response `200`:** `Question`

### `DELETE /api/questions/:id`

刪除題目及其 submission、revision、error log（transaction）。

**Response `200`:** `{ "success": true }`

### `GET /api/questions/:id/latest-submission`

取得該題最新 submission（含 revisions 與 error logs）。

**Response `200`:** submission 物件（含 `revisions[]`，每個 revision 含 `errorLogs[]`）  
**Response `404`:** `{ "error": "No submission found" }`

### `POST /api/submissions`

儲存並評分作文；每題僅一筆 submission（upsert）。

**Body:**

```json
{
  "questionId": 1,
  "text": "Essay body..."
}
```

- `text` 必填，最長 10000 字元

**Response `200`:**

```json
{
  "submission": {
    "id": 1,
    "questionId": 1,
    "currentText": "...",
    "revisions": []
  },
  "evaluation": { "score": 4, "feedback": "...", "errors": [] },
  "evaluationFailed": false
}
```

當 Gemini 評分失敗時，文章仍會儲存，且 `evaluationFailed` 為 `true`（`evaluation` 可能為 `null`）。

### `GET /api/error-logs`

列出所有錯誤紀錄（含 revision → submission → question）。

**Response `200`:** error log 陣列；每筆含 `errorType`、`incorrect`、`suggestion`、`explanation`、`important`、`createdAt`。

### `PATCH /api/error-logs/:id/important`

標記或取消「重要」星號。

**Body:** `{ "important": true }`  
**Response `200`:** 更新後的 error log

## 備註

- Gemini API key 只應放在 `backend/.env`，不要提交到版本控制。
- SQLite database 預設位於 backend Prisma 設定的 `dev.db`。
- 若 AI 產生或評分失敗，請先檢查 `GEMINI_API_KEY`、`GEMINI_MODEL` 與 backend console log。
