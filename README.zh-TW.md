# Pedigree Draw

[English](README.md) | **繁體中文**

專為遺傳諮詢師和生物資訊專業人員設計的 Pedigree（家族樹）繪圖工具。

## ☕ 支持這個專案

如果您覺得這個家譜繪圖工具對您的研究、教學或臨床工作有幫助，歡迎支持它的開發。

<a href="https://buymeacoffee.com/gbanyan" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

👉 請我喝杯咖啡：https://buymeacoffee.com/gbanyan

## 線上 Demo

https://gbanyan.github.io/pedigree-draw/

## 動機與背景

本專案由一位患有 Usher syndrome 的作者所建立。

建立此工具的動機是為了支援遺傳學、系譜學和 Bioinformatics 領域的研究，
並探索視覺化工具如何幫助理解遺傳性疾病。

作者明確支持與 Usher syndrome 及其他遺傳疾病相關的研究，
並希望此專案能以某種方式為 Bioinformatics 研究社群做出貢獻。

## 功能特色

- 匯入/匯出 GATK PED 檔案
- 互動式網頁編輯器
- 支援標準 Pedigree 符號（NSGC 標準）
- 匯出為 SVG、PNG 或 PED 格式
- 完整 Pedigree 功能：Affected/Unaffected/Carrier 狀態、雙胞胎、近親婚配、領養標記等

---

## 快速開始

### 前置需求

您的電腦需要安裝 **Node.js**（版本 18 或更高）。

#### 檢查 Node.js 是否已安裝：

```bash
node --version
npm --version
```

如果兩個指令都顯示版本號（例如 `v20.10.0` 和 `10.2.0`），就可以開始了！

#### 如果尚未安裝 Node.js：

**Windows：**
1. 前往 https://nodejs.org/
2. 下載 **LTS** 版本（推薦）
3. 執行安裝程式，點擊「下一步」完成所有步驟
4. 安裝完成後重新啟動終端機/命令提示字元

**macOS：**
```bash
# 使用 Homebrew（推薦）
brew install node

# 或從 https://nodejs.org/ 下載
```

**Linux (Ubuntu/Debian)：**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

### 步驟 1：安裝相依套件（僅首次需要）

開啟終端機並切換到專案資料夾：

```bash
cd /path/to/pedigree-draw
```

安裝必要的套件：

```bash
npm install
```

這會下載所有必要的相依套件。您只需要執行一次（或在更新程式碼後重新執行）。

---

### 步驟 2：啟動伺服器

執行啟動腳本：

```bash
./start.sh
```

**Windows 使用者**請執行：
```bash
npm run dev
```

您應該會看到類似以下的輸出：
```
==========================================
  Pedigree Draw Server Started!
==========================================

  Local:   http://localhost:5173/pedigree-draw/
  Network: http://192.168.x.x:5173/pedigree-draw/

  To stop the server, run: ./stop.sh
==========================================
```

---

### 步驟 3：在瀏覽器中開啟

開啟您的網頁瀏覽器並前往：

- **本機存取：** http://localhost:5173/pedigree-draw/
- **從同一網路中的其他裝置存取：** 使用上方顯示的 Network URL

---

### 步驟 4：停止伺服器

使用完畢後，停止伺服器：

```bash
./stop.sh
```

**Windows 使用者**請在終端機中按 `Ctrl+C` 停止伺服器。

---

## 如何使用應用程式

### 建立新的 Pedigree

1. 點擊左側面板中的 **「New Pedigree」**
2. 輸入 Family ID（例如「FAM001」）

### 新增成員

使用頂部工具列：

| 按鈕 | 說明 |
|------|------|
| Male | 新增男性 |
| Female | 新增女性 |
| Unknown | 新增未知性別 |

### 選取成員

- **點擊**成員以選取
- 選取的成員周圍會顯示藍色虛線邊框
- 右側面板會顯示可編輯的屬性

