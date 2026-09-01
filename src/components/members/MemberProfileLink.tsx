import Link from "next/link";
import type { ReactNode } from "react";

export default function MemberProfileLink({
  userId,
  children,
  className = "",
}: {
  userId: string;
  children: ReactNode;
  className?: string;
}) {
  if (!userId) return <span className={className}>{children}</span>;
  return (
    <Link
      href={`/members/${encodeURIComponent(userId)}`}
      className={`rounded-md outline-none transition hover:text-[var(--brand-yellow)] focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)]/45 ${className}`}
    >
      {children}
    </Link>
  );
}
