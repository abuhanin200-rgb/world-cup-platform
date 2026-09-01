import "react-native-gesture-handler";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/auth/AuthProvider";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { ConnectivityProvider } from "@/connectivity/ConnectivityProvider";
import { installNotificationDeepLinkHandler } from "@/notifications/bootstrap";
import { colors } from "@/theme/tokens";

export default function RootLayout() {
  useEffect(() => installNotificationDeepLinkHandler(), []);
  return <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.navy }}>
    <AppErrorBoundary>
    <SafeAreaProvider>
      <ConnectivityProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.navy }, animation: "slide_from_left" }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" options={{ presentation: "modal" }} />
            <Stack.Screen name="tournaments/[slug]/index" />
            <Stack.Screen name="tournaments/[slug]/predictions" />
          </Stack>
        </AuthProvider>
      </ConnectivityProvider>
    </SafeAreaProvider>
    </AppErrorBoundary>
  </GestureHandlerRootView>;
}
