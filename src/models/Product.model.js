import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    shortDescription: { type: String, required: true, trim: true },
    fullDescription: { type: String, required: true },

    medicineBenefits: [{ type: String, trim: true }],

    diseaseCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    diseaseTags: [{ type: String, trim: true }],
    ingredients: [{ type: String, trim: true }],

    dosageInstructions: String,
    usageInstructions: String,
    precautions: String,
    sideEffects: String,
    storageInstructions: String,

    manufacturer: { type: String, trim: true },
    weight: String,

    packagingType: {
      type: String,
      enum: ["Bottle", "Box", "Packet", "Strip", "Other"],
      default: "Box",
    },

    ageGroup: {
      type: String,
      enum: ["Child", "Adult", "Old", "All"],
      default: "All",
    },

    genderSpecific: {
      type: String,
      enum: ["Male", "Female", "Unisex"],
      default: "Unisex",
    },

    stock: { type: Number, required: true, min: 0, default: 0 },
    lowStockAlert: { type: Number, default: 10 },

    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },

    taxPercent: { type: Number, default: 0, min: 0, max: 100 },

    images: [
      {
        imageId: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],

    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },

    totalSold: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },

    // SEO Fields
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
  },
  { timestamps: true },
);

// 🔥 CLEAN SLUG GENERATOR
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/[^\u0980-\u09FF\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// 🔥 SINGLE PRE-SAVE (BEST PRACTICE)
productSchema.pre("save", async function () {
  try {
    // ======================
    // 1. SLUG GENERATION
    // ======================
    if (this.isModified("name")) {
      const baseSlug = generateSlug(this.name);

      // Short clean unique id (6 chars)
      const uniqueSuffix = new mongoose.Types.ObjectId().toString() || this._id;

      let finalSlug = `${baseSlug}-${uniqueSuffix}`;

      // Ensure uniqueness
      let exists = await mongoose.models.Product.findOne({
        slug: finalSlug,
      });

      let counter = 1;
      while (exists) {
        finalSlug = `${baseSlug}-${uniqueSuffix}-${counter}`;
        exists = await mongoose.models.Product.findOne({
          slug: finalSlug,
        });
        counter++;
      }

      this.slug = finalSlug;
    }

    // ======================
    // 2. SEO AUTO-GENERATION
    // ======================
    if (!this.metaTitle) {
      this.metaTitle = this.name;
    }

    if (!this.metaDescription) {
      this.metaDescription = this.shortDescription;
    }

    if (!this.keywords || this.keywords.length === 0) {
      this.keywords = [
        ...new Set([
          ...(this.medicineBenefits || []),
          ...(this.diseaseTags || []),
        ]),
      ];
    }
  } catch (err) {
    throw new Error("Error:" + err.message);
  }
});

// 🔥 VIRTUALS
productSchema.virtual("finalPrice").get(function () {
  if (this.discountPrice && this.discountPrice < this.price) {
    return this.discountPrice;
  }
  return this.price;
});

productSchema.virtual("isLowStock").get(function () {
  return this.stock <= this.lowStockAlert;
});

// 🔥 INDEXES (OPTIMIZED)
productSchema.index({ isPublished: 1, isDeleted: 1 });
productSchema.index({ diseaseCategory: 1, isPublished: 1 });
productSchema.index({ price: 1, ratingAverage: -1 });
productSchema.index({ diseaseTags: 1 });
productSchema.index({ medicineBenefits: 1 });

// 🔥 PAGINATION
productSchema.plugin(mongoosePaginate);

const Product = mongoose.model("Product", productSchema);
export default Product;
