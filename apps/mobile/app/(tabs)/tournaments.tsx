import { Image, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { AppIcon } from "@/components/AppIcon";
import { getMobileTournamentStatus, mobileTournaments, type MobileTournamentStatus } from "@/data/tournaments";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const labels: Record<MobileTournamentStatus, string> = { active: "جارية", finished: "منتهية", coming_soon: "قريبًا" };
export default function TournamentsScreen() { return <Screen title="البطولات" subtitle="لكل بطولة ترتيب ونقاط وإحصائيات مستقلة، مع حساب واحد على مستوى منصة التحدي.">
  {mobileTournaments.map((item) => { const status = getMobileTournamentStatus(item); return <Card key={item.slug} onPress={() => router.push({ pathname: "/tournaments/[slug]", params: { slug: item.slug } })}>
    <View style={styles.row}><Image source={item.logo} style={styles.logo} resizeMode="contain" /><View style={styles.content}><View style={styles.titleRow}><View style={[styles.badge, { borderColor: `${item.accent}55`, backgroundColor: `${item.accent}18` }]}><View style={[styles.dot, { backgroundColor: item.accent }]} /><Text style={[styles.badgeText, { color: item.accent }]}>{labels[status]}</Text></View><Text style={styles.title}>{item.name}</Text></View><View style={styles.meta}><AppIcon name="location" size={16} color={colors.textMuted} /><Text style={styles.metaText}>{item.country}</Text></View><View style={styles.meta}><AppIcon name="calendar" size={16} color={colors.textMuted} /><Text style={styles.metaText}>{item.dates}</Text></View></View><AppIcon name="arrow" color={colors.textMuted} /></View>
  </Card>; })}
</Screen>; }
const styles = StyleSheet.create({ row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md }, logo: { width: 64, height: 64, borderRadius: radius.md }, content: { flex: 1, alignItems: "flex-end", gap: 7 }, titleRow: { alignSelf: "stretch", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 }, title: { color: colors.white, fontWeight: "900", fontSize: typography.lg, writingDirection: "rtl" }, badge: { minHeight: 28, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 9, flexDirection: "row-reverse", alignItems: "center", gap: 5 }, badgeText: { fontSize: 10, fontWeight: "900", writingDirection: "rtl" }, dot: { width: 6, height: 6, borderRadius: 3 }, meta: { flexDirection: "row-reverse", alignItems: "center", gap: 5 }, metaText: { color: colors.textMuted, fontSize: typography.xs, fontWeight: "600", textAlign: "right", writingDirection: "rtl" } });
