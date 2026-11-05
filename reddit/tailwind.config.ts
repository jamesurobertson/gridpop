import base from "../tailwind.config";

export default {
  ...base,
  content: [`${__dirname}/src/client/**/*.{ts,tsx,html}`, `${__dirname}/../src/components/**/*.{ts,tsx}`],
};
