import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing } from "@/theme/tokens";

export function Card({ children, onPress, style }: PropsWithChildren<{ onPress?: () => void; style?: ViewStyle }>) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return <Pressable
    accessibilityRole="button"
    onPress={() => { void Haptics.selectionAsync(); onPress(); }}
    style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
  >{children}</Pressable>;
}
const styles = StyleSheet.create({ card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }, pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] } });
