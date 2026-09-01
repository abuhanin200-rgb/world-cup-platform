import { Component, type ErrorInfo, type PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, spacing, typography } from "@/theme/tokens";

type State = { error: Error | null };

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Altahaddi mobile error boundary", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.page}>
        <Text accessibilityRole="header" style={styles.title}>حدث خطأ غير متوقع</Text>
        <Text style={styles.text}>لم نفقد بياناتك. أعد فتح هذه الشاشة، وإذا تكرر الخطأ فسنحتاج تفاصيل الخطأ من سجل التطبيق.</Text>
        <PrimaryButton label="إعادة المحاولة" onPress={() => this.setState({ error: null })} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", backgroundColor: colors.navy, padding: spacing.xl, gap: spacing.lg },
  title: { color: colors.white, fontSize: typography.xl, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  text: { color: colors.textMuted, fontSize: typography.sm, lineHeight: 23, fontWeight: "600", textAlign: "right", writingDirection: "rtl" },
});
