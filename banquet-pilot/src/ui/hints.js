/** Free 3-tier hints per level (T-004). No paywall / no penalty. */

/** @type {Record<string, [string, string, string]>} */
export const LEVEL_HINTS = {
  L01: [
    "先让指定座位的客人入座，再处理谁不能挨着谁。",
    "狐要坐 A1，鹤要坐 B1；兔不能紧挨着狐。",
    "参考解：狐 A1、獭 A2、鹤 B1、兔 B2。",
  ],
  L02: [
    "对面与同排、端位会约束剩余座位，先钉死指定座。",
    "狐 A1、鹤 B3；兔须与狐对面；猬须在端位；狸与鹤同排。",
    "参考解：狐 A1、獭 A2、猬 A3、兔 B1、狸 B2、鹤 B3。",
  ],
  L03: [
    "有一条规则可用「安心」豁免：别急着只靠换座硬解。",
    "兔与狐不可对面，除非兔已安心；对本关可对兔使用安心铃。",
    "先对兔用安心铃，再按已知解入座：狐 A1、獭 A2、猬 A3、兔 B1、鹤 B2、狸 B3。",
  ],
};

/**
 * @param {string} levelId
 * @param {number} tier 1..3
 * @returns {string | null}
 */
export function hintText(levelId, tier) {
  const rows = LEVEL_HINTS[levelId];
  if (!rows || tier < 1 || tier > 3) return null;
  return rows[tier - 1] || null;
}

/**
 * @param {string} levelId
 * @returns {number}
 */
export function maxHintTier(levelId) {
  const rows = LEVEL_HINTS[levelId];
  return rows ? rows.length : 0;
}
