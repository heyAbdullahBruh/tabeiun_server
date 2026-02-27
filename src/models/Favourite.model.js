import mongoose from "mongoose";

const favouriteSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  },
);

// Unique compound index to prevent duplicate favourites
favouriteSchema.index({ user: 1, product: 1 }, { unique: true });

// Index for querying user's favourites
favouriteSchema.index({ user: 1, createdAt: -1 });

const Favourite = mongoose.model("Favourite", favouriteSchema);
export default Favourite;
