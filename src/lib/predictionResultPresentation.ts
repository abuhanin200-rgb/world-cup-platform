export const PREDICTION_RESULT_COPY = {
  exact: { label: "جابها بالملي" },
  winner: { label: "الفائز صحيح" },
  wrong: { label: "لم يصب التوقع" },
  pending: { label: "بانتظار الاحتساب" },
} as const;

export function getNotificationDisplayTitle(
  type: string,
  fallbackTitle: string,
) {
  if (type === "exact_hit") return `${PREDICTION_RESULT_COPY.exact.label} 🎯`;
  if (type === "winner_hit") return `${PREDICTION_RESULT_COPY.winner.label} 🟡`;
  if (type === "match_result") return PREDICTION_RESULT_COPY.wrong.label;
  return fallbackTitle;
}
