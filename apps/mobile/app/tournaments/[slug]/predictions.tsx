import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { mobileTournaments } from "@/data/tournaments";
import { colors, typography } from "@/theme/tokens";

export default function TournamentPredictionsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const tournament = mobileTournaments.find((item) => item.slug === slug);
  return <Screen title={tournament ? `توقعات ${tournament.name}` : "التوقعات"} subtitle="Deep Link جاهز لهذه الشاشة عبر altahaddi://tournaments/.../predictions">
    <Card><View style={styles.empty}><Text style={styles.icon}>⚽️</Text><Text style={styles.title}>طبقة التوقعات قيد الربط</Text><Text style={styles.text}>في الدفعة التالية سنربط tournamentMatches وtournamentPredictions ونطبق نفس قواعد الفتح/الإغلاق والاحتساب دون نسخ منطق كأس العالم Legacy.</Text></View></Card>
    <PrimaryButton secondary label="رجوع" onPress={() => router.back()} />
  </Screen>;
}
const styles = StyleSheet.create({ empty: { alignItems: "center", gap: 8 }, icon: { fontSize: 34 }, title: { color: colors.white, fontSize: typography.lg, fontWeight: "900", writingDirection: "rtl" }, text: { color: colors.textMuted, lineHeight: 22, textAlign: "center", fontSize: typography.sm, fontWeight: "600", writingDirection: "rtl" } });
