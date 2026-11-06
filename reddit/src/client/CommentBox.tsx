import { useState } from "react";
import { X } from "lucide-react";
import { postComment } from "./api";

/** Posts a comment on this puzzle's post, from the player's own account, with their score attached. */
export const CommentBox = ({ score }: { score: string | null }) => {
  const [text, setText] = useState("");
  const [withScore, setWithScore] = useState(!!score);
  const [status, setStatus] = useState<"idle" | "sending" | "posted" | "failed">("idle");
  const body = [text.trim(), withScore ? score : null].filter(Boolean).join("\n\n");

  const send = async () => {
    if (!body || status === "sending") return;
    setStatus("sending");
    try {
      const response = await postComment(body);
      setStatus(response.ok ? "posted" : "failed");
      if (response.ok) setText("");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "posted") return <p className="mt-3 text-sm font-extrabold text-[color:var(--gp-muted)]">Comment posted</p>;

  return (
    <form
      className="mt-3 text-left [@media(max-height:640px)]:mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <div className="flex gap-2">
        <input
          id="gp-comment"
          aria-label="Comment"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (status === "failed") setStatus("idle");
          }}
          maxLength={1900}
          placeholder="Add a comment"
          className="h-[44px] min-w-0 flex-1 rounded-full border-[2.5px] border-[#1F1633] bg-white px-4 text-[16px] font-bold outline-none placeholder:text-[color:var(--gp-muted)] focus:border-[#7C5CFF]"
        />
        <button type="submit" className="gp-btn !min-h-[44px] shrink-0 !px-4 text-sm" disabled={!body || status === "sending"}>
          {status === "sending" ? "Posting" : "Post"}
        </button>
      </div>
      <div className="mt-1 flex min-h-[20px] items-center gap-2 px-4 text-xs font-extrabold">
        {score &&
          (withScore ? (
            <span className="flex min-w-0 items-center gap-1 text-[color:var(--gp-muted)]">
              <span className="truncate">+ {score}</span>
              <button type="button" className="grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-[#F4ECE0]" onClick={() => setWithScore(false)} aria-label="Remove score">
                <X size={12} strokeWidth={3} />
              </button>
            </span>
          ) : (
            <button type="button" className="text-[color:var(--gp-accent)]" onClick={() => setWithScore(true)}>
              + Add score
            </button>
          ))}
        {status === "failed" && <span className="ml-auto shrink-0 text-[#C92841]">Couldn't post</span>}
      </div>
    </form>
  );
};
