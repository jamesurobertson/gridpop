import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { postComment } from "./api";

/** Posts the player's score as a comment on this puzzle's post, from their own account, with an optional message. */
export const CommentBox = ({ score }: { score: string }) => {
  const [text, setText] = useState("");
  const [writing, setWriting] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "posted" | "failed">("idle");

  const send = async () => {
    if (status === "sending") return;
    setStatus("sending");
    try {
      const response = await postComment([text.trim(), score].filter(Boolean).join("\n\n"));
      setStatus(response.ok ? "posted" : "failed");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "posted") return <p className="mt-3 text-sm font-extrabold text-[color:var(--gp-muted)] [@media(max-height:640px)]:mt-2">Score posted</p>;

  return (
    <form
      className="mt-3 flex flex-col gap-1.5 [@media(max-height:640px)]:mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {writing && (
        <input
          id="gp-comment"
          aria-label="Message"
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (status === "failed") setStatus("idle");
          }}
          maxLength={1900}
          placeholder="Add a message"
          className="h-[44px] w-full rounded-full border-[2.5px] border-[#1F1633] bg-white px-4 text-[16px] font-bold outline-none placeholder:text-[color:var(--gp-muted)] focus:border-[#7C5CFF]"
        />
      )}
      <button type="submit" className="gp-btn !min-h-[44px] w-full text-sm" disabled={status === "sending"}>
        <MessageSquare size={17} strokeWidth={2.75} />
        {status === "sending" ? "Posting" : "Post score"}
      </button>
      {(status === "failed" || !writing) && (
        <div className="flex min-h-[20px] items-center justify-center text-xs font-extrabold">
          {status === "failed" ? (
            <span className="text-[#C92841]">Couldn't post</span>
          ) : (
            <button type="button" className="text-[color:var(--gp-accent)]" onClick={() => setWriting(true)}>
              Add a message
            </button>
          )}
        </div>
      )}
    </form>
  );
};
