# TOEFL Speaking 功能計畫

## Summary
新增一個獨立的 speaking 模組，和現有 writing 完全分開。speaking 只需要把題目文字「唸出來」即可，不需要把題目音檔長期保存，因此採用最簡單的瀏覽器 `speechSynthesis` 朗讀方案。

## Key Changes
- 導覽與頁面結構
  - 新增獨立的 speaking 首頁，和原本 writing 首頁並列。
  - writing 與 speaking 的題庫、練習頁、歷史紀錄、錯誤紀錄完全分開，不共用同一頁。
  - 新增兩個完全獨立的 Error Log 頁面：
    - Writing Error Log
    - Speaking Error Log

- Speaking 題庫
  - 題目結構固定為：
    - `title`
    - `introduction`
    - `question1`
    - `question2`
    - `question3`
    - `question4`
  - 題目可以手動輸入，也可以 AI 生成。
  - 題目列表支援新增、刪除、進入詳情。
  - 刪除前要跳確認視窗。

- Practice All 流程
  - 以單一完整練習流程實作。
  - 順序固定為：
    - Introduction
    - Question 1
    - Question 2
    - Question 3
    - Question 4
  - 每一段都會先朗讀題目文字。
  - 朗讀使用瀏覽器 `speechSynthesis`，不另外產生或保存音檔。
  - Speaking 題目不需要真的保存成音檔，只要進入練習時能唸出來即可。
  - 題目唸完後：
    - Introduction：直接進下一段
    - Questions 1 to 4：開始 45 秒錄音
    - 45 秒結束後自動停止
    - 等 1 秒後自動切到下一段

- 作答與檢視
  - 每次 speaking 作答都保留紀錄。
  - 每筆紀錄要保存：
    - 原始錄音
    - 轉寫文字
    - AI 評分
    - AI feedback
    - 錯誤清單
  - 題目詳情頁顯示歷史作答紀錄。
  - 每一題都能單獨重新作答、重新轉寫、重新評分。
  - 檢視頁要能播放作答錄音與查看轉寫文字。

- Error Log 分流
  - Writing 與 Speaking 的錯誤紀錄完全分頁，不共用同一個列表頁。
  - Writing Error Log 維持原本的錯誤分類與顯示方式。
  - Speaking Error Log 使用 speaking 專屬分類，重點放在：
    - Pronunciation / Intelligibility
    - Fluency / Pausing
    - Rhythm / Intonation
    - Grammar / Word Choice
    - Task Relevance / Content Development
  - 兩個頁面都保留重要標記、篩選與瀏覽功能，但資料來源獨立。

- Backend / Data Model
  - 新增 speaking 題庫與 speaking attempts 的資料表。
  - speaking 的錄音、轉寫、評分、錯誤紀錄使用獨立資料關聯。
  - 與 writing 既有 schema 共存，不破壞原本寫作功能。
  - speaking 題目播放不需要後端 TTS 或音檔儲存，因此不新增題目音檔持久化流程。

## Implementation Notes
- `speechSynthesis` 是最簡單的題目朗讀方案。
  - 優點：不用額外後端服務，不需要保存音檔，實作快。
  - 缺點：不同瀏覽器聲音與語速可能略有差異，但對「只要唸出來」的需求已足夠。
- 不使用 Web Speech API 的錄音轉寫能力作為主方案。
  - 題目播放只用 synthesis。
  - 使用者作答的錄音與轉寫仍由後端處理，以保持評分與歷史一致性。
- 現有 writing flow 不變，只在導覽與資料層旁邊新增 speaking 模組。

## Test Plan
- 能從首頁清楚進入 writing / speaking 兩個獨立模組。
- Speaking 題庫可以新增、刪除、進入詳情。
- Practice All 能依序朗讀五段內容，並在 question 段落自動錄音 45 秒。
- 45 秒後會自動停止錄音並在 1 秒後進入下一段。
- Speaking 作答可以保存歷史、轉寫、評分與錯誤紀錄。
- Writing Error Log 與 Speaking Error Log 彼此完全獨立。
- 原本 writing 題庫、作答、error log 不受影響。

## Assumptions
- 題目文字只需要「唸出來」，不需要保存成可重播的題目音檔。
- 題目朗讀採用瀏覽器 `speechSynthesis`，不另外串接後端 TTS。
- speaking 的作答錄音仍然會保存，因為歷史檢視、轉寫與重新評分需要它。
- speaking 與 writing 的錯誤紀錄資料結構和頁面都分開處理，避免混在同一個 error log 中。
