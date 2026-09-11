# T-003 staged-A isolation launcher — static draft

**本阶段未执行** any launcher / canary probe / game / `node --test` / evidence script / Chrome run.  
Source uploaded for GPT01 static review only (DECIDE 5641889494). Do not treat this note as a smoke result.

## File list

| Path | Role |
|------|------|
| `tests/evidence/scripts/isolated-launcher.sh` | user+mount+pid+net ns allowlist launcher; whitelist `env -i`; exec node |
| `tests/evidence/scripts/canary-probe.mjs` | source-only outside-deny + allow-read probe |
| `tests/evidence/scripts/run-evidence.mjs` | rewritten: refuse-when-bare, whitelist env, bind 127.0.0.1, dynamic ports, sandbox ON |
| `tests/evidence/scripts/reject-fix-proofs.mjs` | same isolation pattern; ROOT resolved relative to file |
| `tests/evidence/notes/isolation-staged-A.md` | this document |
| `tests/evidence/notes/session.md` / `summary.json` | annotated **HISTORICAL / WEAK** pre-staged-A conditions |

## Launch chain (intended AFTER GPT01 smoke gate)

All commands below are **NOT EXECUTED** this stage:

```bash
# From repo root, with NO GH_TOKEN/PAT in the environment that will be inherited
# (git auth stays outside isolation; orchestrator unsets before launch).

# 1) Canary / isolation verify (future gate A)
bash banquet-pilot/tests/evidence/scripts/isolated-launcher.sh canary-probe
# expected: CANARY_OK ; exit 0
# failure: CANARY_FAIL / BLOCKED / non-zero ; no fallback

# 2) Evidence (future gate B — only after canary smoke ACCEPT)
bash banquet-pilot/tests/evidence/scripts/isolated-launcher.sh run-evidence
bash banquet-pilot/tests/evidence/scripts/isolated-launcher.sh reject-fix-proofs
```

Bare node invocations **must refuse** (exit 2):

```bash
# NOT EXECUTED — expected REFUSE:
node --experimental-websocket banquet-pilot/tests/evidence/scripts/run-evidence.mjs
node --experimental-websocket banquet-pilot/tests/evidence/scripts/reject-fix-proofs.mjs
```

## Mount table (inside private mount ns after `pivot_root`)

Host `/`, `/home`, `/workspace`, `/run`, `/tmp`, `/proc` are **not** bind-mounted wholesale.  
Fresh tmpfs root + explicit binds only. CWD moves into new root; old root detached after `pivot_root`.

| Guest path | Type | Source / kind | Reason |
|------------|------|---------------|--------|
| `/` (new) | tmpfs RW base | `mount -t tmpfs` | Fresh filesystem view; allowlist-only |
| `/task/banquet-pilot` | bind RO | host banquet-pilot tree | Task source for http.server + scripts |
| `/task/banquet-pilot/tests/evidence` | bind RW | host `tests/evidence` | Independent evidence output (overrides RO parent) |
| `/home` | bind RW | per-instance empty dir | Isolated HOME |
| `/tmp` | bind RW | per-instance empty dir | Isolated TMPDIR |
| `/run/user/0` | bind RW | per-instance empty dir | Isolated XDG_RUNTIME_DIR (no host session) |
| `/marker` | bind RW | per-instance marker dir | Instance token handshake |
| `/chrome-profile` | bind RW | per-instance empty dir | Chrome user-data-dir for this instance |
| `/usr` | bind RO | host `/usr` | node, python3, chrome deps, fonts libs |
| `/bin` | bind RO | host `/bin` | POSIX tools |
| `/sbin` | bind RO | host `/sbin` (if present) | `ip` etc. for lo bring-up |
| `/lib` | bind RO | host `/lib` (if present) | ELF loader / libs |
| `/lib64` | bind RO | host `/lib64` (if present) | ELF loader / libs |
| `/opt/google` | bind RO | host `/opt/google` | google-chrome + chrome-sandbox |
| `/etc/alternatives` | bind RO | host path | chrome symlink resolution |
| `/etc/ssl` | bind RO | host path | TLS trust store (Chrome runtime) |
| `/etc/fonts` | bind RO | host path (if present) | fontconfig |
| `/etc/passwd` | bind RO | host file | NSS minimal |
| `/etc/group` | bind RO | host file | NSS minimal |
| `/etc/nsswitch.conf` | bind RO | host file | NSS |
| `/etc/hosts` | bind RO | host file | name resolution local |
| `/etc/ld.so.cache` | bind RO | host file | dynamic linker |
| `/etc/localtime` | bind RO | host file (if present) | time |
| `/etc/machine-id` | bind RO | host file (if present) | chrome may read |
| `/dev/*` | tmpfs + nodes | `null/zero/full/random/urandom/tty` + `/dev/shm` tmpfs | Minimal devices; **not** host `/dev` |
| `/proc` | procfs | `mount -t proc` in **new pid ns** | Fresh proc for this task only (not host `/proc` bind) |

**Not mounted (by design):** host canary file path; host `/home/box`; host `/workspace` (except the explicit task/evidence binds); host `/run`; host `/tmp` wholesale; other projects; credential files; GH auth paths.

## Env whitelist keys

Constructed with `env -i` in the launcher, then `buildWhitelistEnv()` for Chrome/http children (no copy-then-delete from `process.env`):

