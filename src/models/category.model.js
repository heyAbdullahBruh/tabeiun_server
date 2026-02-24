import mongoose from "mongoose";
import { generateBanglaSlug } from "../utils/slugify.js";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // Disease Name in Bangla
    slug: { type: String, unique: true, index: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    // SEO Fields
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
  },
  { timestamps: true },
);

categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = generateBanglaSlug(this.name);
  }
  next();
});

export const Category = mongoose.model("Category", categorySchema);
