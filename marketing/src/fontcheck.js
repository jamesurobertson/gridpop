// Records which web fonts actually loaded, so render.sh can catch a silent fallback.
document.fonts.ready.then(() => {
  const faces = [...document.fonts].map((face) => `${face.family.replace(/"/g, "")} ${face.weight} ${face.status}`);
  document.documentElement.dataset.fonts = faces.join(", ");
});
