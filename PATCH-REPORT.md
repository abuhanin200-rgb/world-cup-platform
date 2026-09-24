# PWA install prompt — show once

- The automatic PWA install prompt now appears only once per browser/device.
- The first time it is actually displayed, a persistent localStorage flag is written.
- Pressing the close button or «ليس الآن» keeps that flag, so the automatic prompt never appears again on that browser/device.
- Android native install-prompt dismissal also does not trigger the custom prompt again.
- Successful installs still set the existing installed flag.
- No Firestore rules or backend changes are required.

Modified file:
- `src/components/PWAClient.tsx`
