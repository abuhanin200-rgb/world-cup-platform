"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ChallengeStudioChatLike,
  ChallengeStudioChatMessage,
  canEditChallengeStudioMessage,
  deleteChallengeStudioMessage,
  editChallengeStudioMessage,
  sendChallengeStudioMessage,
  subscribeChallengeStudioMessageLikes,
  subscribeChallengeStudioMessages,
  toggleChallengeStudioMessageLike,
} from "@/lib/challengeStudioChat";

type OnlineMember = {
  userId: string;
  userName: string;
};

type MentionCandidate = {
  userId: string;
  userName: string;
  isOnline: boolean;
};

type ChallengeStudioAnalysisProps = {
  currentUserId: string;
  currentUserName: string;
  onlineMembers: OnlineMember[];
  onMemberClick: (userId: string) => void;
};

const MAX_MESSAGE_LENGTH = 250;
const MESSAGE_COOLDOWN_MS = 5000;
const CHAT_ADMIN_NAMES = [
  "عبدالسلام العنزي",
  "عبدالسلام بن حمدي العنزي",
  "أبو راكان",
];

const STUDIO_TERMS = [
  "🚀 السوبر ذهبي",
  "🔥 فرصة الريمونتادا",
  "🎯 ضربة بالملي",
  "📈 قفزة الترتيب",
  "🧨 قنبلة الجولة",
  "🐎 الحصان الأسود",
  "🚨 إنذار للمتصدر",
  "🌪️ عاصفة الجولة",
];

const scrollOnceViewport = {
  once: true,
  amount: 0.14,
} as const;

const sectionMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: "easeOut",
    },
  },
};

const itemMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: "easeOut",
    },
  },
};

const messageMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
};

const bubbleMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 5,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.18,
      ease: "easeOut",
    },
  },
};

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getMentionSearch(text: string) {
  const match = text.match(/(^|\s)@([^@\n]*)$/);

  if (!match) return null;

  return normalizeText(match[2] || "");
}

