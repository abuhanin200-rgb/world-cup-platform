import { Tabs } from "expo-router";
import * as Haptics from "expo-haptics";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "@/components/AppIcon";
import { colors } from "@/theme/tokens";

const tabIcon = (name: Parameters<typeof AppIcon>[0]["name"]) =>
  ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <AppIcon name={name} color={focused ? colors.yellow : color} size={size || 22} />
  );

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="index"
      screenListeners={{ tabPress: () => { void Haptics.selectionAsync(); } }}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.yellow,
        tabBarInactiveTintColor: "#8593B5",
        tabBarStyle: {
          backgroundColor: "#061845",
          borderTopColor: "rgba(255,255,255,.10)",
          height: 64 + insets.bottom,
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "800" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="tournaments" options={{ title: "البطولات", tabBarIcon: tabIcon("trophy") }} />
      <Tabs.Screen name="games" options={{ title: "الألعاب", tabBarIcon: tabIcon("games") }} />
      <Tabs.Screen name="leaderboard" options={{ title: "الترتيب", tabBarIcon: tabIcon("leaderboard") }} />
      <Tabs.Screen name="account" options={{ title: "حسابي", tabBarIcon: tabIcon("account") }} />
    </Tabs>
  );
}
