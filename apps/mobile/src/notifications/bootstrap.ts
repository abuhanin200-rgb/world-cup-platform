import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function internalRoute(value: unknown): Href | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();

  if (raw.startsWith("/")) return raw as Href;
  if (!raw.startsWith("altahaddi://")) return null;

  const parsed = Linking.parse(raw);
  const path = [parsed.hostname, parsed.path]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join("/");

  return path ? (`/${path}` as Href) : null;
}

function openResponse(response: Notifications.NotificationResponse | null) {
  const data = response?.notification.request.content.data;
  const route = internalRoute(data?.route) ?? internalRoute(data?.url);
  if (route) router.push(route);
}

export function installNotificationDeepLinkHandler() {
  void Notifications.getLastNotificationResponseAsync().then(openResponse).catch(() => undefined);
  const subscription = Notifications.addNotificationResponseReceivedListener(openResponse);
  return () => subscription.remove();
}
