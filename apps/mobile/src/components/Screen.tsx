import type { PropsWithChildren, ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useConnectivity } from "@/connectivity/ConnectivityProvider";
import { colors, spacing, typography } from "@/theme/tokens";

export function Screen({ children, title, subtitle, refreshing = false, onRefresh }: PropsWithChildren<{ title?: string; subtitle?: string; refreshing?: boolean; onRefresh?: () => void }>) {
  const { online } = useConnectivity();
  return <SafeAreaView edges={["top"]} style={styles.safe}>
    {!online && <View accessibilityRole="alert" style={styles.offline}><Text style={styles.offlineText}>لا يوجد اتصال بالإنترنت — سنحافظ على الشاشة الحالية حتى يعود الاتصال.</Text></View>}
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.yellow} /> : undefined}
    >
      {(title || subtitle) && <View style={styles.header}>{title && <Text accessibilityRole="header" style={styles.title}>{title}</Text>}{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View>}
      {children}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120, gap: spacing.lg },
  header: { gap: 6 },
  title: { color: colors.white, fontSize: typography.xl, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  subtitle: { color: colors.textMuted, fontSize: typography.sm, lineHeight: 22, fontWeight: "600", textAlign: "right", writingDirection: "rtl" },
  offline: { backgroundColor: "#5B3811", paddingHorizontal: spacing.lg, paddingVertical: 10 },
  offlineText: { color: "#FFE8B8", fontSize: typography.xs, fontWeight: "800", textAlign: "center", writingDirection: "rtl" },
});
