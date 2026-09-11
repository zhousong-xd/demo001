#!/usr/bin/env bash
# T-003 staged-A isolation launcher (static draft).
# Entry: bash banquet-pilot/tests/evidence/scripts/isolated-launcher.sh <run-evidence|reject-fix-proofs|canary-probe>
# Requires: unshare -Urm[pn], no sudo. Chrome sandbox kept ON (no --no-sandbox).
# NEVER pass GH_*/PAT into the isolated env.
# **本阶段未执行** — source for GPT01 static review only until smoke gate opens.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVID_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"          # .../tests/evidence
TASK_ROOT="$(cd "${EVID_DIR}/../.." && pwd)"        # .../banquet-pilot
MODE="${1:-}"
if [[ -z "${MODE}" ]]; then
  echo "usage: $0 <run-evidence|reject-fix-proofs|canary-probe>" >&2
  exit 2
fi

# Capability gate: user+mount ns required. Missing => BLOCKED (no bypass).
if ! unshare --user --map-root-user --mount true 2>/dev/null; then
  echo "BLOCKED: unshare user+mount (--map-root-user) unavailable" >&2
  exit 3
fi

# Host-side instance dirs (NOT mounted wholesale /tmp into ns — only this tree's pieces via allowlist).
INSTANCE_ID="$(date +%s)-$$-${RANDOM}"
HOST_STAGING="$(mktemp -d /tmp/banquet-iso-${INSTANCE_ID}-XXXXXX)"
HOST_CANARY="${HOST_STAGING}/canary-outside.txt"
HOST_ISO_ROOT="${HOST_STAGING}/root"
HOST_HOME="${HOST_STAGING}/home"
HOST_TMP="${HOST_STAGING}/tmp"
HOST_XDG_RUN="${HOST_STAGING}/xdg-runtime"
HOST_MARKER_DIR="${HOST_STAGING}/marker"
HOST_CHROME_PROFILE="${HOST_STAGING}/chrome-profile"
mkdir -p "${HOST_ISO_ROOT}" "${HOST_HOME}" "${HOST_TMP}" "${HOST_XDG_RUN}" \
  "${HOST_MARKER_DIR}" "${HOST_CHROME_PROFILE}"

# Harmless canary: readable on host OUTSIDE isolation; must NOT be bind-mounted into ns.
echo "banquet-canary-harmless-${INSTANCE_ID}" > "${HOST_CANARY}"
chmod 644 "${HOST_CANARY}"

INSTANCE_TOKEN="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
MARKER_FILE="${HOST_MARKER_DIR}/instance.marker"
echo "${INSTANCE_TOKEN}" > "${MARKER_FILE}"

cleanup() {
  # Only clean this task's verified staging tree.
  if [[ -n "${HOST_STAGING:-}" && -d "${HOST_STAGING}" ]]; then
    rm -rf "${HOST_STAGING}" || true
  fi
}
trap cleanup EXIT

# Target script inside the isolated view (paths as seen AFTER mounts).
case "${MODE}" in
  run-evidence)
    INNER_CMD=(/usr/bin/node --experimental-websocket /task/banquet-pilot/tests/evidence/scripts/run-evidence.mjs)
    ;;
  reject-fix-proofs)
    INNER_CMD=(/usr/bin/node --experimental-websocket /task/banquet-pilot/tests/evidence/scripts/reject-fix-proofs.mjs)
    ;;
  canary-probe)
    INNER_CMD=(/usr/bin/node /task/banquet-pilot/tests/evidence/scripts/canary-probe.mjs)
    ;;
  *)
    echo "unknown mode: ${MODE}" >&2
    exit 2
    ;;
esac

# Export ONLY for the outer orchestrator; child env rebuilt inside unshare via env -i.
export BANQUET_HOST_STAGING="${HOST_STAGING}"
export BANQUET_HOST_CANARY="${HOST_CANARY}"
export BANQUET_HOST_TASK_ROOT="${TASK_ROOT}"
export BANQUET_HOST_EVID_DIR="${EVID_DIR}"
export BANQUET_INSTANCE_TOKEN="${INSTANCE_TOKEN}"
export BANQUET_INSTANCE_ID="${INSTANCE_ID}"

