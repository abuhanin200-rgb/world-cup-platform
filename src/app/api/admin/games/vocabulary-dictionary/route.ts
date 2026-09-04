import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminRequest } from "@/lib/serverAdminAuth";
import {
  dictionaryAdminEntries,
  VOCABULARY_OVERRIDE_COLLECTION,
} from "@/lib/serverVocabularyDictionary";
import {
  isApprovedVocabularyWord,
  isValidVocabularyShape,
  normalizeVocabularyWord,
} from "@/lib/vocabularyChallengeDictionary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await requireAdminRequest(request);
    const query = request.nextUrl.searchParams.get("q") || "";
    return NextResponse.json(await dictionaryAdminEntries(query));
  } catch (error) {
    console.error("Vocabulary dictionary admin GET error:", error);
    return NextResponse.json({ error: "تعذر تحميل قاموس المفردات." }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRequest(request);
    const body = await request.json().catch(() => ({})) as {
      action?: string;
      word?: string;
      enabled?: boolean;
      note?: string;
    };
    const word = normalizeVocabularyWord(body.word);
    if (!isValidVocabularyShape(word)) {
      return NextResponse.json({ error: "الكلمة يجب أن تكون 3 أحرف عربية معتمدة في نظام اللعبة." }, { status: 400 });
    }

    const ref = adminDb.collection(VOCABULARY_OVERRIDE_COLLECTION).doc(word);
    if (body.action === "restore") {
      await ref.delete();
      return NextResponse.json({ ok: true, word, enabled: isApprovedVocabularyWord(word), restored: true });
    }

    if (body.action !== "set" || typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
    }

    await ref.set({
      word,
      enabled: body.enabled,
      note: String(body.note || "").slice(0, 180),
      updatedAt: Date.now(),
      updatedBy: admin.uid,
      baseWord: isApprovedVocabularyWord(word),
    }, { merge: false });

    return NextResponse.json({ ok: true, word, enabled: body.enabled });
  } catch (error) {
    console.error("Vocabulary dictionary admin POST error:", error);
    return NextResponse.json({ error: "تعذر تحديث الكلمة." }, { status: 403 });
  }
}
