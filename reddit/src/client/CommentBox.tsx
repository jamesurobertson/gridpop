import { useState } from "react";
import { Check, MessageSquare } from "lucide-react";
import { navigateTo } from "@devvit/web/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { DailyLevel } from "@/utils/dailyCore";
import { postComment } from "./api";

/**
 * Comments the player's score from their own account, after showing exactly what will post and
 * where (Reddit's rules for score comments). Once posted, the button opens the comment.
 */
export const CommentScore = ({
  level,
  score,
  username,
  postedUrl,
  onPosted,
}: {
  level: DailyLevel;
  /** The score line the server will post, e.g. "GridPop #4 Hard · 1:03". */
  score: string;
  username: string;
  postedUrl: string | null;
  onPosted: (url: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "failed">("idle");
  const note = message.trim();

  const send = async () => {
    if (status === "sending") return;
    setStatus("sending");
    try {
      const response = await postComment(level, note);
      if (!response.ok) return setStatus("failed");
      setStatus("idle");
      setOpen(false);
      onPosted(response.url);
    } catch {
      setStatus("failed");
    }
  };

  return (
    <>
      {postedUrl ? (
        <button className="gp-btn flex-1 whitespace-nowrap bg-[#EFEAFF] text-base text-[color:var(--gp-accent-edge)]" onClick={() => navigateTo(postedUrl)}>
          <Check size={18} strokeWidth={3} /> Commented
        </button>
      ) : (
        <button className="gp-btn flex-1 whitespace-nowrap text-base" onClick={() => setOpen(true)}>
          <MessageSquare size={18} strokeWidth={2.75} /> Comment score
        </button>
      )}
      <Dialog open={open} onOpenChange={(next) => status !== "sending" && setOpen(next)}>
        <DialogContent
          className="max-w-[min(92vw,384px)] gap-3 rounded-[28px] border-[2.5px] border-[#1F1633] bg-white p-5 outline-none [&>button:last-child]:hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogTitle className="font-display text-[22px] font-bold leading-tight">Comment your score</DialogTitle>
          <DialogDescription className="sr-only">Preview of the comment and where it posts</DialogDescription>
          <div className="rounded-2xl border-2 border-[color:var(--gp-line)] bg-[#FBF6EE] px-3.5 py-2.5 text-left text-sm font-bold">
            <div className="mb-1 text-xs font-extrabold text-[color:var(--gp-muted)]">u/{username}</div>
            {note && <p className="mb-1.5 whitespace-pre-wrap [overflow-wrap:anywhere]">{note}</p>}
            <p>{score}</p>
          </div>
          <textarea
            id="gp-comment-message"
            aria-label="Message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (status === "failed") setStatus("idle");
            }}
            maxLength={1500}
            rows={2}
            placeholder="Add a message"
            className="w-full resize-none rounded-2xl border-[2.5px] border-[#1F1633] bg-white px-3.5 py-2.5 text-[16px] font-bold outline-none placeholder:text-[color:var(--gp-muted)] focus:border-[#7C5CFF]"
          />
          <p className="text-left text-xs font-extrabold text-[color:var(--gp-muted)]" aria-live="polite">
            {status === "failed" ? <span className="text-[#C92841]">Couldn't post</span> : note ? `Posts in the comments as u/${username}` : `Posts under Today's scores as u/${username}`}
          </p>
          <div className="flex gap-2.5">
            <button className="gp-btn flex-1 text-base" onClick={() => setOpen(false)} disabled={status === "sending"}>
              Cancel
            </button>
            <button className="gp-btn gp-btn-primary flex-[1.4] whitespace-nowrap text-base" onClick={() => void send()} disabled={status === "sending"}>
              {status === "sending" ? "Posting…" : "Post comment"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
