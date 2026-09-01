import { Image, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AppIcon } from "@/components/AppIcon";
import { mobileTournaments } from "@/data/tournaments";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export default function HomeScreen() {
  const gulf = mobileTournaments.find((tournament) => tournament.slug === "gulf-cup-27");

  return (
    <Screen>
      <View style={styles.hero}>
        <Image source={require("../../assets/logo-white.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.slogan}>توقعات · بطولات · ألعاب</Text>
        <Text style={styles.heroText}>منصة رياضية دائمة لمنافسة واحدة تجمع توقعاتك وبطولاتك وألعابك في حساب موحّد.</Text>
        <View style={styles.actions}>
          <PrimaryButton label="استعراض البطولات" onPress={() => router.push("/(tabs)/tournaments")} />
          <PrimaryButton secondary label="الألعاب والتحديات" onPress={() => router.push("/(tabs)/games")} />
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>البطولة القادمة</Text>
        <AppIcon name="trophy" color={colors.yellow} />
      </View>

      {gulf ? (
        <Card onPress={() => router.push({ pathname: "/tournaments/[slug]", params: { slug: gulf.slug } })}>
          <View style={styles.row}>
            <Image source={gulf.logo} style={styles.tournamentLogo} resizeMode="contain" />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{gulf.name}</Text>
              <Text style={styles.muted}>{gulf.country}</Text>
              <Text style={styles.muted}>{gulf.dates}</Text>
            </View>
            <AppIcon name="arrow" color={colors.textMuted} />
          </View>
        </Card>
      ) : (
        <Card>
          <Text style={styles.emptyText}>سيتم عرض البطولة القادمة فور توفر بياناتها.</Text>
        </Card>
      )}

      <View style={styles.stats}>
        <Card style={styles.stat}><Text style={styles.statValue}>3</Text><Text style={styles.statLabel}>بطولات</Text></Card>
        <Card style={styles.stat}><Text style={styles.statValue}>3</Text><Text style={styles.statLabel}>ألعاب</Text></Card>
        <Card style={styles.stat}><Text style={styles.statValue}>XP</Text><Text style={styles.statLabel}>تقدم موحد</Text></Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, backgroundColor: colors.navyRaised, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, alignItems: "center", gap: 12 },
  logo: { width: 180, height: 86 },
  slogan: { color: colors.yellow, fontWeight: "900", fontSize: typography.sm, writingDirection: "rtl" },
  heroText: { color: colors.textMuted, textAlign: "center", lineHeight: 23, fontSize: typography.sm, fontWeight: "600", writingDirection: "rtl" },
  actions: { width: "100%", gap: 10, marginTop: 6 },
  sectionHead: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.white, fontSize: typography.lg, fontWeight: "900", writingDirection: "rtl" },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  flex: { flex: 1, alignItems: "flex-end", gap: 3 },
  tournamentLogo: { width: 56, height: 56 },
  cardTitle: { color: colors.white, fontSize: typography.lg, fontWeight: "900", writingDirection: "rtl" },
  muted: { color: colors.textMuted, fontSize: typography.xs, fontWeight: "600", writingDirection: "rtl", textAlign: "right" },
  emptyText: { color: colors.textMuted, textAlign: "center", writingDirection: "rtl", fontWeight: "700" },
  stats: { flexDirection: "row-reverse", gap: 8 },
  stat: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  statValue: { color: colors.yellow, fontWeight: "900", fontSize: 19 },
  statLabel: { color: colors.textMuted, fontWeight: "700", fontSize: 10, marginTop: 4, writingDirection: "rtl" },
});
