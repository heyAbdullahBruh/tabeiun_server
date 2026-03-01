import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["google", "facebook"],
      required: true,
    },
    providerId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["USER"],
      default: "USER",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: "Bangladesh" },
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for provider + providerId
userSchema.index({ provider: 1, providerId: 1 }, { unique: true });
userSchema.index({ email: 1, isBlocked: 1 });
userSchema.index({ createdAt: -1 });
s
const User = mongoose.model("User", userSchema);
export default User;