# Inner script: private mounts + whitelist env + exec node. Uses -Urmpn:
#   U = user ns (uid 0 inside => chrome-sandbox setuid can work)
#   r = map root / keep ranges for -r form with -U
#   m = mount ns (all binds private; no host propagation)
#   p = pid ns (fresh /proc; no host process bypass)
#   n = net ns (lo only; static server + CDP on this instance loopback)
#
# UID mapping rationale: unshare -Ur makes the calling uid appear as 0 inside the
# user namespace. Chrome's chrome-sandbox is setuid-root; inside the userns that
# setuid targets ns-root, so nested sandbox can start WITHOUT --no-sandbox.
# If sandbox still cannot start => non-zero exit, no fallback.
unshare --user --map-root-user --mount --pid --fork --net bash -c '
set -euo pipefail
ISO="'"${HOST_ISO_ROOT}"'"
TASK_HOST="'"${TASK_ROOT}"'"
EVID_HOST="'"${EVID_DIR}"'"
HOME_HOST="'"${HOST_HOME}"'"
TMP_HOST="'"${HOST_TMP}"'"
XDG_HOST="'"${HOST_XDG_RUN}"'"
MARKER_HOST="'"${HOST_MARKER_DIR}"'"
PROFILE_HOST="'"${HOST_CHROME_PROFILE}"'"
CANARY_HOST="'"${HOST_CANARY}"'"
TOKEN="'"${INSTANCE_TOKEN}"'"
INSTANCE_ID="'"${INSTANCE_ID}"'"

# Ensure mounts do not propagate to host.
mount --make-rprivate / 2>/dev/null || true

# Fresh filesystem view: tmpfs root for allowlist-only layout (NOT binding host /).
mount -t tmpfs -o mode=755 tmpfs "${ISO}"

# Directory skeleton inside isolated root.
mkdir -p \
  "${ISO}/task/banquet-pilot" \
  "${ISO}/task/banquet-pilot/tests/evidence" \
  "${ISO}/home" \
  "${ISO}/tmp" \
  "${ISO}/run/user/0" \
  "${ISO}/marker" \
  "${ISO}/chrome-profile" \
  "${ISO}/usr" \
  "${ISO}/bin" \
  "${ISO}/sbin" \
  "${ISO}/lib" \
  "${ISO}/lib64" \
  "${ISO}/opt/google" \
  "${ISO}/etc/alternatives" \
  "${ISO}/etc/ssl" \
  "${ISO}/etc/fonts" \
  "${ISO}/dev" \
  "${ISO}/proc" \
  "${ISO}/sys" \
  "${ISO}/var/tmp"

# --- Mount table (explicit allowlist; see notes/isolation-staged-A.md) ---
# Task source RO
mount --bind "${TASK_HOST}" "${ISO}/task/banquet-pilot"
mount -o remount,bind,ro "${ISO}/task/banquet-pilot"

# Evidence output RW (independent from RO tree via more-specific bind)
mount --bind "${EVID_HOST}" "${ISO}/task/banquet-pilot/tests/evidence"

# Isolated HOME / TMP / XDG (empty dirs created for this instance)
mount --bind "${HOME_HOST}" "${ISO}/home"
mount --bind "${TMP_HOST}" "${ISO}/tmp"
mount --bind "${XDG_HOST}" "${ISO}/run/user/0"
mount --bind "${MARKER_HOST}" "${ISO}/marker"
mount --bind "${PROFILE_HOST}" "${ISO}/chrome-profile"

# System runtime RO — listed explicitly (no wholesale /, /home, /workspace, /run, /tmp, /proc from host)
mount --bind /usr "${ISO}/usr"
mount -o remount,bind,ro "${ISO}/usr"
mount --bind /bin "${ISO}/bin"
mount -o remount,bind,ro "${ISO}/bin"
if [[ -d /sbin ]]; then
  mount --bind /sbin "${ISO}/sbin"
  mount -o remount,bind,ro "${ISO}/sbin"
fi
if [[ -d /lib ]]; then
  mount --bind /lib "${ISO}/lib"
  mount -o remount,bind,ro "${ISO}/lib"
fi
if [[ -d /lib64 ]]; then
  mount --bind /lib64 "${ISO}/lib64"
  mount -o remount,bind,ro "${ISO}/lib64"
fi
mount --bind /opt/google "${ISO}/opt/google"
mount -o remount,bind,ro "${ISO}/opt/google"
if [[ -d /etc/alternatives ]]; then
  mount --bind /etc/alternatives "${ISO}/etc/alternatives"
  mount -o remount,bind,ro "${ISO}/etc/alternatives"
fi
if [[ -d /etc/ssl ]]; then
  mount --bind /etc/ssl "${ISO}/etc/ssl"
  mount -o remount,bind,ro "${ISO}/etc/ssl"
fi
if [[ -d /etc/fonts ]]; then
  mount --bind /etc/fonts "${ISO}/etc/fonts"
  mount -o remount,bind,ro "${ISO}/etc/fonts"
fi

# Individual /etc files only (NOT whole /etc — avoids secrets/config sprawl)
for f in passwd group nsswitch.conf hosts ld.so.cache localtime machine-id; do
  if [[ -f "/etc/${f}" ]]; then
    mkdir -p "$(dirname "${ISO}/etc/${f}")"
    touch "${ISO}/etc/${f}"
    mount --bind "/etc/${f}" "${ISO}/etc/${f}"
    mount -o remount,bind,ro "${ISO}/etc/${f}" 2>/dev/null || true
  fi
done

