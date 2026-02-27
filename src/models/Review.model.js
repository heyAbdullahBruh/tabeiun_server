import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      ref: "Order",
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    image: {
      imageId: String,
      url: String,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Ensure one review per user per product per order
reviewSchema.index({ user: 1, product: 1, orderId: 1 }, { unique: true });

// Index for approved reviews
reviewSchema.index({ product: 1, isApproved: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
