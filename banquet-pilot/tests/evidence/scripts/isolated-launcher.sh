#!/usr/bin/env bash
# T-003 staged-A isolation launcher (static draft, REJECT 5642018913 fix).
# Entry: bash banquet-pilot/tests/evidence/scripts/isolated-launcher.sh <run-evidence|reject-fix-proofs|canary-probe>
# Requires: unshare --user --map-root-user --mount [--pid --fork --net]. No sudo.
# Chrome sandbox stays ON. NEVER pass GH_*/PAT into the isolated env.
# **本阶段未执行** — source for GPT01 static review only until smoke gate opens.
set -euo pipefail

unset BASH_ENV ENV SHELLOPTS CDPATH || true
export PATH="/usr/bin:/bin:/usr/sbin:/sbin"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVID_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TASK_ROOT="$(cd "${EVID_DIR}/../.." && pwd)"
MODE="${1:-}"
if [[ -z "${MODE}" ]]; then
  echo "usage: $0 <run-evidence|reject-fix-proofs|canary-probe>" >&2
  exit 2
fi

die_blocked() { echo "BLOCKED: $*" >&2; exit 3; }

if ! unshare --user --map-root-user --mount true 2>/dev/null; then
  die_blocked "unshare user+mount (--map-root-user) unavailable"
fi

INSTANCE_ID="$(date +%s)-$$-${RANDOM}"
HOST_STAGING="$(mktemp -d /tmp/banquet-iso-${INSTANCE_ID}-XXXXXX)"
HOST_CANARY_OUTSIDE="${HOST_STAGING}/canary-outside.txt"
HOST_CANARY_RO="${HOST_STAGING}/canary-ro.txt"
HOST_ISO_ROOT="${HOST_STAGING}/root"
HOST_HOME="${HOST_STAGING}/home"
HOST_TMP="${HOST_STAGING}/tmp"
HOST_XDG_RUN="${HOST_STAGING}/xdg-runtime"
HOST_MARKER_DIR="${HOST_STAGING}/marker"
HOST_CHROME_PROFILE="${HOST_STAGING}/chrome-profile"
HOST_OUT="${HOST_STAGING}/out"
HOST_ETC_SSL="${HOST_STAGING}/etc-ssl"
mkdir -p "${HOST_ISO_ROOT}" "${HOST_HOME}" "${HOST_TMP}" "${HOST_XDG_RUN}" \
  "${HOST_MARKER_DIR}" "${HOST_CHROME_PROFILE}" "${HOST_OUT}" \
  "${HOST_ETC_SSL}/certs"

echo "banquet-canary-outside-${INSTANCE_ID}" > "${HOST_CANARY_OUTSIDE}"
chmod 644 "${HOST_CANARY_OUTSIDE}"
echo "banquet-canary-ro-${INSTANCE_ID}" > "${HOST_CANARY_RO}"
chmod 444 "${HOST_CANARY_RO}"

INSTANCE_TOKEN="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
echo "${INSTANCE_TOKEN}" > "${HOST_MARKER_DIR}/instance.marker"

if [[ ! -f /etc/ssl/certs/ca-certificates.crt ]]; then
  die_blocked "public CA bundle /etc/ssl/certs/ca-certificates.crt missing"
fi
cp -a /etc/ssl/certs/ca-certificates.crt "${HOST_ETC_SSL}/certs/ca-certificates.crt"
find /etc/ssl/certs -maxdepth 1 -type f -exec cp -a {} "${HOST_ETC_SSL}/certs/" \;
cat > "${HOST_ETC_SSL}/openssl.cnf" << 'OPENSSL_CNF'
# Synthetic minimal openssl config for isolated evidence (no private keys).
openssl_conf = openssl_init
[openssl_init]
ssl_conf = ssl_sect
[ssl_sect]
system_default = system_default_sect
[system_default_sect]
MinProtocol = TLSv1.2
OPENSSL_CNF

cleanup() {
  if [[ -n "${HOST_STAGING:-}" && -d "${HOST_STAGING}" ]]; then
    rm -rf "${HOST_STAGING}" || true
  fi
}
trap cleanup EXIT

