import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { AppIcon } from "@/components/AppIcon";
import { colors, spacing, typography } from "@/theme/tokens";

const games = [
  { title: "خمن كلمة اليوم", description: "6 محاولات يومية لاكتشاف الكلمة الرياضية." },
  { title: "تحدي الأعلام", description: "طابق الأعلام بأسرع وقت ونافس على XP." },
  { title: "العشر ثواني", description: "أوقف المؤقت عند 10 ثوانٍ بأعلى دقة ممكنة." },
];
export default function GamesScreen() { return <Screen title="الألعاب والتحديات" subtitle="XP الألعاب مستقل تمامًا عن نقاط البطولات.">
  <Card><View style={styles.summary}><AppIcon name="games" size={30} color={colors.yellow} /><View style={styles.flex}><Text style={styles.value}>XP · Level</Text><Text style={styles.muted}>سيظهر تقدمك الفعلي بعد ربط شاشة البيانات في الدفعة التالية.</Text></View></View></Card>
  {games.map((game) => <Card key={game.title}><View style={styles.flex}><Text style={styles.title}>{game.title}</Text><Text style={styles.muted}>{game.description}</Text></View></Card>)}
</Screen>; }
const styles = StyleSheet.create({ summary: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md }, flex: { flex: 1, alignItems: "flex-end", gap: 5 }, value: { color: colors.yellow, fontSize: typography.lg, fontWeight: "900" }, title: { color: colors.white, fontSize: typography.lg, fontWeight: "900", writingDirection: "rtl" }, muted: { color: colors.textMuted, fontSize: typography.sm, lineHeight: 21, fontWeight: "600", textAlign: "right", writingDirection: "rtl" } });
