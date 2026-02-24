import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: true },
    image: { imageId: String, url: String },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Prevent multiple reviews for same product in same order
reviewSchema.index({ user: 1, product: 1, orderId: 1 }, { unique: true });

export const Review = mongoose.model("Review", reviewSchema);
