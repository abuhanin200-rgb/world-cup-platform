"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ChallengeStudioChatLike,
  ChallengeStudioChatMessage,
  ChallengeStudioChatReply,
  sendChallengeStudioMessage,
  sendChallengeStudioReply,
  subscribeChallengeStudioMessageLikes,
  subscribeChallengeStudioMessageReplies,
  subscribeChallengeStudioMessages,
  toggleChallengeStudioMessageLike,
} from "@/lib/challengeStudioChat";

type OnlineMember = {
  userId: string;
  userName: string;
};

type ChallengeStudioAnalysisProps = {
  currentUserId: string;
  currentUserName: string;
  onlineMembers: OnlineMember[];
  onMemberClick: (userId: string) => void;
};

const MAX_MESSAGE_LENGTH = 250;
const MAX_REPLY_LENGTH = 150;
const MESSAGE_COOLDOWN_MS = 5000;

export default function ChallengeStudioAnalysis({
  currentUserId,
  currentUserName,
  onlineMembers,
  onMemberClick,
}: ChallengeStudioAnalysisProps) {
  const [messages, setMessages] = useState<ChallengeStudioChatMessage[]>([]);
  const [likes, setLikes] = useState<ChallengeStudioChatLike[]>([]);
  const [replies, setReplies] = useState<ChallengeStudioChatReply[]>([]);
  const [messageText, setMessageText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [error, setError] = useState("");
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [openLikesMessageId, setOpenLikesMessageId] = useState<string | null>(
    null
  );
  const [openReplyMessageId, setOpenReplyMessageId] = useState<string | null>(
    null
  );

  const messagesBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeChallengeStudioMessages(
      (newMessages) => {
        setMessages(newMessages);
      },
      () => {
        setError("تعذر تحميل رسائل 🎙️ استديو التحليل.");
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
        setError("تعذر تحميل تفاعلات 🎙️ استديو التحليل.");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeChallengeStudioMessageReplies(
      (newReplies) => {
        setReplies(newReplies);
      },
      () => {
        setError("تعذر تحميل ردود 🎙️ استديو التحليل.");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const messagesBox = messagesBoxRef.current;

    if (!messagesBox) return;

    messagesBox.scrollTop = messagesBox.scrollHeight;
  }, [messages.length, replies.length]);

  const cleanMessageText = useMemo(() => {
    return messageText.replace(/\s+/g, " ").trim();
  }, [messageText]);

  const cleanReplyText = useMemo(() => {
    return replyText.replace(/\s+/g, " ").trim();
  }, [replyText]);

  const remainingCharacters = MAX_MESSAGE_LENGTH - messageText.length;
  const remainingReplyCharacters = MAX_REPLY_LENGTH - replyText.length;

  const canSend =
    cleanMessageText.length > 0 &&
    cleanMessageText.length <= MAX_MESSAGE_LENGTH &&
    !sending;

  const canSendReply =
    cleanReplyText.length > 0 &&
    cleanReplyText.length <= MAX_REPLY_LENGTH &&
    !sendingReply;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!currentUserId) {
      setError("سجّل دخولك أولًا للمشاركة في 🎙️ استديو التحليل.");
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
      });

      setMessageText("");
      setError("");
      setLastSentAt(Date.now());
      setOpenLikesMessageId(null);
      setOpenReplyMessageId(null);
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

  async function handleSendReply(messageId: string) {
    setError("");

    if (!currentUserId) {
      setError("سجّل دخولك أولًا للرد.");
      return;
    }

    if (!cleanReplyText) {
      setError("اكتب الرد أولًا.");
      return;
    }

    if (cleanReplyText.length > MAX_REPLY_LENGTH) {
      setError(`الحد الأقصى للرد ${MAX_REPLY_LENGTH} حرفًا.`);
      return;
    }

    try {
      setSendingReply(true);

      await sendChallengeStudioReply({
        messageId,
        userId: currentUserId,
        userName: currentUserName || "عضو",
        text: cleanReplyText,
      });

      setReplyText("");
      setError("");
      setOpenReplyMessageId(null);
    } catch (replyError) {
      const message =
        replyError instanceof Error ? replyError.message : "تعذر إرسال الرد.";

      setError(message);
    } finally {
      setSendingReply(false);
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

  function getMessageLikes(messageId: string) {
    return likes.filter((like) => like.messageId === messageId);
  }

  function getMessageReplies(messageId: string) {
    return replies.filter((reply) => reply.messageId === messageId);
  }

  function isMessageLikedByMe(messageId: string) {
    return likes.some(
      (like) => like.messageId === messageId && like.userId === currentUserId
    );
  }

  return (
    <section
      dir="rtl"
      className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-white shadow-xl"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">🎙️ استديو التحليل</h2>

          <p className="mt-1 text-xs text-slate-400">
            مساحة سريعة لتحليلات الأعضاء أثناء التحدي.
          </p>
        </div>

        <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
          {onlineMembers.length} متواجد الآن
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="mb-2 text-xs font-bold text-slate-300">
          الأعضاء المتواجدون الآن
        </div>

        {onlineMembers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {onlineMembers.map((member) => (
              <button
                key={member.userId}
                type="button"
                onClick={() => onMemberClick(member.userId)}
                className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200 transition hover:bg-emerald-400/20"
              >
                🟢 {member.userName}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            لا يوجد أعضاء متواجدون الآن.
          </div>
        )}
      </div>

      <div
        ref={messagesBoxRef}
        className="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3"
      >
        {messages.length > 0 ? (
          messages.map((message) => {
            const isMine = message.userId === currentUserId;
            const messageLikes = getMessageLikes(message.id);
            const messageReplies = getMessageReplies(message.id);
            const likedByMe = isMessageLikedByMe(message.id);
            const replyBoxOpen = openReplyMessageId === message.id;

            return (
              <div
                key={message.id}
                className={`rounded-2xl border p-3 ${
                  isMine
                    ? "border-emerald-400/20 bg-emerald-400/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onMemberClick(message.userId)}
                  className="mb-1 text-sm font-black text-emerald-300 hover:underline"
                >
                  {message.userName}
                </button>

                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-100">
                  {message.text}
                </p>

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
                      onClick={() => {
                        setOpenLikesMessageId(null);
                        setOpenReplyMessageId((currentId) =>
                          currentId === message.id ? null : message.id
                        );
                        setReplyText("");
                      }}
                      className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-bold text-sky-200 hover:bg-sky-400/20"
                    >
                      رد{" "}
                      {messageReplies.length > 0
                        ? `(${messageReplies.length})`
                        : ""}
                    </button>

                    {openLikesMessageId === message.id &&
                      messageLikes.length > 0 && (
                        <div className="absolute bottom-9 right-0 z-20 w-52 rounded-2xl border border-white/10 bg-slate-950 p-3 shadow-2xl">
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
                    <div className="text-[11px] text-slate-500">
                      {message.createdAt.toLocaleTimeString("ar-SA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>

                {messageReplies.length > 0 && (
                  <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="text-[11px] font-black text-slate-400">
                      الردود
                    </div>

                    {messageReplies.map((reply) => (
                      <div
                        key={reply.id}
                        className="rounded-xl border border-white/10 bg-white/5 p-2"
                      >
                        <button
                          type="button"
                          onClick={() => onMemberClick(reply.userId)}
                          className="text-xs font-black text-sky-300 hover:underline"
                        >
                          {reply.userName}
                        </button>

                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-slate-200">
                          {reply.text}
                        </p>

                        {reply.createdAt && (
                          <div className="mt-1 text-[10px] text-slate-500">
                            {reply.createdAt.toLocaleTimeString("ar-SA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {replyBoxOpen && (
                  <div className="mt-3 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3">
                    <textarea
                      value={replyText}
                      onChange={(event) => {
                        setReplyText(event.target.value);
                        setError("");
                      }}
                      maxLength={MAX_REPLY_LENGTH}
                      placeholder="اكتب ردك... بدون روابط وبحد أقصى 150 حرف"
                      className="min-h-20 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                    />

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div
                        className={`text-[11px] ${
                          remainingReplyCharacters < 20
                            ? "text-amber-300"
                            : "text-slate-400"
                        }`}
                      >
                        المتبقي {remainingReplyCharacters} حرف
                      </div>

                      <button
                        type="button"
                        disabled={!canSendReply}
                        onClick={() => handleSendReply(message.id)}
                        className="rounded-xl bg-sky-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sendingReply ? "جاري الرد..." : "إرسال الرد"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">
            لا توجد رسائل حتى الآن. افتح التحليل يا بطل.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={messageText}
          onChange={(event) => {
            setMessageText(event.target.value);
            setError("");
          }}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="اكتب تحليلك هنا... بدون روابط وبحد أقصى 250 حرف"
          className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/50"
        />

        <div className="flex items-center justify-between gap-3">
          <div
            className={`text-xs ${
              remainingCharacters < 20 ? "text-amber-300" : "text-slate-500"
            }`}
          >
            المتبقي {remainingCharacters} حرف
          </div>

          <button
            type="submit"
            disabled={!canSend}
            className="rounded-2xl bg-emerald-500 px-5 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "جاري الإرسال..." : "إرسال"}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] font-bold leading-6 text-slate-400 md:text-xs">
          شروط 🎙️ استديو التحليل: الرسالة 250 حرف، الرد 150 حرف، بدون روابط،
          وبين كل رسالة ورسالة 5 ثواني.
        </div>

        {error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">
            {error}
          </div>
        )}
      </form>
    </section>
  );
}