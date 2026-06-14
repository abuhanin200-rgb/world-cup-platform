export async function deleteTestMatch(matchId: string) {
  const response = await fetch("/api/admin/delete-test-match", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      matchId,
      confirmText: "حذف مباراة اختبار",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "تعذر حذف مباراة الاختبار");
  }

  return data as {
    ok: true;
    message: string;
    deletedPredictionsCount: number;
    rebuiltUsersCount: number;
  };
}