# تفعيل TURN للمحادثة الصوتية — تحدي المفردات V8

التحديث V8 يدعم Cloudflare Realtime TURN ببيانات اعتماد قصيرة العمر تُصدر من السيرفر، لذلك لا يتم وضع مفتاح TURN السري داخل المتصفح.

## الخيار الموصى به: Cloudflare Realtime TURN

1. من Cloudflare Dashboard أنشئ TURN Key لخدمة Realtime TURN.
2. أضف في Vercel > Project Settings > Environment Variables:

```text
CLOUDFLARE_TURN_KEY_ID=ضع TURN Key ID هنا
CLOUDFLARE_TURN_KEY_API_TOKEN=ضع API Token الخاص بمفتاح TURN هنا
```

3. فعّل المتغيرين على Production (وPreview إذا احتجت الاختبار هناك).
4. اعمل Redeploy للمشروع.

بعدها endpoint اللعبة يصدر ICE credentials مؤقتة لمدة ساعة لكل لاعب مصرح له داخل مباراة Player vs Player، ويرسل للمتصفح STUN + TURN عبر UDP/TCP/TLS. تم استبعاد المنفذ 53 من قائمة المتصفح لتقليل مهلات الاتصال في المتصفحات التي تحجبه.

## بديل: أي TURN Server ثابت

إذا كنت تستخدم مزود TURN آخر، يمكن تعريف المتغيرات التالية على السيرفر:

```text
VOCABULARY_TURN_URLS=turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp,turns:turn.example.com:5349?transport=tcp
VOCABULARY_TURN_USERNAME=username
VOCABULARY_TURN_CREDENTIAL=password
```

لا تستخدم NEXT_PUBLIC لهذه الأسرار.

## ملاحظات

- بدون مفاتيح TURN ستبقى اللعبة تعمل بـ STUN كحل احتياطي، لكن بعض شبكات الجوال أو NAT المقيد قد تمنع الاتصال الصوتي المباشر.
- V8 يضيف ICE restart تلقائي عند انقطاع/فشل الربط، ويعيد التفاوض بين الطرفين.
- الميكروفون يحتاج HTTPS وإذن المستخدم من Safari/Chrome/المتصفح.
