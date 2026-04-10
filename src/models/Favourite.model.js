// src/models/Favourite.model.js - UPDATED
import mongoose from "mongoose";

const favouriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      sparse: true,
    },
    sessionId: {
      type: String,
      index: true,
      sparse: true,
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

// Unique indexes for user+product and sessionId+product
favouriteSchema.index(
  { user: 1, product: 1 },
  { unique: true, partialFilterExpression: { user: { $exists: true } } },
);

favouriteSchema.index(
  { sessionId: 1, product: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $exists: true } } },
);

// Index for querying
favouriteSchema.index({ user: 1, createdAt: -1 });
favouriteSchema.index({ sessionId: 1, createdAt: -1 });

const Favourite = mongoose.model("Favourite", favouriteSchema);
export default Favourite;
