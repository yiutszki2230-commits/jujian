# 句間 — 每日書寫與思考

每日留下一小段文字，在句與句之間重新養回文筆，也讀懂自己思考的理由。

## 已有功能

- 每日書寫、標題、即時字數、小目標、專注模式、自動儲存。
- 議題圖書館：16 個起始議題 / 俗語、自訂、編輯、刪除、收藏、搜尋、分類、還未寫過篩選及隨機選題。
- 選新題目時會保留原有文章與草稿，不會覆蓋。題目會保存當時的文字，日後修改題目不影響舊文章。
- 自我提問式思考拆解：立場、理由、假設、反例、價值、修正；可選擇填寫，沒有評分。
- 文集、草稿、全文搜尋、最近七天寫作紀錄。
- 透過系統分享選單到備忘錄、複製 Notion 版本、下載 Markdown / 純文字。
- 明體 / 黑體、正文字號、行距、書寫頁寬、動畫開關；響應式手機介面。
- 完整 JSON 備份 / 合併 / 還原；iPhone 加入主畫面及首次完整載入後離線使用。

## 資料與使用範圍

資料只儲存在裝置目前瀏覽器的 localStorage。沒有帳號、伺服器資料庫、自動跨裝置同步、AI 服務或 API key。思考拆解是自我引導，不會自動推斷人格或評分。

同一網站在不同瀏覽器、裝置、Safari 主畫面 App 或更換網址後，可能有不同的儲存空間。請到「閱讀與設定」下載完整備份，在目標裝置匯入。清除網站資料或無痕模式結束，可能會移除本機文字。請定期備份。

備忘錄：iPhone 文章匯出 → 分享至備忘錄 → 系統選單內選備忘錄 → 儲存。如果系統分享不可用，會提供複製全文。App 不能在無需使用者操作的情況下寫入 Apple Notes。

Notion：手機先複製貼上，Markdown 的標題標記可能需要手動轉成區塊；若要保留標題層級，下載 .md 後在 Notion 電腦 / 網頁版的 Settings → Import → Text & Markdown 匯入。這是手動匯出流程，並非 Notion API 同步。

匯入 JSON 支援「合併」或「完整還原」。合併時相同編號取修改時間較新的文章，自訂議題相同編號保留本機版本，收藏取聯集；不同編號不以標題去重。完整還原會替換所有本機內容及閱讀設定，操作前建議下載目前備份。

## 上傳到 GitHub Pages（不需要安裝工具）

1. 在 GitHub 建立一個 repository，例如 `jujian`。GitHub Free 通常使用公開 repository 承載 Pages；公開的只應是程式檔，不要上傳個人文章或備份。
2. 使用本專案提供的 GitHub Package ZIP。先解壓，把內部所有檔案直接上傳到 repository 根目錄，不要多包一層資料夾。
3. 在 repository 的 Settings → Pages → Build and deployment，Source 選 Deploy from a branch，Branch 選 main，Folder 選 / (root)，然後 Save。
4. 等待 GitHub 完成發布，在 Pages 頁面打開提供的網址。
5. iPhone Safari 打開網址 → 分享 → 加入主畫面。第一次完整開啟後再測試飛行模式。

所有路徑均為相對路徑，可用於 `https://用戶名.github.io/jujian/` 這類子路徑。若直接使用 source repository，網站檔案位於 `dist/`，可以把 `dist/` 內容複製到發布根目錄，或自行設定 Pages workflow。

## 開發與驗證

原始碼都在 `dist/`，無需安裝依賴或執行建置。用任何靜態 HTTP server 提供此資料夾，不建議直接以 file:// 開啟 ES modules。

```sh
npm run check
npm test
python3 -m http.server 8000 --directory dist
```

Service Worker 的離線功能需 HTTPS 或 localhost；更新版本時請調整 `dist/sw.js` 內的 cache version。新版會透過網絡優先方式取得靜態檔案。

## 驗證紀錄

- JavaScript 語法檢查通過，6 項核心測試通過，涵蓋字數、文字匯出、備份驗證、資料合併、閱讀設定與跨月寫作紀錄。
- 已用瀏覽器驗證：撰寫與重載後保存、收進文集、思考拆解、自訂議題新增與搜尋、選新題目後保留舊文章。
- 手機版以 390px 外框驗證，實際內容區 375px，未出現橫向溢出。
- Markdown / 純文字匯出內容已測試，瀏覽器已顯示有效下載連結；遠端測試瀏覽器未回傳下載完成事件，未把這項視為實機下載驗收。
- 尚未實機驗證 iPhone 系統分享、主畫面安裝、離線模式及 Notion App 貼上後的排版。

## 官方參考（核對於 2026-11-02）

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Notion 匯入資料](https://www.notion.com/help/import-data-into-notion)
- [Apple：匯入與分享到備忘錄](https://support.apple.com/en-us/102223)

## 後續可增加

如果想要 AI 追問或自動整理論證，需要另外決定模型、費用及資料傳送方式。若要直接寫入 Notion，則需要授權並加入安全的後端，不能把 Notion token 放在公開前端檔案內。