case "${MODE}" in
  run-evidence)
    NODE_EXTRA=(--experimental-websocket)
    INNER_REL="run-evidence.mjs"
    ;;
  reject-fix-proofs)
    NODE_EXTRA=(--experimental-websocket)
    INNER_REL="reject-fix-proofs.mjs"
    ;;
  canary-probe)
    NODE_EXTRA=()
    INNER_REL="canary-probe.mjs"
    ;;
  *)
    echo "unknown mode: ${MODE}" >&2
    exit 2
    ;;
esac

# Serialize node argv for the inner script (no array leakage / injection).
NODE_EXTRA_STR=""
if [[ ${#NODE_EXTRA[@]} -gt 0 ]]; then
  NODE_EXTRA_STR=$(printf '%q ' "${NODE_EXTRA[@]}")
fi

# Outer note: --map-root-user alone maps only uid0→caller. Secondary uids need
# newuidmap (uidmap package) which is NOT installed here and must not be auto-installed.
# Inner script will BLOCKED before exec if it cannot drop to a non-root mapped uid.
unshare --user --map-root-user --mount --pid --fork --net \
  env -i \
  PATH="/usr/bin:/bin:/usr/sbin:/sbin" \
  HOST_ISO_ROOT="${HOST_ISO_ROOT}" \
  TASK_HOST="${TASK_ROOT}" \
  HOME_HOST="${HOST_HOME}" \
  TMP_HOST="${HOST_TMP}" \
  XDG_HOST="${HOST_XDG_RUN}" \
  MARKER_HOST="${HOST_MARKER_DIR}" \
  PROFILE_HOST="${HOST_CHROME_PROFILE}" \
  OUT_HOST="${HOST_OUT}" \
  CANARY_OUTSIDE="${HOST_CANARY_OUTSIDE}" \
  CANARY_RO_HOST="${HOST_CANARY_RO}" \
  ETC_SSL_HOST="${HOST_ETC_SSL}" \
  TOKEN="${INSTANCE_TOKEN}" \
  INSTANCE_ID="${INSTANCE_ID}" \
  INNER_REL="${INNER_REL}" \
  NODE_EXTRA_STR="${NODE_EXTRA_STR}" \
  bash --noprofile --norc -c '
set -euo pipefail
unset BASH_ENV ENV SHELLOPTS CDPATH || true
export PATH="/usr/bin:/bin:/usr/sbin:/sbin"

die_blocked() { echo "BLOCKED: $*" >&2; exit 3; }
must() { "$@" || die_blocked "security prerequisite failed: $*"; }

# Close inherited FDs except 0/1/2.
if [[ -d /proc/self/fd ]]; then
  for fd in /proc/self/fd/*; do
    fdnum="${fd##*/}"
    case "${fdnum}" in
      *[!0-9]*|"") continue ;;
      0|1|2) continue ;;
      *) eval "exec ${fdnum}<&-" 2>/dev/null || true ;;
    esac
  done
fi

ISO="${HOST_ISO_ROOT}"

must mount --make-rprivate /
must mount -t tmpfs -o mode=755 tmpfs "${ISO}"

must mkdir -p \
  "${ISO}/task/banquet-pilot" \
  "${ISO}/task/scripts" \
  "${ISO}/task/canary-ro" \
  "${ISO}/evidence-out" \
  "${ISO}/home" \
  "${ISO}/tmp" \
  "${ISO}/run/user/0" \
  "${ISO}/marker" \
  "${ISO}/chrome-profile" \
  "${ISO}/usr" "${ISO}/bin" "${ISO}/sbin" "${ISO}/lib" "${ISO}/lib64" \
  "${ISO}/opt/google" "${ISO}/etc/alternatives" "${ISO}/etc/ssl" "${ISO}/etc/fonts" \
  "${ISO}/dev" "${ISO}/proc" "${ISO}/sys" "${ISO}/var/tmp" "${ISO}/.oldroot"

