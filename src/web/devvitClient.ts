// Stands in for @devvit/web/client when the Reddit game runs on the website (see vite.config.ts).
// Only what the game's components call; nothing here talks to Reddit.

export const context: { subredditName?: string } = {};

export const showLoginPrompt = () => undefined;

export async function showShareSheet({ text }: { title?: string; text: string }) {
  if (navigator.share) return navigator.share({ text });
  await navigator.clipboard?.writeText(text);
  showToast("Copied");
}

export const requestExpandedMode = () => undefined;

export function showToast(text: string) {
  const toast = document.createElement("div");
  toast.textContent = text;
  toast.setAttribute("role", "status");
  toast.className =
    "fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border-2 border-[#1F1633] bg-white px-4 py-2 text-sm font-extrabold text-[#1F1633] shadow-[0_3px_0_#1F1633]";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}
