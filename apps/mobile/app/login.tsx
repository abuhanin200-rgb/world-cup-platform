import { useState } from "react";
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthProvider";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export default function LoginScreen() {
  const { login } = useAuth();
  const [name, setName] = useState(""); const [password, setPassword] = useState(""); const [show, setShow] = useState(false); const [working, setWorking] = useState(false); const [error, setError] = useState("");
  async function submit() { if (!name.trim() || !password) { setError("اكتب الاسم والرقم السري."); return; } setWorking(true); setError(""); try { await login(name, password); router.back(); } catch (e) { setError(e instanceof Error ? e.message : "تعذر تسجيل الدخول."); } finally { setWorking(false); } }
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}><View style={styles.page}>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>إغلاق</Text></Pressable>
    <View style={styles.card}><Text style={styles.eyebrow}>حسابك نفسه</Text><Text accessibilityRole="header" style={styles.title}>تسجيل الدخول</Text><Text style={styles.subtitle}>استخدم اسمك والرقم السري الموجودين في منصة التحدي.</Text>
      <Text style={styles.label}>الاسم</Text><TextInput value={name} onChangeText={setName} autoCapitalize="none" textContentType="username" placeholder="اسم العضو" placeholderTextColor="#61719A" style={styles.input} textAlign="right" />
      <Text style={styles.label}>الرقم السري</Text><View style={styles.passwordRow}><Pressable accessibilityRole="button" accessibilityLabel={show ? "إخفاء الرقم السري" : "إظهار الرقم السري"} onPress={() => setShow((v) => !v)} style={styles.eye}><Text style={styles.eyeText}>{show ? "إخفاء" : "إظهار"}</Text></Pressable><TextInput value={password} onChangeText={setPassword} secureTextEntry={!show} keyboardType="number-pad" textContentType="password" placeholder="الرقم السري" placeholderTextColor="#61719A" style={styles.passwordInput} textAlign="right" /></View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <PrimaryButton label="دخول" loading={working} onPress={() => void submit()} />
    </View>
  </View></KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.navy }, flex: { flex: 1 }, page: { flex: 1, justifyContent: "center", padding: spacing.lg }, back: { position: "absolute", top: 12, left: 16, minHeight: 44, justifyContent: "center", paddingHorizontal: 12 }, backText: { color: colors.textMuted, fontWeight: "800" }, card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.navyRaised, borderRadius: radius.xl, padding: spacing.xl, gap: 10 }, eyebrow: { color: colors.yellow, fontSize: typography.xs, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, title: { color: colors.white, fontSize: 28, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, subtitle: { color: colors.textMuted, fontSize: typography.sm, lineHeight: 22, fontWeight: "600", textAlign: "right", writingDirection: "rtl", marginBottom: 6 }, label: { color: colors.white, fontSize: typography.xs, fontWeight: "900", textAlign: "right", writingDirection: "rtl", marginTop: 4 }, input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: "rgba(0,0,0,.16)", paddingHorizontal: 14, color: colors.white, fontSize: typography.md }, passwordRow: { minHeight: 50, flexDirection: "row", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: "rgba(0,0,0,.16)", overflow: "hidden" }, passwordInput: { flex: 1, paddingHorizontal: 14, color: colors.white, fontSize: typography.md }, eye: { minWidth: 64, justifyContent: "center", alignItems: "center" }, eyeText: { color: colors.yellow, fontSize: 11, fontWeight: "900" }, error: { color: "#FFB8B8", backgroundColor: "rgba(240,128,128,.10)", borderRadius: 12, padding: 10, textAlign: "right", writingDirection: "rtl", fontWeight: "700" } });
