import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
  },
  {
    timestamps: true,
  },
);

// 🔥 Slug Generator Function
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/[^\u0980-\u09FF\w\s-]/g, "") // keep Bangla + English
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// 🔥 Pre-save hook
categorySchema.pre("save", async function (next) {
  if (!this.isModified("name")) return;

  const baseSlug = generateSlug(this.name);

  // Short unique id (cleaner than full ObjectId)
  const uniqueSuffix = new mongoose.Types.ObjectId().toString();

  let finalSlug = `${baseSlug}-${uniqueSuffix}`;

  // Ensure uniqueness (extra safety)
  let slugExists = await mongoose.models.Category.findOne({
    slug: finalSlug,
  });

  let counter = 1;
  while (slugExists) {
    finalSlug = `${baseSlug}-${uniqueSuffix}-${counter}`;
    slugExists = await mongoose.models.Category.findOne({
      slug: finalSlug,
    });
    counter++;
  }

  this.slug = finalSlug;
});

categorySchema.index({ isActive: 1, slug: 1 });

const Category = mongoose.model("Category", categorySchema);
export default Category;
