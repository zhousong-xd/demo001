# T-038 独立复核证据

- Issue: https://github.com/zhousong-xd/demo001/issues/44
- Engineering tip: b3dd7cee7f0f0610a6bdee42eaed243593454b22
- Script reviewed then rerun (author T-037 ≠ this independent QA)
- Command: node --experimental-websocket tests/evidence/scripts/t037-playtest-ui-critical-regression.mjs
- Exit: 0
- Window UTC: 2026-09-12T08:12:41Z → 2026-09-12T08:13:06Z
- Dist frozen: f28893f3… / 73182 / sha256 19b8e65… (before==after)
- Matrix: 放/撤/切/换/顶/铃 all PASS; 真机/多指 未测
- Shots: 01–08 from independent rerun
- No new deps; dist/src not modified
