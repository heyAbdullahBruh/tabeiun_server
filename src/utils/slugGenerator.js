export const generateBanglaSlug = (text) => {
  if (!text) return "";

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\u0980-\u09FF\w\s-]/g, "") // Keep Bangla unicode range + alphanumeric
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+|-+$/g, ""); // Trim - from start and end
};

/**
 * Generate unique slug with counter
 */
export const generateUniqueSlug = async (model, baseText, field = "slug") => {
  const baseSlug = generateBanglaSlug(baseText);
  let slug = baseSlug;
  let counter = 1;

  while (await model.findOne({ [field]: slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};