### 新增關係

首先**選取一個成員**，然後使用這些工具列按鈕：

| 按鈕 | 說明 |
|------|------|
| Spouse | 在選取成員旁邊建立配偶並連接 |
| Child | 在選取成員下方建立子女 |
| Parents | 在選取成員上方建立父母 |

### 編輯屬性

選取成員後，使用右側面板編輯：

- **Label**：顯示名稱
- **Sex**：Male / Female / Unknown
- **Phenotype**：Unaffected / Affected / Carrier / Unknown
- **Status**：Deceased、Proband、Adopted、Miscarriage、Stillbirth

### 畫布控制

| 按鈕 | 說明 |
|------|------|
| + | 放大 |
| - | 縮小 |
| Reset | 重設為 100% 縮放，置中顯示 |
| Fit | 自動調整以顯示所有內容 |

您也可以：
- **拖曳**成員來重新定位
- **拖曳**背景來平移畫布
- **滾動**滑鼠滾輪來縮放

### 匯入 PED 檔案

1. 點擊左側面板中的 **「Import PED」**，或
2. 將 `.ped` 檔案拖放到拖放區域

### 匯出

| 按鈕 | 說明 |
|------|------|
| Export SVG | 向量圖檔（可在 Illustrator 等軟體中編輯） |
| Export PNG | 點陣圖檔（適用於文件、簡報） |
| Export PED | GATK PED 格式檔案 |

### 鍵盤快捷鍵

| 快捷鍵 | 動作 |
|--------|------|
| **Delete** 或 **Backspace** | 刪除選取的成員或關係 |
| **Escape** | 取消選取 |
| **Ctrl+Z** | 復原 |
| **Ctrl+Y** 或 **Ctrl+Shift+Z** | 重做 |

### 編輯關係

1. 點擊兩人之間的**連接線**以選取關係
2. 右側面板會顯示關係選項：
   - **Add Child**：為這對夫妻新增 Male/Female/Unknown 子女
   - **Partnership Status**：Married、Unmarried、Separated、Divorced
   - **Consanguinity**：標記為近親婚配（血親關係）
   - **Children Status**：Infertility 或 No children by choice

### 自動對齊

如果拖曳後元素位置變得混亂，點擊工具列中的 **Auto Align** 按鈕，即可根據世代和關係自動重新排列所有家族成員。

---

## PED 檔案格式

本工具支援標準 GATK PED 格式（6 欄，以空白分隔）：

```
FamilyID  IndividualID  PaternalID  MaternalID  Sex  Phenotype
FAM001    father        0           0           1    1
FAM001    mother        0           0           2    1
FAM001    child1        father      mother      1    2
```

- **Sex**：1 = Male、2 = Female、0 = Unknown
- **Phenotype**：1 = Unaffected、2 = Affected、0 = Unknown
- **PaternalID/MaternalID**：使用「0」表示未知/創始者

---

## 疑難排解

### 執行 ./start.sh 時出現「Permission denied」

確保腳本具有執行權限：
```bash
chmod +x start.sh stop.sh
```

### 伺服器無法啟動

1. 檢查 port 5173 是否已被使用：
   ```bash
   lsof -i :5173
   ```

2. 終止現有程序後重試：
   ```bash
   ./stop.sh
   ./start.sh
   ```

### 網頁無法載入

- 確認您使用的 URL 結尾有 `/pedigree-draw/`
- 嘗試清除瀏覽器快取並重新整理

### 無法從其他裝置存取

- 確保兩台裝置在同一網路中
- 檢查防火牆設定是否允許 port 5173
- 使用 Network URL（而非 localhost）

---

## 開發

### 建置 Production 版本

```bash
npm run build
```

輸出將在 `dist/` 資料夾中。

### 部署到 GitHub Pages

```bash
npm run build
# 然後將 dist/ 資料夾內容上傳到您的 GitHub Pages
```

---

## 授權條款

MIT
