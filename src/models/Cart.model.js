// src/models/Cart.model.js - UPDATED
import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
    },
  },
  { _id: true }, // Change to true to have unique IDs for items
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      sparse: true, // Allow null for guests
    },
    sessionId: {
      type: String,
      index: true,
      sparse: true, // Allow null for authenticated users
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  },
);

// Ensure either user or sessionId exists
cartSchema.pre("save", function (next) {
  if (!this.user && !this.sessionId) {
    throw new Error("Either user or sessionId is required");
  }
});

// Compound index for faster lookups
cartSchema.index({ user: 1, sessionId: 1 });

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
