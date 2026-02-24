import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { generateBanglaSlug } from "../utils/slugify.js";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Bangla Name
    slug: { type: String, unique: true, index: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    medicineBenefits: [{ type: String }], // Array of benefits in Bangla
    diseaseCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    diseaseTags: [{ type: String }],
    ingredients: [{ type: String }],
    dosageInstructions: String,
    usageInstructions: String,
    precautions: String,
    sideEffects: String,
    storageInstructions: String,
    manufacturer: { type: String, default: "Tabeiun Herbal" },
    weight: String,
    packagingType: String,
    ageGroup: {
      type: String,
      enum: ["Child", "Adult", "Old"],
      default: "Adult",
    },
    genderSpecific: {
      type: String,
      enum: ["Male", "Female", "Unisex"],
      default: "Unisex",
    },

    stock: { type: Number, required: true, min: 0 },
    lowStockAlert: { type: Number, default: 5 },
    price: { type: Number, required: true },
    discountPrice: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 0 },

    images: [
      {
        imageId: String,
        url: String,
      },
    ],

    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    // SEO Fields (Auto-derived)
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
  },
  { timestamps: true },
);

productSchema.plugin(mongoosePaginate);

// Middleware to automate SEO and Slug
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = generateBanglaSlug(this.name);
    this.metaTitle = this.name;
  }
  if (this.isModified("shortDescription")) {
    this.metaDescription = this.shortDescription.substring(0, 160);
  }
  // Keywords = Benefits + Tags
  this.keywords = [...this.medicineBenefits, ...this.diseaseTags];
  next();
});

// Text index for search functionality
productSchema.index({
  name: "text",
  diseaseTags: "text",
  medicineBenefits: "text",
});

export const Product = mongoose.model("Product", productSchema);
