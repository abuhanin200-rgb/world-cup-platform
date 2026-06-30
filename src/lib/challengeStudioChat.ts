import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const CHALLENGE_STUDIO_CHAT_COLLECTION = "challengeStudioChat";
const CHALLENGE_STUDIO_CHAT_LIKES_COLLECTION = "challengeStudioChatLikes";
const CHALLENGE_STUDIO_CHAT_REPLIES_COLLECTION = "challengeStudioChatReplies";

export type ChallengeStudioChatMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date | null;
};

export type ChallengeStudioChatLike = {
  id: string;
  messageId: string;
  userId: string;
  userName: string;
  createdAt: Date | null;
};

export type ChallengeStudioChatReply = {
  id: string;
  messageId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date | null;
};

type SendChallengeStudioMessageInput = {
  userId: string;
  userName: string;
  text: string;
};

type SendChallengeStudioReplyInput = {
  messageId: string;
  userId: string;
  userName: string;
  text: string;
};

type ToggleChallengeStudioMessageLikeInput = {
  messageId: string;
  userId: string;
  userName: string;
};

type ValidationResult = {
  ok: boolean;
  error?: string;
};

const MAX_MESSAGE_LENGTH = 250;
const MAX_REPLY_LENGTH = 150;
const MESSAGE_COOLDOWN_MS = 5000;

function normalizeMessage(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function hasLink(text: string) {
  const linkRegex =
    /(https?:\/\/|www\.|\.com|\.net|\.org|\.io|\.app|\.sa|\.co|t\.me|wa\.me)/i;

  return linkRegex.test(text);
}

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
}

function validateMessageText(text: string): ValidationResult {
  const cleanText = normalizeMessage(text);

  if (!cleanText) {
    return {
      ok: false,
      error: "اكتب رسالتك أولًا.",
    };
  }

  if (cleanText.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `الحد الأقصى للرسالة ${MAX_MESSAGE_LENGTH} حرفًا.`,
    };
  }

  if (hasLink(cleanText)) {
    return {
      ok: false,
      error: "الروابط غير مسموحة في 🎙️ استديو التحليل.",
    };
  }

  return {
    ok: true,
  };
}

function validateReplyText(text: string): ValidationResult {
  const cleanText = normalizeMessage(text);

  if (!cleanText) {
    return {
      ok: false,
      error: "اكتب الرد أولًا.",
    };
  }

  if (cleanText.length > MAX_REPLY_LENGTH) {
    return {
      ok: false,
      error: `الحد الأقصى للرد ${MAX_REPLY_LENGTH} حرفًا.`,
    };
  }

  if (hasLink(cleanText)) {
    return {
      ok: false,
      error: "الروابط غير مسموحة في الردود.",
    };
  }

  return {
    ok: true,
  };
}

function buildLikeId(messageId: string, userId: string) {
  return `${messageId}_${userId}`;
}

export function subscribeChallengeStudioMessages(
  callback: (messages: ChallengeStudioChatMessage[]) => void,
  onError?: (error: Error) => void
) {
  const messagesQuery = query(
    collection(db, CHALLENGE_STUDIO_CHAT_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs
        .map((docItem) => {
          const data = docItem.data();

          return {
            id: docItem.id,
            userId: String(data.userId || ""),
            userName: String(data.userName || "عضو"),
            text: String(data.text || ""),
            createdAt: toDate(data.createdAt),
          };
        })
        .reverse();

      callback(messages);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    }
  );
}

