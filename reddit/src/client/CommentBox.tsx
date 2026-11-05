import { useState } from "react";
import { postComment } from "./api";

/** Posts a comment on this puzzle's post, from the player's own account. */
export const CommentBox = () => {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "posted" | "failed">("idle");

  const send = async () => {
    if (!text.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const response = await postComment(text);
      setStatus(response.ok ? "posted" : "failed");
      if (response.ok) setText("");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "posted") return <p className="mt-4 text-sm font-extrabold text-[color:var(--gp-muted)]">Comment posted</p>;

  return (
    <div className="mt-4 text-left">
      <label htmlFor="gp-comment" className="gp-label mb-1.5 block px-2.5">
        Comment
      </label>
      <textarea
        id="gp-comment"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (status === "failed") setStatus("idle");
        }}
        maxLength={2000}
        rows={2}
        placeholder="How did it go?"
        className="w-full resize-none rounded-2xl border-[2.5px] border-[#1F1633] bg-white px-3 py-2 text-[16px] font-bold outline-none placeholder:text-[color:var(--gp-muted)] focus:border-[#7C5CFF]"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold text-[#C92841]">{status === "failed" ? "Couldn't post" : ""}</span>
        <button className="gp-btn !min-h-[40px] !px-4 text-sm" disabled={!text.trim() || status === "sending"} onClick={() => void send()}>
          {status === "sending" ? "Posting" : "Post comment"}
        </button>
      </div>
    </div>
  );
};
