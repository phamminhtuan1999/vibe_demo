import { readFileSync, writeFileSync } from "node:fs";
import { marked } from "marked";
const sections = [
  ["guide", "User guide", "USER-GUIDE.md"],
  ["features", "Features", "FEATURES.md"],
  ["design", "System design", "SYSTEM-DESIGN.md"],
  ["deploy", "Setup & hosting", "DEPLOYMENT.md"],
];
const content = sections
  .map(
    ([id, , file]) =>
      `<article id="${id}">${marked.parse(readFileSync(`docs/${file}`, "utf8"))}</article>`,
  )
  .join("");
writeFileSync(
  "public/guide.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AhaBenefits · Guide & system design</title><style>*{box-sizing:border-box}html{scroll-behavior:smooth}body{font:15px/1.8 system-ui,sans-serif;color:#1f2937;background:#f4f6f9;margin:0}header{background:white;border-bottom:1px solid #e5e7eb;padding:16px 24px;position:sticky;top:0;z-index:2}header strong{font-size:19px}nav{display:flex;gap:20px;flex-wrap:wrap;margin-top:8px}a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}main{max-width:1020px;margin:30px auto;padding:0 22px}article{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:28px 36px;margin-bottom:24px;scroll-margin-top:110px}h1{font-size:27px;line-height:1.4;margin-top:0}h2{font-size:20px;margin-top:30px}h3{font-size:17px}table{border-collapse:collapse;width:100%;display:block;overflow:auto;font-size:13px}th,td{border:1px solid #e5e7eb;text-align:left;padding:10px;vertical-align:top}th{background:#f9fafb}pre{padding:18px;background:#f4f6f9;border-radius:8px;overflow:auto;font-size:12px;line-height:1.7}code{font-size:.9em}li{margin-bottom:5px}.mermaid{background:#fff;overflow:auto}@media(max-width:650px){article{padding:20px}main{padding:0 12px}header{padding:12px}nav{gap:12px;font-size:13px}h1{font-size:23px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}</style></head><body><header><strong>AhaBenefits</strong> <span style="color:#8a93a0"> / Documentation</span><nav><a href="/">← Open console</a>${sections.map(([id, label]) => `<a href="#${id}">${label}</a>`).join("")}</nav></header><main>${content}</main><script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';document.querySelectorAll('code.language-mermaid').forEach(code=>{const div=document.createElement('div');div.className='mermaid';div.textContent=code.textContent;code.parentElement.replaceWith(div);});mermaid.initialize({startOnLoad:true,theme:'neutral',securityLevel:'strict'});</script></body></html>`,
);
