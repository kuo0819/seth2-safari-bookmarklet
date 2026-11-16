# Seth2 Safari Bookmarklet

iPhone Safari 輕量測試版。**目前只有診斷介面，尚未包含房間掃描、排行、切房或自動旋轉。**

## 書籤網址

```javascript
javascript:(function(){if(window.__seth2SafariLoading)return;window.__seth2SafariLoading=true;var s=document.createElement('script');s.src='https://kuo0819.github.io/seth2-safari-bookmarklet/assistant.js?v=010';s.onload=function(){window.__seth2SafariLoading=false};s.onerror=function(){window.__seth2SafariLoading=false;alert('載入失敗：可能尚未啟用 GitHub Pages 或被 CSP 阻擋')};document.documentElement.appendChild(s)})();
```

## 設定 GitHub Pages

Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save。

## 安全與相容性

書籤需在目標網站前景手動點擊。Safari CSP 可能阻擋外部 JS；無法保證遊戲 iframe 或內部 API 可存取。請勿將 token 或密碼放進公開儲存庫。此版本不攔截遊戲通訊、不自動下注，也不修改遊戲速度。
