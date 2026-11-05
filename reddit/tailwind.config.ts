import base from "../tailwind.config";

// Tailwind loads this file as CommonJS, so __dirname (not import.meta) is what's available.
export default {
  ...base,
  content: [`${__dirname}/src/client/**/*.{ts,tsx,html}`, `${__dirname}/../src/components/**/*.{ts,tsx}`],
};
