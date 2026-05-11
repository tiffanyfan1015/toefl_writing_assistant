# TOEFL 寫作小幫手實作計畫

## 目標
建立一個網頁版的 TOEFL 寫作輔助平台，支援兩種題型（Email 和 Academic Discussion）。此平台將允許使用者練習寫作、透過 Google Gemini API 獲得 AI 產生的評分與文法回饋、使用類似 Git 的差異比對介面追蹤歷次修改，並維護一個集中的文法與拼字錯誤紀錄。

## 技術堆疊
*   **前端:** 採用 Vite 建置的 React (TypeScript)
*   **後端:** Node.js (Express)
*   **資料庫:** SQLite (使用 Prisma ORM，方便本地開發與單機使用)
*   **AI 整合:** Google Gemini API
*   **使用者驗證:** 單一使用者 (不需要複雜的登入系統)

## 核心功能與範圍
... (中略) ...

## 實作步驟

### 第一階段：環境建置與資料庫設計
*   使用 Vite 初始化前端應用程式 (React TS)。
*   初始化 Node.js Express 後端專案。
*   使用 Prisma 設定 SQLite 資料庫連線。
*   **資料庫 Schema 設計:**
    *   `Question` (id, 題型, 題目內容, 建立時間)
    *   `Submission` (id, question_id, 目前文章內容, 最新評分, 建立時間, 更新時間)
    *   `SubmissionRevision` (id, submission_id, 文章內容, 評分, 建立時間) - *用於差異比對追蹤*
    *   `ErrorLog` (id, submission_id, 錯誤類型, 錯誤文字, 建議修改, 解釋)

... (其餘步驟與之前相同) ...