export function subscribeChallengeStudioMessageLikes(
  callback: (likes: ChallengeStudioChatLike[]) => void,
  onError?: (error: Error) => void
) {
  const likesQuery = query(
    collection(db, CHALLENGE_STUDIO_CHAT_LIKES_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(500)
  );

  return onSnapshot(
    likesQuery,
    (snapshot) => {
      const likes = snapshot.docs.map((docItem) => {
        const data = docItem.data();

        return {
          id: docItem.id,
          messageId: String(data.messageId || ""),
          userId: String(data.userId || ""),
          userName: String(data.userName || "عضو"),
          createdAt: toDate(data.createdAt),
        };
      });

      callback(likes);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    }
  );
}

export function subscribeChallengeStudioMessageReplies(
  callback: (replies: ChallengeStudioChatReply[]) => void,
  onError?: (error: Error) => void
) {
  const repliesQuery = query(
    collection(db, CHALLENGE_STUDIO_CHAT_REPLIES_COLLECTION),
    orderBy("createdAt", "asc"),
    limit(500)
  );

  return onSnapshot(
    repliesQuery,
    (snapshot) => {
      const replies = snapshot.docs.map((docItem) => {
        const data = docItem.data();

        return {
          id: docItem.id,
          messageId: String(data.messageId || ""),
          userId: String(data.userId || ""),
          userName: String(data.userName || "عضو"),
          text: String(data.text || ""),
          createdAt: toDate(data.createdAt),
        };
      });

      callback(replies);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    }
  );
}

export async function sendChallengeStudioMessage({
  userId,
  userName,
  text,
}: SendChallengeStudioMessageInput) {
  const cleanText = normalizeMessage(text);

  const textValidation = validateMessageText(cleanText);

  if (!textValidation.ok) {
    throw new Error(textValidation.error);
  }

  if (!userId) {
    throw new Error("تعذر تحديد العضو.");
  }

  const latestMessagesQuery = query(
    collection(db, CHALLENGE_STUDIO_CHAT_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  const latestMessagesSnapshot = await getDocs(latestMessagesQuery);

  const latestMessages: ChallengeStudioChatMessage[] =
    latestMessagesSnapshot.docs.map((docItem) => {
      const data = docItem.data();

      return {
        id: docItem.id,
        userId: String(data.userId || ""),
        userName: String(data.userName || "عضو"),
        text: String(data.text || ""),
        createdAt: toDate(data.createdAt),
      };
    });

  const lastUserMessage =
    latestMessages.find((message) => message.userId === userId) || null;

  if (lastUserMessage) {
    const lastText = normalizeMessage(lastUserMessage.text);

    if (lastText === cleanText) {
      throw new Error("لا يمكن تكرار نفس الرسالة مباشرة.");
    }

    if (lastUserMessage.createdAt) {
      const diff = Date.now() - lastUserMessage.createdAt.getTime();

      if (diff < MESSAGE_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil(
          (MESSAGE_COOLDOWN_MS - diff) / 1000
        );

        throw new Error(`انتظر ${remainingSeconds} ثواني قبل إرسال رسالة جديدة.`);
      }
    }
  }

  await addDoc(collection(db, CHALLENGE_STUDIO_CHAT_COLLECTION), {
    userId,
    userName: normalizeMessage(userName).slice(0, 40) || "عضو",
    text: cleanText,
    createdAt: serverTimestamp(),
  });
}

export async function sendChallengeStudioReply({
  messageId,
  userId,
  userName,
  text,
}: SendChallengeStudioReplyInput) {
  const cleanText = normalizeMessage(text);

  const textValidation = validateReplyText(cleanText);

  if (!textValidation.ok) {
    throw new Error(textValidation.error);
  }

  if (!messageId) {
    throw new Error("تعذر تحديد الرسالة.");
  }

  if (!userId) {
    throw new Error("سجّل دخولك أولًا للرد.");
  }

  await addDoc(collection(db, CHALLENGE_STUDIO_CHAT_REPLIES_COLLECTION), {
    messageId,
    userId,
    userName: normalizeMessage(userName).slice(0, 40) || "عضو",
    text: cleanText,
    createdAt: serverTimestamp(),
  });
}

export async function toggleChallengeStudioMessageLike({
  messageId,
  userId,
  userName,
}: ToggleChallengeStudioMessageLikeInput) {
  if (!messageId) {
    throw new Error("تعذر تحديد الرسالة.");
  }

  if (!userId) {
    throw new Error("سجّل دخولك أولًا للتفاعل.");
  }

  const likeId = buildLikeId(messageId, userId);
  const likeRef = doc(db, CHALLENGE_STUDIO_CHAT_LIKES_COLLECTION, likeId);
  const likeSnapshot = await getDoc(likeRef);

  if (likeSnapshot.exists()) {
    await deleteDoc(likeRef);
    return;
  }

  await setDoc(likeRef, {
    messageId,
    userId,
    userName: normalizeMessage(userName).slice(0, 40) || "عضو",
    createdAt: serverTimestamp(),
  });
}