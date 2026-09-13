/** Chinese UI labels / placeholders (T-003). */

export const CHAR_LABEL = {
  fox: "狐",
  rabbit: "兔",
  crane: "鹤",
  otter: "獭",
  tanuki: "狸",
  hedgehog: "猬",
};

export const CHAR_COLOR = {
  fox: "#e07a3d",
  rabbit: "#d4a0c8",
  crane: "#7eb6d9",
  otter: "#8b7355",
  tanuki: "#c4a35a",
  hedgehog: "#7a8f6a",
};

export const STATUS_META = {
  PENDING: { symbol: "○", text: "待定", className: "st-pending" },
  SATISFIED: { symbol: "✓", text: "满足", className: "st-satisfied" },
  CONFLICT: { symbol: "✗", text: "冲突", className: "st-conflict" },
};

export const KIND_LABEL = {
  at: "指定座位",
  not_beside: "不可紧挨",
  faces: "必须对面",
  end: "必须端位",
  same_row: "必须同排",
  not_faces_unless: "无豁免不可对面",
};

/**
 * @param {object} rule
 */
export function describeRule(rule) {
  const sub = CHAR_LABEL[rule.subject] || rule.subject;
  const other = rule.other ? CHAR_LABEL[rule.other] || rule.other : "";
  const kind = KIND_LABEL[rule.kind] || rule.kind;
  switch (rule.kind) {
    case "at":
      return `${sub} 坐 ${rule.seat}（${kind}）`;
    case "not_beside":
      return `${sub} 与 ${other} ${kind}`;
    case "faces":
      return `${sub} 与 ${other} ${kind}`;
    case "end":
      return `${sub} ${kind}`;
    case "same_row":
      return `${sub} 与 ${other} ${kind}`;
    case "not_faces_unless":
      return `${sub} 与 ${other} ${kind}`;
    default:
      return `${rule.id}: ${kind}`;
  }
}

/**
 * Characters / seats related to a rule (for highlight).
 * @param {object} rule
 */
export function ruleRelated(rule) {
  const chars = [rule.subject];
  if (rule.other) chars.push(rule.other);
  const seats = rule.seat ? [rule.seat] : [];
  return { chars, seats };
}