# Task source RO (scripts/notes stay read-only — not remounted RW)
must mount --bind "${TASK_HOST}" "${ISO}/task/banquet-pilot"
must mount -o remount,bind,ro "${ISO}/task/banquet-pilot"
must mount --bind "${TASK_HOST}/tests/evidence/scripts" "${ISO}/task/scripts"
must mount -o remount,bind,ro "${ISO}/task/scripts"

# Per-run RW output directory — separated from input scripts
must mount --bind "${OUT_HOST}" "${ISO}/evidence-out"

# Task-local RO canary (write must fail)
must touch "${ISO}/task/canary-ro/canary-ro.txt"
must mount --bind "${CANARY_RO_HOST}" "${ISO}/task/canary-ro/canary-ro.txt"
must mount -o remount,bind,ro "${ISO}/task/canary-ro/canary-ro.txt"

must mount --bind "${HOME_HOST}" "${ISO}/home"
must mount --bind "${TMP_HOST}" "${ISO}/tmp"
must mount --bind "${XDG_HOST}" "${ISO}/run/user/0"
must mount --bind "${MARKER_HOST}" "${ISO}/marker"
must mount --bind "${PROFILE_HOST}" "${ISO}/chrome-profile"

must mount --bind /usr "${ISO}/usr"
must mount -o remount,bind,ro "${ISO}/usr"
must mount --bind /bin "${ISO}/bin"
must mount -o remount,bind,ro "${ISO}/bin"
if [[ -d /sbin ]]; then
  must mount --bind /sbin "${ISO}/sbin"
  must mount -o remount,bind,ro "${ISO}/sbin"
fi
if [[ -d /lib ]]; then
  must mount --bind /lib "${ISO}/lib"
  must mount -o remount,bind,ro "${ISO}/lib"
fi
if [[ -d /lib64 ]]; then
  must mount --bind /lib64 "${ISO}/lib64"
  must mount -o remount,bind,ro "${ISO}/lib64"
fi
[[ -d /opt/google ]] || die_blocked "host /opt/google missing"
must mount --bind /opt/google "${ISO}/opt/google"
must mount -o remount,bind,ro "${ISO}/opt/google"
if [[ -d /etc/alternatives ]]; then
  must mount --bind /etc/alternatives "${ISO}/etc/alternatives"
  must mount -o remount,bind,ro "${ISO}/etc/alternatives"
fi

# Public CA tree only (copied host-side; never /etc/ssl/private)
must mount --bind "${ETC_SSL_HOST}" "${ISO}/etc/ssl"
must mount -o remount,bind,ro "${ISO}/etc/ssl"
if [[ -e "${ISO}/etc/ssl/private" ]]; then
  die_blocked "ssl private path present in guest — refuse"
fi

if [[ -d /etc/fonts ]]; then
  must mount --bind /etc/fonts "${ISO}/etc/fonts"
  must mount -o remount,bind,ro "${ISO}/etc/fonts"
fi

for f in passwd group nsswitch.conf hosts ld.so.cache localtime machine-id; do
  if [[ -f "/etc/${f}" ]]; then
    must mkdir -p "$(dirname "${ISO}/etc/${f}")"
    must touch "${ISO}/etc/${f}"
    must mount --bind "/etc/${f}" "${ISO}/etc/${f}"
    must mount -o remount,bind,ro "${ISO}/etc/${f}"
  fi
done

# /dev nodes via bind (mknod is often OPERM in userns — do not pretend it works)
must mount -t tmpfs -o mode=755 tmpfs "${ISO}/dev"
for node in null zero full random urandom tty; do
  [[ -e "/dev/${node}" ]] || die_blocked "host /dev/${node} missing"
  must touch "${ISO}/dev/${node}"
  must mount --bind "/dev/${node}" "${ISO}/dev/${node}"
done
must mkdir -p "${ISO}/dev/shm"
must mount -t tmpfs -o mode=1777 tmpfs "${ISO}/dev/shm"
ln -sf /proc/self/fd "${ISO}/dev/fd"

must mount -t proc proc "${ISO}/proc"

if command -v ip >/dev/null 2>&1; then
  must ip link set lo up
