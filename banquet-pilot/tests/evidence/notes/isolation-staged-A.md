# T-003 staged-A isolation launcher — static draft (REJECT 5642018913 fix)

**本阶段未执行** any launcher / canary probe / game / `node --test` / evidence script / Chrome run.  
Source uploaded for GPT01 static review only. Do not treat this note as a smoke result.

## File list

| Path | Role |
|------|------|
| `tests/evidence/scripts/isolated-launcher.sh` | fail-closed allowlist launcher; RO source + separate RW out; public CA only; bind `/dev` nodes; FD close; execute-phase non-root gate |
| `tests/evidence/scripts/canary-probe.mjs` | outside-deny + RO write-deny + out write-allow (no credential path probes) |
| `tests/evidence/scripts/run-evidence.mjs` | refuse-when-bare; whitelist env; loopback http; CDP via DevToolsActivePort + `/json/version` |
| `tests/evidence/scripts/reject-fix-proofs.mjs` | same isolation / CDP pattern |
| `tests/evidence/notes/isolation-staged-A.md` | this document |

## Launch chain (intended AFTER GPT01 smoke gate — NOT EXECUTED)

```bash
bash banquet-pilot/tests/evidence/scripts/isolated-launcher.sh canary-probe
bash banquet-pilot/tests/evidence/scripts/isolated-launcher.sh run-evidence
bash banquet-pilot/tests/evidence/scripts/isolated-launcher.sh reject-fix-proofs
```

Bare node invocations must REFUSE (exit 2).

## REJECT 5642018913 item mapping

| # | Requirement | Static change |
|---|-------------|-----------------|
| 1 | Safety prerequisites fail closed | `must` wrapper; no `\|\| true` on `make-rprivate`, RO remounts, oldroot detach; RO write probe before pivot; old host path reachability check after pivot; `BANQUET_EVIDENCE_ISOLATED=1` set only on the non-root exec path after checks |
| 2 | RO source + independent out; no ssl private | Task + scripts bind RO; per-run `HOST_OUT` → `/evidence-out` RW only; host-side copy of public CA certs into staging ssl tree (no `/etc/ssl/private`) |
| 3 | UID / caps / FD boundaries | Prepare as ns-root; close FDs ≠0/1/2; `env -i` / `bash --noprofile --norc` (no `BASH_ENV`); `/dev` via bind not `mknod`; **execute drop**: if `uid_map` has no secondary uid → **BLOCKED** (do not exec Node/Chrome as ns-root). `newuidmap`/`uidmap` absent on current agent box and must not be auto-installed |
| 4 | Canary harmless only | Removed credential-path probes; outside deny + RO write deny + evidence-out write allow; boolean/count logs only |
| 5 | CDP bound to live browser endpoint | Parse DevToolsActivePort port **and** `/devtools/browser/...` path; require `/json/version.webSocketDebuggerUrl` loopback + same port + same path; then page on that port; `finally` SIGKILL this task's chrome/http only |

## Mount table (after pivot)

| Guest path | Type | Source | Reason |
|------------|------|--------|--------|
| `/` | tmpfs | fresh | allowlist-only root |
| `/task/banquet-pilot` | bind RO | host banquet-pilot | task source |
| `/task/scripts` | bind RO | host `tests/evidence/scripts` | exec scripts without RW evidence tree |
| `/task/canary-ro/canary-ro.txt` | bind RO | per-run canary file | write-deny probe |
| `/evidence-out` | bind RW | per-run `HOST_OUT` | **only** writable evidence output |
| `/home` `/tmp` `/run/user/0` `/marker` `/chrome-profile` | bind RW | per-run empty dirs | isolated session |
| `/usr` `/bin` `/sbin` `/lib` `/lib64` `/opt/google` | bind RO | host | runtime |
| `/etc/ssl` | bind RO | **staging copy** of public CA only | no private keys |
| `/etc/{passwd,group,...}` | bind RO | host files | NSS minimal |
| `/etc/fonts` `/etc/alternatives` | bind RO | host (if present) | chrome/fonts |
| `/dev/*` | tmpfs + bind nodes | host `/dev/null` etc. | no `mknod` dependency |
| `/proc` | procfs | new pid ns | fresh proc |

**Not mounted:** host outside-canary path; host `/home/box`; host `/workspace` wholesale; host `/etc/ssl/private`; credentials; GH auth.

## Env whitelist (execute `env -i`)

`PATH`, `HOME`, `TMPDIR`/`TMP`/`TEMP`, `XDG_*`, `LANG`/`LC_ALL`, `SSL_CERT_FILE`, `CURL_CA_BUNDLE`, `BANQUET_EVIDENCE_ISOLATED`, `BANQUET_INSTANCE_*`, `BANQUET_ISOLATION_MARKER`, `BANQUET_USER_DATA_DIR`, `BANQUET_EVIDENCE_OUT=/evidence-out`, `BANQUET_TASK_ROOT`, `BANQUET_CANARY_OUTSIDE`, `BANQUET_CANARY_RO`, `BANQUET_SCRIPTS_DIR`.

Never: `GH_*` / PAT / `DISPLAY` / `DBUS` / `XAUTHORITY` / `BASH_ENV` / `ENV`.

## UID gap (honest — current agent box)

Observed with existing tools only:

- `unshare --user --map-root-user` → `uid_map` is a **single** entry `0 <hostuid> 1`.
- `setpriv --reuid=<other>` → `Invalid argument` (no secondary mapping).
- `newuidmap` / package `uidmap` → **not installed**; installing would be path B (needs user/GPT auth — not done).
- `mknod` in userns → `Operation not permitted`; launcher uses bind of individual `/dev` nodes instead.

Therefore the launcher **fail-closes** before exec when no secondary uid exists. Smoke/canary on this box will print `BLOCKED: execute-phase non-root UID unavailable...` until GPT01/user provides a mature isolation environment or authorizes uidmap. No `--no-sandbox`, no install B, no C downgrade by BOT.

## Historical evidence

Prior artifacts under `tests/evidence/{l01,l02,reject-fix,touch,notes}` remain **HISTORICAL / WEAK** (pre-staged-A). Not isolation proof.

## Explicit stage statement

**本阶段未执行** isolated-launcher.sh、canary-probe.mjs、run-evidence.mjs、reject-fix-proofs.mjs、游戏、Node 测试、或任何 Chrome/http.server 取证进程。仅上传源码供静态审核。

下一停点：等待 GPT01 源码审核；UID 缺口由 GPT01 决定是否要用户提供成熟隔离环境。
