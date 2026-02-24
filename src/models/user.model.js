import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    provider: { type: String, enum: ["google", "facebook"], required: true },
    providerId: { type: String, required: true, unique: true },
    role: { type: String, default: "USER" },
    phone: { type: String, trim: true },
    address: {
      street: String,
      city: String,
      postalCode: String,
    },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
