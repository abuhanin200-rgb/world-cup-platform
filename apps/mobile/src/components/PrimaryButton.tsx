import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radius, typography } from "@/theme/tokens";

export function PrimaryButton({ label, onPress, loading = false, disabled = false, secondary = false }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; secondary?: boolean }) {
  return <Pressable
    accessibilityRole="button"
    disabled={disabled || loading}
    onPress={() => { void Haptics.selectionAsync(); onPress(); }}
    style={({ pressed }) => [styles.button, secondary ? styles.secondary : styles.primary, (disabled || loading) && styles.disabled, pressed && styles.pressed]}
  >{loading ? <ActivityIndicator color={secondary ? colors.white : colors.navy} /> : <Text style={[styles.label, secondary ? styles.secondaryLabel : styles.primaryLabel]}>{label}</Text>}</Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, borderWidth: 1 }, primary: { backgroundColor: colors.yellow, borderColor: colors.yellow }, secondary: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: colors.border }, label: { fontSize: typography.sm, fontWeight: "900", writingDirection: "rtl" }, primaryLabel: { color: colors.navy }, secondaryLabel: { color: colors.white }, pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] }, disabled: { opacity: 0.55 } });
