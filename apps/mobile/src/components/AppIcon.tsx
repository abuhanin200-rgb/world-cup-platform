import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

type SymbolName = ComponentProps<typeof SymbolView>["name"];
const icons = {
  home: { ios: "house.fill", android: "home", web: "home" },
  trophy: { ios: "trophy.fill", android: "trophy", web: "trophy" },
  games: { ios: "gamecontroller.fill", android: "sports_esports", web: "sports_esports" },
  leaderboard: { ios: "chart.bar.fill", android: "leaderboard", web: "leaderboard" },
  account: { ios: "person.crop.circle.fill", android: "account_circle", web: "account_circle" },
  arrow: { ios: "chevron.left", android: "chevron_left", web: "chevron_left" },
  calendar: { ios: "calendar", android: "calendar_month", web: "calendar_month" },
  location: { ios: "location.fill", android: "location_on", web: "location_on" },
  bell: { ios: "bell.fill", android: "notifications", web: "notifications" },
} satisfies Record<string, SymbolName>;

export function AppIcon({
  name,
  size = 22,
  color = "#FFFFFF",
}: {
  name: keyof typeof icons;
  size?: number;
  color?: ColorValue;
}) {
  return <SymbolView name={icons[name]} size={size} tintColor={color} />;
}
