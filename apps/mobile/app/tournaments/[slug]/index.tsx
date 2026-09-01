import { Image, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { mobileTournaments } from "@/data/tournaments";
import { colors, spacing, typography } from "@/theme/tokens";

export default function TournamentScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const tournament = mobileTournaments.find((item) => item.slug === slug);
  if (!tournament) return <Screen title="البطولة غير موجودة"><PrimaryButton label="العودة للبطولات" onPress={() => router.replace("/tournaments")} /></Screen>;
  return <Screen title={tournament.name} subtitle={`${tournament.country} · ${tournament.dates}`}>
    <Card><View style={styles.brand}><Image source={tournament.logo} style={styles.logo} resizeMode="contain" /><Text style={styles.title}>{tournament.name}</Text><Text style={styles.muted}>هذه شاشة Native مستقلة للبطولة؛ الأقسام التالية ستتصل بنفس بيانات Firestore وواجهات الويب الحالية.</Text></View></Card>
    <PrimaryButton label="التوقعات" onPress={() => router.push({ pathname: "/tournaments/[slug]/predictions", params: { slug: tournament.slug } })} />
    <View style={styles.grid}><Card style={styles.item}><Text style={styles.itemTitle}>المباريات</Text></Card><Card style={styles.item}><Text style={styles.itemTitle}>الترتيب</Text></Card><Card style={styles.item}><Text style={styles.itemTitle}>الاستوديو</Text></Card><Card style={styles.item}><Text style={styles.itemTitle}>القواعد</Text></Card></View>
  </Screen>;
}
const styles = StyleSheet.create({ brand: { alignItems: "center", gap: spacing.sm }, logo: { width: 100, height: 100 }, title: { color: colors.white, fontSize: typography.xl, fontWeight: "900", writingDirection: "rtl" }, muted: { color: colors.textMuted, textAlign: "center", lineHeight: 22, fontSize: typography.sm, fontWeight: "600", writingDirection: "rtl" }, grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }, item: { width: "48%", alignItems: "center" }, itemTitle: { color: colors.white, fontWeight: "900", writingDirection: "rtl" } });