export default function ChallengeStudioAnalysis({
  currentUserId,
  currentUserName,
  onlineMembers,
  onMemberClick,
}: ChallengeStudioAnalysisProps) {
  const [messages, setMessages] = useState<ChallengeStudioChatMessage[]>([]);
  const [likes, setLikes] = useState<ChallengeStudioChatLike[]>([]);
  const [messageText, setMessageText] = useState("");
  const [editText, setEditText] = useState("");
  const [sending, setSending] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [openLikesMessageId, setOpenLikesMessageId] = useState<string | null>(
    null
  );
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] =
    useState<ChallengeStudioChatMessage | null>(null);
  const [newReplyNotificationIds, setNewReplyNotificationIds] = useState<
    string[]
  >([]);
  const [newMentionNotificationIds, setNewMentionNotificationIds] = useState<
    string[]
  >([]);

  const messagesBoxRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const didInitializeReplyNotificationsRef = useRef(false);
  const seenReplyMessageIdsRef = useRef<Set<string>>(new Set());
  const didInitializeMentionNotificationsRef = useRef(false);
  const seenMentionMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = subscribeChallengeStudioMessages(
      (newMessages) => {
        setMessages(newMessages);
      },
      () => {
        setError("تعذر تحميل رسائل 🎙️ استوديو التحليل.");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeChallengeStudioMessageLikes(
      (newLikes) => {
        setLikes(newLikes);
      },
      () => {
        setError("تعذر تحميل تفاعلات 🎙️ استوديو التحليل.");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const messagesBox = messagesBoxRef.current;

    if (!messagesBox) return;

    messagesBox.scrollTop = messagesBox.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (!currentUserId || messages.length === 0) return;

    const repliesToMe = messages.filter(
      (message) =>
        message.replyToUserId === currentUserId &&
        message.userId !== currentUserId
    );

    if (!didInitializeReplyNotificationsRef.current) {
      repliesToMe.forEach((message) => {
        seenReplyMessageIdsRef.current.add(message.id);
      });

      didInitializeReplyNotificationsRef.current = true;
      return;
    }

    const newReplyIds = repliesToMe
      .filter((message) => !seenReplyMessageIdsRef.current.has(message.id))
      .map((message) => message.id);

    if (newReplyIds.length === 0) return;

    newReplyIds.forEach((messageId) => {
      seenReplyMessageIdsRef.current.add(messageId);
    });

    setNewReplyNotificationIds((currentIds) => [
      ...currentIds,
      ...newReplyIds,
    ]);
  }, [currentUserId, messages]);

  useEffect(() => {
    if (!currentUserId || !currentUserName || messages.length === 0) return;

    const cleanName = normalizeText(currentUserName);

    if (!cleanName) return;

    const mentionRegex = new RegExp(`@${escapeRegExp(cleanName)}(\\s|$)`, "i");

    const mentionMessages = messages.filter(
      (message) =>
        message.userId !== currentUserId && mentionRegex.test(message.text)
    );

    if (!didInitializeMentionNotificationsRef.current) {
      mentionMessages.forEach((message) => {
        seenMentionMessageIdsRef.current.add(message.id);
      });

      didInitializeMentionNotificationsRef.current = true;
      return;
    }

    const newMentionIds = mentionMessages
      .filter((message) => !seenMentionMessageIdsRef.current.has(message.id))
      .map((message) => message.id);

    if (newMentionIds.length === 0) return;

    newMentionIds.forEach((messageId) => {
      seenMentionMessageIdsRef.current.add(messageId);
    });

    setNewMentionNotificationIds((currentIds) => [
      ...currentIds,
      ...newMentionIds,
    ]);
  }, [currentUserId, currentUserName, messages]);

  const cleanMessageText = useMemo(() => {
    return normalizeText(messageText);
  }, [messageText]);

  const cleanEditText = useMemo(() => {
    return normalizeText(editText);
  }, [editText]);

  const remainingCharacters = MAX_MESSAGE_LENGTH - messageText.length;
  const remainingEditCharacters = MAX_MESSAGE_LENGTH - editText.length;

  const canSend =
    cleanMessageText.length > 0 &&
    cleanMessageText.length <= MAX_MESSAGE_LENGTH &&
    !sending;

  const canSaveEdit =
    cleanEditText.length > 0 &&
    cleanEditText.length <= MAX_MESSAGE_LENGTH &&
    !savingEdit;

  const mentionSearch = useMemo(() => {
    return getMentionSearch(messageText);
  }, [messageText]);

  const mentionCandidates = useMemo<MentionCandidate[]>(() => {
    const onlineMap = new Map<string, MentionCandidate>();

    onlineMembers.forEach((member) => {
      if (!member.userId || !member.userName) return;

      onlineMap.set(member.userId, {
        userId: member.userId,
        userName: member.userName,
        isOnline: true,
      });
    });

    messages
      .slice()
      .reverse()
      .forEach((message) => {
        if (!message.userId || !message.userName) return;

        if (!onlineMap.has(message.userId)) {
          onlineMap.set(message.userId, {
            userId: message.userId,
            userName: message.userName,
            isOnline: false,
          });
        }
      });

    const search = normalizeText(mentionSearch || "");

    return Array.from(onlineMap.values())
      .filter((member) => {
        if (member.userId === currentUserId) return false;

        if (!search) return true;

        return member.userName.includes(search);
      })
      .sort((first, second) => {
        if (first.isOnline !== second.isOnline) {
          return first.isOnline ? -1 : 1;
        }

        return first.userName.localeCompare(second.userName, "ar");
      })
      .slice(0, 8);
  }, [currentUserId, mentionSearch, messages, onlineMembers]);

  const shouldShowMentionList =
    mentionSearch !== null && mentionCandidates.length > 0;

  const canManageChat = CHAT_ADMIN_NAMES.includes(normalizeText(currentUserName));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!currentUserId) {
      setError("سجّل دخولك أولًا للمشاركة في 🎙️ استوديو التحليل.");
      return;
    }

    if (!cleanMessageText) {
      setError("اكتب رسالتك أولًا.");
      return;
    }

    if (cleanMessageText.length > MAX_MESSAGE_LENGTH) {
      setError(`الحد الأقصى للرسالة ${MAX_MESSAGE_LENGTH} حرفًا.`);
      return;
    }

    if (lastSentAt) {
      const diff = Date.now() - lastSentAt;

      if (diff < MESSAGE_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil(
          (MESSAGE_COOLDOWN_MS - diff) / 1000
        );

        setError(`انتظر ${remainingSeconds} ثواني قبل إرسال رسالة جديدة.`);
        return;
      }
    }

    try {
      setSending(true);

      await sendChallengeStudioMessage({
        userId: currentUserId,
        userName: currentUserName || "عضو",
        text: cleanMessageText,
        replyToMessage: replyingToMessage,
      });

      setMessageText("");
      setError("");
      setLastSentAt(Date.now());
      setOpenLikesMessageId(null);
      setEditingMessageId(null);
      setEditText("");
      setReplyingToMessage(null);
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "تعذر إرسال الرسالة.";

      setError(message);
    } finally {
      setSending(false);
    }
  }

  async function handleToggleLike(messageId: string) {
    setError("");

    if (!currentUserId) {
      setError("سجّل دخولك أولًا للتفاعل.");
      return;
    }

    try {
      await toggleChallengeStudioMessageLike({
        messageId,
        userId: currentUserId,
        userName: currentUserName || "عضو",
      });
    } catch (likeError) {
      const message =
        likeError instanceof Error ? likeError.message : "تعذر تسجيل الإعجاب.";

      setError(message);
    }
  }

  function startEditingMessage(message: ChallengeStudioChatMessage) {
    setError("");
    setOpenLikesMessageId(null);
    setReplyingToMessage(null);
    setEditingMessageId(message.id);
    setEditText(message.text);
  }

  function cancelEditingMessage() {
    setEditingMessageId(null);
    setEditText("");
    setSavingEdit(false);
  }

  async function handleSaveEdit(messageId: string) {
    setError("");

    if (!currentUserId) {
      setError("سجّل دخولك أولًا لتعديل الرسالة.");
      return;
    }

    if (!cleanEditText) {
      setError("اكتب نص الرسالة أولًا.");
      return;
    }

    if (cleanEditText.length > MAX_MESSAGE_LENGTH) {
      setError(`الحد الأقصى للرسالة ${MAX_MESSAGE_LENGTH} حرفًا.`);
      return;
    }

    try {
      setSavingEdit(true);

      await editChallengeStudioMessage({
        messageId,
        userId: currentUserId,
        text: cleanEditText,
      });

      setEditingMessageId(null);
      setEditText("");
      setError("");
    } catch (editError) {
      const message =
        editError instanceof Error ? editError.message : "تعذر تعديل الرسالة.";

      setError(message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteMessage(message: ChallengeStudioChatMessage) {
  setError("");

  if (!canManageChat) {
    setError("حذف الرسائل متاح للمشرف فقط.");
    return;
  }

  const confirmDelete = window.confirm(
    `حذف رسالة ${message.userName}؟\n\n${message.text}`
  );

  if (!confirmDelete) return;

  try {
    setDeletingMessageId(message.id);

    await deleteChallengeStudioMessage({
      messageId: message.id,
    });

    setOpenLikesMessageId(null);
    setEditingMessageId(null);

    if (replyingToMessage?.id === message.id) {
      setReplyingToMessage(null);
    }

    setError("");
  } catch (deleteError) {
    const messageText =
      deleteError instanceof Error
        ? deleteError.message
        : "تعذر حذف الرسالة.";

    setError(messageText);
  } finally {
    setDeletingMessageId(null);
  }
}

  function startReplyingToMessage(message: ChallengeStudioChatMessage) {
    setError("");
    setOpenLikesMessageId(null);
    setEditingMessageId(null);
    setEditText("");
    setReplyingToMessage(message);

    window.setTimeout(() => {
      messageInputRef.current?.focus();
    }, 0);
  }

  function cancelReplyingToMessage() {
    setReplyingToMessage(null);
  }

  function getMessageLikes(messageId: string) {
    return likes.filter((like) => like.messageId === messageId);
  }

  function isMessageLikedByMe(messageId: string) {
    return likes.some(
      (like) => like.messageId === messageId && like.userId === currentUserId
    );
  }

  function handleShowNewReplies() {
    setNewReplyNotificationIds([]);

    const messagesBox = messagesBoxRef.current;

    if (!messagesBox) return;

    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function handleShowMentions() {
    setNewMentionNotificationIds([]);

    const messagesBox = messagesBoxRef.current;

    if (!messagesBox) return;

    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function insertMention(member: MentionCandidate | OnlineMember) {
    const mention = `@${member.userName} `;
    const replacedText = messageText.replace(/(^|\s)@([^@\n]*)$/, (match) => {
      const startsWithSpace = match.startsWith(" ");

      return `${startsWithSpace ? " " : ""}${mention}`;
    });

    const nextText =
      replacedText === messageText
        ? messageText.endsWith(" ")
          ? `${messageText}${mention}`
          : `${messageText} ${mention}`
        : replacedText;

    setMessageText(nextText.slice(0, MAX_MESSAGE_LENGTH));
    setError("");

    window.setTimeout(() => {
      messageInputRef.current?.focus();
    }, 0);
  }

  function renderMessageText(text: string) {
    const parts = text.split(/(@[^\s]+(?:\s+[^\s@]+)?)/g);

    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={`${part}-${index}`}
            className="rounded-full bg-sky-400/15 px-1.5 py-0.5 font-black text-sky-200"
          >
            {part}
          </span>
        );
      }

      return <span key={`${part}-${index}`}>{part}</span>;
    });
  }

  return (
    <motion.section
      dir="rtl"
      variants={sectionMotion}
      initial="hidden"
      animate="show"
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 p-4 text-white shadow-lg shadow-slate-950/25 backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-cyan-300/8" />
      <div className="pointer-events-none absolute -right-24 top-10 h-44 w-44 rounded-full bg-emerald-300/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-44 w-44 rounded-full bg-cyan-300/10 blur-2xl" />
      <div className="relative">
      <motion.div variants={itemMotion} className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">🎙️ رادار استوديو التحدي</h2>

          <p className="mt-1 text-xs text-slate-400">
            ساحة سريعة للتحليل، المنشن، الردود، والطقطقة الرياضية الخفيفة.
          </p>
        </div>

        <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
          {onlineMembers.length} متواجد الآن
        </div>
      </motion.div>

      <motion.div variants={itemMotion} className="mb-4 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-3 shadow-md shadow-amber-950/10">
        <div className="mb-2 text-xs font-black text-amber-100">
          مصطلحات الاستوديو الجديدة
        </div>

        <div className="flex flex-wrap gap-2">
          {STUDIO_TERMS.map((term) => (
            <span
              key={term}
              className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1 text-[11px] font-black text-amber-50"
            >
              {term}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemMotion} className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-3 shadow-md shadow-slate-950/15">
        <div className="mb-2 text-xs font-bold text-slate-300">
          الأعضاء المتواجدون الآن
        </div>

        {onlineMembers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {onlineMembers.map((member) => (
              <motion.button
                key={member.userId}
                type="button"
                onClick={() => insertMention(member)}
                whileTap={{ scale: 0.98 }}
                className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200 transition hover:bg-emerald-400/20"
                title="اضغط لإضافة منشن"
              >
                🟢 {member.userName}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            لا يوجد أعضاء متواجدون الآن.
          </div>
        )}

        <div className="mt-2 text-[11px] font-bold text-slate-500">
          اكتب @ داخل خانة الرسالة لعرض قائمة المنشن. المتواجدون يظهرون أولًا.
        </div>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {newReplyNotificationIds.length > 0 && (
        <motion.div
          variants={itemMotion}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          className="mb-3 rounded-2xl border border-sky-400/30 bg-sky-400/10 p-3 shadow-md shadow-sky-950/10"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[14px] font-black text-sky-100">
              🔔 عندك {newReplyNotificationIds.length} رد جديد على رسائلك
            </div>

            <button
              type="button"
              onClick={handleShowNewReplies}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/15"
            >
              عرض الردود
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
      {newMentionNotificationIds.length > 0 && (
        <motion.div
          variants={itemMotion}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          className="mb-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 shadow-md shadow-amber-950/10"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[14px] font-black text-amber-100">
              🚩 عندك {newMentionNotificationIds.length} منشن جديد في استوديو
              التحليل
            </div>

            <button
              type="button"
              onClick={handleShowMentions}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/15"
            >
              عرض المنشن
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <motion.div
        variants={itemMotion}
        ref={messagesBoxRef}
        className="mb-4 h-[56vh] min-h-[460px] space-y-3 overflow-y-auto rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_35%),rgba(0,0,0,0.18)] p-3 md:h-[64vh] md:min-h-[520px]"
      >
        {messages.length > 0 ? (
          messages.map((message) => {
            const isMine = message.userId === currentUserId;
            const messageLikes = getMessageLikes(message.id);
            const likedByMe = isMessageLikedByMe(message.id);
            const editBoxOpen = editingMessageId === message.id;
            const canEditThisMessage =
              isMine && canEditChallengeStudioMessage(message);

            return (
             <motion.div
  key={message.id}
  variants={messageMotion}
  initial="hidden"
  animate="show"
  layout
  className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
>
  <motion.div
    variants={bubbleMotion}
    whileTap={{ scale: 0.99 }}
    className={`relative max-w-[82%] rounded-3xl border px-4 py-3 shadow-md md:max-w-[68%] ${
      isMine
        ? "rounded-br-md border-emerald-300/30 bg-gradient-to-br from-emerald-500/25 to-emerald-700/20 text-right shadow-emerald-950/30"
        : "rounded-bl-md border-sky-300/15 bg-gradient-to-br from-slate-800/90 to-slate-950/80 text-right shadow-slate-950/40"
    }`}
  >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <button
  type="button"
  onClick={() => onMemberClick(message.userId)}
  className={`text-[14px] font-black hover:underline ${
    isMine ? "text-emerald-100" : "text-sky-300"
  }`}
>
  {isMine ? "أنت" : message.userName}
</button>

                    {message.isEdited && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-400">
                        تم التعديل
                      </span>
                    )}
                  </div>

                  {message.replyToMessageId && (
                    <div className="mb-2 rounded-2xl border-r-4 border-sky-400 bg-sky-400/10 px-3 py-2">
                      <div className="text-[11px] font-black text-sky-200">
                        ردًا على {message.replyToUserName || "عضو"}
                      </div>

                      <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">
                        {message.replyToText || "رسالة"}
                      </div>
                    </div>
                  )}

                  {editBoxOpen ? (
                    <div className="mt-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3">
                      <textarea
                        value={editText}
                        onChange={(event) => {
                          setEditText(event.target.value);
                          setError("");
                        }}
                        maxLength={MAX_MESSAGE_LENGTH}
                        placeholder="عدّل رسالتك..."
                        className="min-h-20 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-[12px] text-white outline-none placeholder:text-slate-500 focus:border-amber-400/50"
                      />

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div
                          className={`text-[11px] ${
                            remainingEditCharacters < 20
                              ? "text-amber-300"
                              : "text-slate-400"
                          }`}
                        >
                          المتبقي {remainingEditCharacters}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={cancelEditingMessage}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-200 hover:bg-white/10"
                          >
                            إلغاء
                          </button>

                          <button
                            type="button"
                            disabled={!canSaveEdit}
                            onClick={() => handleSaveEdit(message.id)}
                            className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingEdit ? "حفظ..." : "حفظ"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p
  className={`whitespace-pre-wrap break-words text-[14px] leading-7 ${
    isMine ? "text-emerald-50" : "text-slate-100"
  }`}
>
                      {renderMessageText(message.text)}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(message.id)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-black transition ${
                          likedByMe
                            ? "border-rose-400/40 bg-rose-400/15 text-rose-200"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        ❤️ {messageLikes.length}
                      </button>

                      {messageLikes.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenLikesMessageId((currentId) =>
                              currentId === message.id ? null : message.id
                            )
                          }
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10"
                        >
                          المعجبين
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => startReplyingToMessage(message)}
                        className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-bold text-sky-200 hover:bg-sky-400/20"
                      >
                        رد
                      </button>

                      {canEditThisMessage && !editBoxOpen && (
                        <button
                          type="button"
                          onClick={() => startEditingMessage(message)}
                          className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-400/20"
                        >
                          تعديل
                        </button>
                      )}

{canManageChat && (
  <button
    type="button"
    disabled={deletingMessageId === message.id}
    onClick={() => handleDeleteMessage(message)}
    className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[11px] font-bold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {deletingMessageId === message.id ? "حذف..." : "حذف"}
  </button>
)}

                      {openLikesMessageId === message.id &&
                        messageLikes.length > 0 && (
                          <div className="absolute bottom-9 right-0 z-20 w-52 rounded-2xl border border-white/10 bg-slate-950 p-3 shadow-lg">
                            <div className="mb-2 text-[11px] font-black text-slate-300">
                              أعجب بهذه الرسالة
                            </div>

                            <div className="max-h-52 space-y-2 overflow-y-auto">
                              {messageLikes.map((like) => (
                                <button
                                  key={like.id}
                                  type="button"
                                  onClick={() => {
                                    setOpenLikesMessageId(null);
                                    onMemberClick(like.userId);
                                  }}
                                  className="block w-full rounded-xl bg-white/5 px-3 py-2 text-right text-xs font-bold text-slate-200 hover:bg-white/10"
                                >
                                  ❤️ {like.userName}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>

                    {message.createdAt && (
                      <div
  className={`text-[10px] ${
    isMine ? "text-emerald-100/70" : "text-slate-500"
  }`}
>
                        {message.createdAt.toLocaleTimeString("ar-SA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })
        ) : (
          <div className="flex h-full items-center justify-center text-center text-[14px] text-slate-500">
            لا توجد رسائل حتى الآن. افتح رادار الاستوديو يا بطل.
          </div>
        )}
      </motion.div>

      <motion.form variants={itemMotion} onSubmit={handleSubmit} className="space-y-3">
        {replyingToMessage && (
          <div className="rounded-2xl border border-sky-400/25 bg-sky-400/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black text-sky-200">
                  ردًا على {replyingToMessage.userName}
                </div>

                <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">
                  {replyingToMessage.text}
                </div>
              </div>

              <button
                type="button"
                onClick={cancelReplyingToMessage}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-white hover:bg-white/15"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          {shouldShowMentionList && (
            <div className="absolute bottom-full right-2 z-30 mb-2 w-72 rounded-3xl border border-white/10 bg-slate-950 p-2 shadow-lg">
              <div className="mb-2 px-2 text-[11px] font-black text-slate-400">
                اختر عضو للمنشن
              </div>

              <div className="max-h-64 space-y-1 overflow-y-auto">
                {mentionCandidates.map((member) => (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => insertMention(member)}
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-right text-xs font-black text-slate-100 hover:bg-white/10"
                  >
                    <span>{member.userName}</span>

                    <span
                      className={`text-[10px] ${
                        member.isOnline ? "text-emerald-300" : "text-slate-500"
                      }`}
                    >
                      {member.isOnline ? "متواجد" : "شارك مؤخرًا"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-[2rem] border border-white/10 bg-white/5 p-2">
            <textarea
              ref={messageInputRef}
              value={messageText}
              onChange={(event) => {
                setMessageText(event.target.value);
                setError("");
              }}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={1}
              placeholder={
                replyingToMessage ? "اكتب ردك..." : "اكتب رسالتك..."
              }
              className="max-h-28 min-h-11 flex-1 resize-none rounded-[1.5rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-[14px] text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/50"
            />

            <motion.button
              type="submit"
              disabled={!canSend}
              whileTap={canSend ? { scale: 0.96, y: 1 } : undefined}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-black text-slate-950 shadow-md shadow-emerald-500/15 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              title="إرسال"
            >
              ➤
            </motion.button>
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500">
          <span>المتبقي {remainingCharacters} حرف</span>
          <span>اكتب @ للمنشن • بدون روابط</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] font-bold leading-6 text-slate-400 md:text-xs">
          شروط 🎙️ رادار الاستوديو: الرسالة 250 حرف، بدون روابط، تعديل الرسالة
          متاح لمدة 5 دقائق، وبين كل رسالة ورسالة 5 ثواني. استخدم المنشن بحماس
          وخل التحليل رياضيًا ومحترمًا.
        </div>

        <AnimatePresence mode="popLayout">
          {error && (
            <motion.div
              key={error}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-[14px] font-bold text-red-200"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.form>
      </div>
    </motion.section>
  );
}