elif [[ -x /usr/sbin/ip ]]; then
  must /usr/sbin/ip link set lo up
else
  die_blocked "cannot bring up lo in new netns"
fi

# Prove RO remount before pivot
if ( printf x > "${ISO}/task/scripts/.write-should-fail" ) 2>/dev/null; then
  rm -f "${ISO}/task/scripts/.write-should-fail" || true
  die_blocked "scripts mount still writable after RO remount"
fi

must pivot_root "${ISO}" "${ISO}/.oldroot"
must cd /
must mount --make-rprivate /.oldroot
umount -l /.oldroot 2>/dev/null || umount -R /.oldroot 2>/dev/null \
  || die_blocked "cannot detach old root after pivot_root"
rmdir /.oldroot 2>/dev/null || true
if [[ -e /home/box || -e /workspace ]]; then
  die_blocked "old host paths still reachable after pivot_root"
fi

mkdir -p /home/.config /home/.cache /home/.local/share /run/user/0 /evidence-out

echo "${TOKEN}" | cmp -s - /marker/instance.marker \
  || die_blocked "instance marker mismatch before exec"

INNER_JS="/task/scripts/${INNER_REL}"
[[ -f "${INNER_JS}" ]] || die_blocked "inner script missing: ${INNER_JS}"
[[ -x /usr/bin/node ]] || die_blocked "node missing"

# --- Execute-phase UID / capability boundary ---
# With only --map-root-user, uid_map is typically "0 <hostuid> 1".
# setpriv --reuid to any other id fails (Invalid argument). newuidmap is absent
# on this host and must not be installed by BOT. Refuse to exec Node/Chrome as
# ns-root: that would keep remount/admin powers and break the non-root Chrome
# sandbox story. Do not set BANQUET_EVIDENCE_ISOLATED for a root exec path.
UID_MAP="$(tr -s ' ' </proc/self/uid_map | tr '\n' ';')"
SECONDARY=""
while read -r inner outer count; do
  [[ -z "${inner}" ]] && continue
  if [[ "${inner}" != "0" ]]; then SECONDARY="${inner}"; break; fi
done < /proc/self/uid_map
if [[ -z "${SECONDARY}" ]]; then
  die_blocked "execute-phase non-root UID unavailable (uid_map=${UID_MAP}; newuidmap/uidmap not present). Mount/pivot prepare OK as ns-root, but dropping remount/admin rights before Node/Chrome cannot be done with existing tools. Need user/GPT-provided mature isolation env or authorized uidmap — no auto-install, no --no-sandbox, no C downgrade."
fi

# If a secondary uid exists, chown writables and drop before exec.
EXEC_UID="${SECONDARY}"
EXEC_GID="${SECONDARY}"
chown -R "${EXEC_UID}:${EXEC_GID}" /home /tmp /run/user/0 /chrome-profile /evidence-out \
  || die_blocked "chown for execute uid failed"

# shellcheck disable=SC2086
exec setpriv --reuid="${EXEC_UID}" --regid="${EXEC_GID}" --clear-groups --inh-caps=-all \
  env -i \
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
  SSL_CERT_FILE="/etc/ssl/certs/ca-certificates.crt" \
  CURL_CA_BUNDLE="/etc/ssl/certs/ca-certificates.crt" \
  BANQUET_EVIDENCE_ISOLATED="1" \
  BANQUET_INSTANCE_TOKEN="${TOKEN}" \
  BANQUET_INSTANCE_ID="${INSTANCE_ID}" \
  BANQUET_ISOLATION_MARKER="/marker/instance.marker" \
  BANQUET_USER_DATA_DIR="/chrome-profile" \
  BANQUET_EVIDENCE_OUT="/evidence-out" \
  BANQUET_TASK_ROOT="/task/banquet-pilot" \
  BANQUET_CANARY_OUTSIDE="${CANARY_OUTSIDE}" \
  BANQUET_CANARY_RO="/task/canary-ro/canary-ro.txt" \
  BANQUET_SCRIPTS_DIR="/task/scripts" \
  /usr/bin/node ${NODE_EXTRA_STR} "${INNER_JS}"
'
