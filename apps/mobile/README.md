# التحدي — Mobile Native Foundation 01

هذه أول دفعة Native حقيقية للتطبيق، مضافة داخل `apps/mobile` بجانب مشروع Next.js الحالي. لا يوجد WebView، ولم يتم نقل الويب إلى `apps/web` أو إجراء Monorepo migration في هذه المرحلة.

## ما تحتويه الدفعة

- Expo SDK 57 + React Native 0.86.3 + React 19.2.3 + TypeScript strict.
- Expo Router وBottom Tabs: الرئيسية، البطولات، الألعاب، الترتيب، حسابي.
- Theme/Design Tokens لهوية «التحدي».
- نفس Member Auth الحالي: `POST /api/member-auth/login` باستخدام `fullName` و`password` ثم Firebase Custom Token.
- نفس Firebase project ونفس `userId`؛ لا يوجد نظام أعضاء جديد.
- Firebase Auth persistence عبر `expo-secure-store`، بدون AsyncStorage للأسرار.
- Snapshot آمن لبيانات العضو لتحسين تجربة فتح التطبيق عند ضعف/فقد الاتصال، مع بقاء Firebase Auth هو مصدر الجلسة الأساسي.
- Safe Area وHaptics وPull-to-refresh base وOffline state وError Boundary.
- Deep Links عبر scheme: `altahaddi://`.
- Notification response handler يدعم `data.route` أو `data.url` ويفتح المسار الداخلي الصحيح.
- مسار جاهز: `altahaddi://tournaments/gulf-cup-27/predictions`.
- طبقة API مشتركة مع timeout وتوحيد رسائل الأخطاء.

## مهم قبل التشغيل

هذه الدفعة تحتوي `.env.local` خاصًا بالجوال، مولدًا فقط من قيم Firebase العامة الموجودة أصلًا في مشروع الويب + رابط Backend المنشور. لم يتم نسخ أي `API_FOOTBALL_KEY` أو `FIREBASE_ADMIN_PRIVATE_KEY` أو `OPENAI_API_KEY` أو `CRON_SECRET` أو `ADMIN_SECRET`.

## التشغيل

من جذر المشروع:

```bash
cd apps/mobile
npm install
npx expo-doctor
npm run typecheck
npx expo start
```

لـiPhone/Android عبر Expo Go يمكن اختبار الواجهات الأساسية. **Push Notifications البعيدة على Android تحتاج Development Build** في Expo SDK 57، لذلك لن نعتمد اختبار Push الكامل عبر Expo Go.

## ما لم نفعله

- لا Migration.
- لا تعديل Firestore Rules.
- لا تعديل Collections.
- لا تعديل `src/lib/scoring.ts`.
- لا نسخ Scoring Legacy إلى التطبيق.
- لا إضافة نقاط الألعاب إلى نقاط البطولات.
- لا نقل مشروع الويب أو تغيير إعدادات Vercel.

## الدفعة التالية

ربط البيانات الفعلية تدريجيًا:
1. Tournament Registry/summary.
2. Gulf 27 matches.
3. Tournament predictions.
4. Tournament leaderboard.
5. Account tournament stats.
6. Games XP.
7. Push token registration + backend delivery contract.
