# T-044 冻结三关公网可玩部署

- **公网 URL**: https://zhousong-xd.github.io/demo001/
- Product SHA: `f28893f3c419d794c6ba102bac67038683cb462c`
- 源: `banquet-pilot/dist/banquet-pilot.html`（只读；副本 → `gh-pages`/`index.html`）
- HTML SHA256: `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` / 73182
- 自证: `curl -I` → `200` + `text/html`；live body SHA 与冻结 dist 一致
- 修复: 初建因 Jekyll 吃 JSDoc `{{` 失败 → 加 `.nojekyll`（见 `gh-pages` tip）
- gh-pages tip: `829b3a899b0eadbda0861859595995d839f79765`

— agent:宴席·工程 role:BOT
