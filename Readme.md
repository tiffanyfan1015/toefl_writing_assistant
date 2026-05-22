# Writing Assistant for TOEFL

TOEFL Writing Assistant 是一個練習 TOEFL Writing 題型的全端專案。使用者可以建立 Email Response 與 Academic Discussion 題目，進入打字練習介面，送出後由 Gemini AI 依 TOEFL 評分標準給分、提供修改建議，並保留每次修改紀錄與文法/拼字/內容發展等錯誤分類。

## 功能

- 區分 `Email` 與 `Academic Discussion` 兩種 TOEFL Writing 題型
- 題目可手動新增，也可透過 Gemini AI 自動產生
- 題目列表支援刪除與進入練習
- 每題有獨立寫作介面、倒數計時、題目顯示區與字數統計
- 每次儲存後會建立 revision，保留歷史版本
- 使用 diff viewer 顯示目前文章與歷史版本的差異
- Gemini AI 依題型 rubric 評分並提供整體 feedback
- 錯誤紀錄頁會依主題分類：
  - Grammar and Spelling
  - Elaboration
  - Tone and Social Conventions
  - Adherence to Task

## 技術架構

### Frontend

- React
- TypeScript
- Vite
- React Router
- Axios
- Lucide React
- react-diff-viewer-continued

### Backend

- Node.js
- Express
- TypeScript
- Prisma
- SQLite
- Gemini API (`@google/generative-ai`)

## 專案結構

```text
writing_assistant/
  backend/
    prisma/
      schema.prisma
      seed.ts
    src/
      index.ts
      services/gemini.ts
    .env.example
    package.json
  frontend/
    src/
      pages/
        Dashboard.tsx
        Practice.tsx
        ErrorLogs.tsx
      api.ts
      index.css
    package.json
  spec.md
  Readme.md
```

## 環境需求

- Node.js
- npm
- Gemini API key

## 環境變數

先建立 backend 環境變數檔：

```bash
cd backend
cp .env.example .env
```

`backend/.env` 範例（各欄位說明見 `backend/.env.example`）：

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="YOUR-GEMINI-API-KEY-HERE"
API_KEY="your-local-api-key"
ALLOWED_ORIGIN="http://localhost:5173"
BIND_ADDRESS="127.0.0.1"
PORT=3001
GEMINI_MODEL="gemini-flash-latest"
```

### 產生本機 API key

`API_KEY` 需與前端的 `VITE_API_KEY` 相同。可在 backend 目錄用指令產生隨機 key：

```bash
cd backend
npm run generate-api-key
```

終端機會印出 key 與要寫入的 env 格式。若要**自動寫入** `backend/.env` 與 `frontend/.env`（已存在則只更新 `API_KEY` / `VITE_API_KEY` 那一行）：

```bash
npm run generate-api-key -- --write
```

若尚未建立 frontend 環境檔，請先複製範例再執行 `--write`，或手動貼上相同的 key：

```bash
cd frontend
cp .env.example .env
```

```env
VITE_API_KEY="<與 backend API_KEY 相同>"
```

Frontend 預設會呼叫同 hostname 的 `3001` port：

```text
http://<frontend-host>:3001/api
```

若需要指定 API endpoint，可在 frontend 設定：

```env
VITE_API_URL="http://localhost:3001/api"
```

## 安裝

分別安裝 backend 與 frontend dependencies：

```bash
cd backend
npm install
```

```bash
cd frontend
npm install
```

## 初始化資料庫

在 backend 目錄執行：

```bash
cd backend
npx prisma generate
npx prisma db push
```

如果要載入 seed data：

```bash
npx tsx prisma/seed.ts
```

## 啟動開發環境

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
npm run generate-api-key          # 印出隨機 API key
npm run generate-api-key -- --write  # 寫入 backend/.env 與 frontend/.env
npx prisma generate
npx prisma db push
npx prisma studio
```

## TOEFL 評分方向

系統會依題型使用不同評分重點。

Email Response 重點包含：

- 是否完成 email 任務要求
- 是否有足夠 elaboration
- 語氣、禮貌、register 與 email conventions 是否自然
- 文法、拼字、句構與用字是否穩定

Academic Discussion 重點包含：

- 是否回應教授問題
- 是否表達並支持自己的觀點
- 是否對討論有具體貢獻
- 是否有清楚的例子、解釋與細節
- 語言準確度與自然度

## 錯誤分類

AI feedback 會把修改建議分成下列主題（後端會正規化成固定字串）：

- `Grammar and Spelling`: 文法、拼字、標點、字形、時態、句構
- `Elaboration`: 例子、細節、論點發展與說明完整度
- `Tone and Social Conventions`: 禮貌、語氣、email 格式、討論禮儀
- `Idiomatic Word Choice`: 用字、搭配、慣用語與自然度
- `Relevance to Discussion`: 是否回應教授與同學的討論脈絡
- `Adherence to Task`: 是否漏答題目要求、離題或沒有回應 prompt

## 備註

- Gemini API key 只應放在 `backend/.env`，不要提交到版本控制。
- SQLite database 預設位於 backend Prisma 設定的 `dev.db`。
- 若 AI 產生或評分失敗，請先檢查 `GEMINI_API_KEY`、`GEMINI_MODEL` 與 backend console log。
