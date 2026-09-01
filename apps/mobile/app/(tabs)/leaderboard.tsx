import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { colors, spacing, typography } from "@/theme/tokens";

export default function LeaderboardScreen() { return <Screen title="الترتيب" subtitle="الترتيب هنا بوابة للوصول إلى ترتيب البطولة النشطة وترتيب الألعاب، دون خلط النقاط بين الأنظمة.">
  <Card><View style={styles.center}><Text style={styles.icon}>🏆</Text><Text style={styles.title}>ترتيب خليجي 27</Text><Text style={styles.muted}>سيُقرأ من tournamentUserStats بعد تثبيت طبقة الاستعلام المشتركة.</Text></View></Card>
  <Card><View style={styles.center}><Text style={styles.icon}>⚡️</Text><Text style={styles.title}>ترتيب الألعاب</Text><Text style={styles.muted}>يُبنى من platformGameStats وXP المستقل.</Text></View></Card>
</Screen>; }
const styles = StyleSheet.create({ center: { alignItems: "center", gap: spacing.sm }, icon: { fontSize: 30 }, title: { color: colors.white, fontSize: typography.lg, fontWeight: "900", writingDirection: "rtl" }, muted: { color: colors.textMuted, fontSize: typography.sm, lineHeight: 21, textAlign: "center", fontWeight: "600", writingDirection: "rtl" } });
