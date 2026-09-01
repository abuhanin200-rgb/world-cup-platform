import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/auth/AuthProvider";
import { colors, spacing, typography } from "@/theme/tokens";

export default function AccountScreen() {
  const { member, loading, logout, refresh } = useAuth();
  if (loading) return <Screen><View style={styles.loading}><ActivityIndicator color={colors.yellow} /><Text style={styles.muted}>جاري استعادة الجلسة الآمنة…</Text></View></Screen>;
  if (!member) return <Screen title="حسابي" subtitle="استخدم نفس اسم العضو والرقم السري الموجودين في منصة الويب."><Card><View style={styles.center}><Text style={styles.title}>سجّل دخولك إلى التحدي</Text><Text style={styles.muted}>التطبيق لا ينشئ نظام مستخدمين جديدًا؛ يستخدم Member Auth الحالي وFirebase Custom Token.</Text><View style={styles.full}><PrimaryButton label="تسجيل الدخول" onPress={() => router.push("/login")} /></View></View></Card></Screen>;
  return <Screen title="حسابي" subtitle="ملف موحد للبطولات والألعاب." onRefresh={() => void refresh()}>
    <Card><View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>{member.fullName.trim().slice(0, 1)}</Text></View><View style={styles.flex}><Text style={styles.title}>{member.fullName}</Text><Text style={styles.muted}>{member.favoriteTeam ? `يشجع ${member.favoriteTeam}` : "عضو في منصة التحدي"}</Text></View></View></Card>
    <View style={styles.stats}><Card style={styles.stat}><Text style={styles.statValue}>{member.points ?? "—"}</Text><Text style={styles.statLabel}>نقاط كأس العالم القديمة</Text></Card><Card style={styles.stat}><Text style={styles.statValue}>{member.currentRank || "—"}</Text><Text style={styles.statLabel}>ترتيب كأس العالم القديم</Text></Card></View>
    <PrimaryButton secondary label="تسجيل الخروج" onPress={() => void logout()} />
  </Screen>;
}
const styles = StyleSheet.create({ loading: { paddingTop: 80, alignItems: "center", gap: 12 }, center: { alignItems: "center", gap: spacing.md }, profile: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md }, avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.yellow, alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.navy, fontSize: 22, fontWeight: "900" }, flex: { flex: 1, alignItems: "flex-end", gap: 5 }, title: { color: colors.white, fontSize: typography.lg, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, muted: { color: colors.textMuted, fontSize: typography.sm, lineHeight: 21, fontWeight: "600", textAlign: "right", writingDirection: "rtl" }, full: { width: "100%" }, stats: { flexDirection: "row-reverse", gap: 8 }, stat: { flex: 1, alignItems: "center" }, statValue: { color: colors.yellow, fontSize: 22, fontWeight: "900" }, statLabel: { marginTop: 4, color: colors.textMuted, fontSize: 10, fontWeight: "700", writingDirection: "rtl" } });
