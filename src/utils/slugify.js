export const generateBanglaSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\u0980-\u09FFa-z0-9-]/g, "") // Keep Bangla characters, English alphanumerics and -
    .replace(/--+/g, "-"); // Replace multiple - with single -
};
