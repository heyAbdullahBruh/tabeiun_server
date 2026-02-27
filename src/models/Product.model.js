import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
    },
    fullDescription: {
      type: String,
      required: true,
    },
    medicineBenefits: [
      {
        type: String,
        trim: true,
      },
    ],
    diseaseCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    diseaseTags: [
      {
        type: String,
        trim: true,
      },
    ],
    ingredients: [
      {
        type: String,
        trim: true,
      },
    ],
    dosageInstructions: {
      type: String,
    },
    usageInstructions: {
      type: String,
    },
    precautions: {
      type: String,
    },
    sideEffects: {
      type: String,
    },
    storageInstructions: {
      type: String,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    weight: {
      type: String,
    },
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
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lowStockAlert: {
      type: Number,
      default: 10,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      min: 0,
    },
    taxPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    images: [
      {
        imageId: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    totalSold: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    // SEO Fields (auto-derived)
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
    },
    keywords: [String],
  },
  {
    timestamps: true,
  },
);

// Generate slug from name
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\u0980-\u09FF\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

// Auto-generate SEO fields
productSchema.pre("save", function (next) {
  this.metaTitle = this.name;
  this.metaDescription = this.shortDescription;
  this.keywords = [...new Set([...this.medicineBenefits, ...this.diseaseTags])];
  next();
});

// Calculate discounted price
productSchema.virtual("finalPrice").get(function () {
  if (this.discountPrice && this.discountPrice < this.price) {
    return this.discountPrice;
  }
  return this.price;
});

// Check if low stock
productSchema.virtual("isLowStock").get(function () {
  return this.stock <= this.lowStockAlert;
});

// Indexes for performance
productSchema.index({ isPublished: 1, isDeleted: 1 });
productSchema.index({ diseaseCategory: 1, isPublished: 1 });
productSchema.index({ price: 1, ratingAverage: -1 });
productSchema.index({ diseaseTags: 1 });
productSchema.index({ medicineBenefits: 1 });
productSchema.index({ slug: 1 }, { unique: true });

// Pagination plugin
productSchema.plugin(mongoosePaginate);

const Product = mongoose.model("Product", productSchema);
export default Product;