| Key | Value (inside ns) |
|-----|-------------------|
| `PATH` | `/usr/bin:/bin:/usr/sbin:/sbin` |
| `HOME` | `/home` |
| `TMPDIR` / `TMP` / `TEMP` | `/tmp` |
| `XDG_RUNTIME_DIR` | `/run/user/0` |
| `XDG_CONFIG_HOME` | `/home/.config` |
| `XDG_CACHE_HOME` | `/home/.cache` |
| `XDG_DATA_HOME` | `/home/.local/share` |
| `LANG` / `LC_ALL` | `C.UTF-8` |
| `BANQUET_EVIDENCE_ISOLATED` | `1` |
| `BANQUET_INSTANCE_TOKEN` | per-run random |
| `BANQUET_INSTANCE_ID` | per-run id |
| `BANQUET_ISOLATION_MARKER` | `/marker/instance.marker` |
| `BANQUET_USER_DATA_DIR` | `/chrome-profile` |
| `BANQUET_EVIDENCE_OUT` | `/task/banquet-pilot/tests/evidence` |
| `BANQUET_TASK_ROOT` | `/task/banquet-pilot` |
| `BANQUET_CANARY_OUTSIDE` | host canary absolute path (for deny check; not mounted) |

**Explicitly never passed:** `GH_TOKEN`, `GITHUB_TOKEN`, `GITHUB_PAT`, `PAT`, `GH_PAT`, `DISPLAY`, `WAYLAND_DISPLAY`, `DBUS_SESSION_BUS_ADDRESS`, `XAUTHORITY`, `SSH_AUTH_SOCK`.  
No shared X11/DBus/existing browser profiles. Prefer `--headless=new` + CDP.

## UID / Chrome sandbox rationale

- Launcher uses `unshare --user --map-root-user ...` so the calling uid maps to **uid 0 inside the user namespace**.
- `/opt/google/chrome/chrome-sandbox` is setuid-root on the host; inside the userns that setuid targets **ns-root**, enabling Chrome's nested sandbox **without** disabling sandbox.
- Chrome argv never includes the sandbox-disable flag. If sandbox cannot start → Chrome/non-zero failure → scripts exit non-zero immediately. **No auto-fallback** to disabled sandbox, host env inheritance, or unisolated run.
- Host probe previously showed `unshare -Urm` + tmpfs mount works as uid0-in-userns; that is **not** treated as proof that full Chrome-in-ns sandbox already works — smoke is a future gate.

## PID / net boundaries

| Boundary | Mechanism | Notes |
|----------|-----------|-------|
| PID | `--pid --fork` + fresh `proc` mount | Controllers cannot attach to host PIDs via `/proc`; only this task's tree visible |
| NET | `--net` + `ip link set lo up` | Only loopback; no public net; no other-project services |
| HTTP | `python3 -m http.server PORT --bind 127.0.0.1` | Dynamic free port; loopback of **this** netns |
| CDP | Chrome `--remote-debugging-port=0` + `--remote-debugging-address=127.0.0.1` | Port published in **this** `user-data-dir/DevToolsActivePort`; handshake also requires `banquet-instance-token` file match |
| CDP controller | Node parent **inside** same netns (launcher `exec`s node after pivot) | Same instance; not an external host controller guessing fixed ports |

## Canary expected results (when smoke is later permitted)

| Check | Expected |
|-------|----------|
| Outside: host canary file created by launcher is readable on host | true (orchestrator-side; probe documents deny inside) |
| Inside: `BANQUET_CANARY_OUTSIDE` unreadable | **deny** — exit non-zero if still readable |
| Inside: allowlisted `.../scripts/canary-probe.mjs` readable | **allow** positive |
| Inside: credential paths unreadable | **deny** |
| Marker/token mismatch or missing isolation env | exit 2 REFUSE |
| Success line | `CANARY_OK` |

"Missing path fails" alone is **not** accepted as proof; the outside canary is deliberately prepared and must be denied inside.

## Failure modes (non-zero, no fallback)

1. `unshare` user+mount unavailable → `BLOCKED` exit 3  
2. Cannot bring up `lo` in new netns → `BLOCKED` exit 3  
3. `pivot_root` / old-root detach fails → `BLOCKED` exit 3  
4. Bare evidence script (no launcher) → REFUSE exit 2  
5. Marker/token mismatch → REFUSE exit 2  
6. Chrome sandbox/instance cannot start / no DevToolsActivePort → throw / non-zero; **never** add sandbox-disable flag  
7. Canary still readable inside → `CANARY_FAIL` non-zero  

Cleanup: only this task's verified staging dir under `/tmp/banquet-iso-*` (host side trap). Do not kill unrelated Chrome/http.server processes.

## Historical evidence annotation

Prior REJECT-fix artifacts under `tests/evidence/{l01,l02,reject-fix,touch,notes}` were produced with **weak** conditions (`--no-sandbox`, env spread-then-delete, fixed ports, unbound http.server). They remain as historical gameplay proofs only and are **not** isolation evidence. See banner on `notes/session.md` and `isolationHistoricalNote` in `summary.json`.

## Explicit stage statement

**本阶段未执行** isolated-launcher.sh、canary-probe.mjs、run-evidence.mjs、reject-fix-proofs.mjs、游戏、Node 测试、或任何 Chrome/http.server 取证进程。仅上传源码供静态审核。

下一停点：等待 GPT01 源码审核；不自行进入运行门。
