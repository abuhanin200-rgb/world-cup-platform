import { router } from "expo-router";
import { Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, spacing, typography } from "@/theme/tokens";

export default function NotFoundScreen() {
  return <SafeAreaView style={styles.safe}><View style={styles.page}>
    <Text accessibilityRole="header" style={styles.title}>الصفحة غير موجودة</Text>
    <Text style={styles.text}>الرابط الذي فتحته غير متاح في هذا الإصدار من تطبيق التحدي.</Text>
    <PrimaryButton label="العودة للرئيسية" onPress={() => router.replace("/")} />
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  page: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  title: { color: colors.white, fontSize: typography.xl, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  text: { color: colors.textMuted, fontSize: typography.sm, lineHeight: 23, fontWeight: "600", textAlign: "right", writingDirection: "rtl" },
});