# Minimal /dev nodes (not host /dev wholesale)
mount -t tmpfs -o mode=755 tmpfs "${ISO}/dev"
mknod -m 666 "${ISO}/dev/null" c 1 3
mknod -m 666 "${ISO}/dev/zero" c 1 5
mknod -m 666 "${ISO}/dev/full" c 1 7
mknod -m 666 "${ISO}/dev/random" c 1 8
mknod -m 666 "${ISO}/dev/urandom" c 1 9
mknod -m 666 "${ISO}/dev/tty" c 5 0
mkdir -p "${ISO}/dev/shm"
mount -t tmpfs -o mode=1777 tmpfs "${ISO}/dev/shm"
ln -s /proc/self/fd "${ISO}/dev/fd" 2>/dev/null || true

# Fresh proc for THIS pid ns (not host /proc bind)
mount -t proc proc "${ISO}/proc"

# Netns: bring up loopback only (no public net, no other-project services)
if command -v ip >/dev/null 2>&1; then
  ip link set lo up
elif [[ -x /usr/sbin/ip ]]; then
  /usr/sbin/ip link set lo up
else
  # busybox/iproute may live under /usr after bind; try again after we have tools via PATH later
  /usr/sbin/ip link set lo up 2>/dev/null || /bin/ip link set lo up 2>/dev/null || {
    echo "BLOCKED: cannot bring up lo in new netns" >&2
    exit 3
  }
fi

# pivot into isolated root without leaving host-root cwd/fd escape
mkdir -p "${ISO}/.oldroot"
pivot_root "${ISO}" "${ISO}/.oldroot"
cd /
# Unmount old host root view completely
mount --make-rprivate /.oldroot 2>/dev/null || true
umount -l /.oldroot 2>/dev/null || umount -R /.oldroot 2>/dev/null || {
  echo "BLOCKED: cannot detach old root after pivot_root" >&2
  exit 3
}
rmdir /.oldroot 2>/dev/null || true

# Paths as seen inside isolated root
export PATH="/usr/bin:/bin:/usr/sbin:/sbin"
export HOME="/home"
export TMPDIR="/tmp"
export TMP="/tmp"
export TEMP="/tmp"
export XDG_RUNTIME_DIR="/run/user/0"
export XDG_CONFIG_HOME="/home/.config"
export XDG_CACHE_HOME="/home/.cache"
export XDG_DATA_HOME="/home/.local/share"
mkdir -p "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" "$XDG_DATA_HOME" "$XDG_RUNTIME_DIR"

export BANQUET_EVIDENCE_ISOLATED=1
export BANQUET_INSTANCE_TOKEN="${TOKEN}"
export BANQUET_INSTANCE_ID="${INSTANCE_ID}"
export BANQUET_ISOLATION_MARKER="/marker/instance.marker"
export BANQUET_USER_DATA_DIR="/chrome-profile"
export BANQUET_EVIDENCE_OUT="/task/banquet-pilot/tests/evidence"
export BANQUET_TASK_ROOT="/task/banquet-pilot"
# Outside-canary host path (must be unreadable inside — not mounted)
export BANQUET_CANARY_OUTSIDE="'"${HOST_CANARY}"'"
export LANG=C.UTF-8
export LC_ALL=C.UTF-8
# Headless only — never DISPLAY / DBUS / GTK
unset DISPLAY WAYLAND_DISPLAY DBUS_SESSION_BUS_ADDRESS XAUTHORITY SSH_AUTH_SOCK || true
unset GH_TOKEN GITHUB_TOKEN GITHUB_PAT PAT GH_PAT CURL_USER || true

# Verify marker
echo "${TOKEN}" | cmp -s - /marker/instance.marker

# Clear inherited env and exec with explicit whitelist only (env -i).
# CDP controller (node) lives INSIDE this netns alongside Chrome.
exec env -i \
  PATH="/usr/bin:/bin:/usr/sbin:/sbin" \
  HOME="/home" \
  TMPDIR="/tmp" \
  TMP="/tmp" \
  TEMP="/tmp" \
  XDG_RUNTIME_DIR="/run/user/0" \
  XDG_CONFIG_HOME="/home/.config" \
  XDG_CACHE_HOME="/home/.cache" \
  XDG_DATA_HOME="/home/.local/share" \
  LANG="C.UTF-8" \
  LC_ALL="C.UTF-8" \
  BANQUET_EVIDENCE_ISOLATED="1" \
  BANQUET_INSTANCE_TOKEN="${TOKEN}" \
  BANQUET_INSTANCE_ID="${INSTANCE_ID}" \
  BANQUET_ISOLATION_MARKER="/marker/instance.marker" \
  BANQUET_USER_DATA_DIR="/chrome-profile" \
  BANQUET_EVIDENCE_OUT="/task/banquet-pilot/tests/evidence" \
  BANQUET_TASK_ROOT="/task/banquet-pilot" \
  BANQUET_CANARY_OUTSIDE="'"${HOST_CANARY}"'" \
  "$@"
' -- "${INNER_CMD[@]}"
