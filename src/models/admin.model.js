import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "../constants/index.js";

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    password: { type: String, required: true, select: false }, // Select false for security
    role: {
      type: String,
      enum: [ROLES.ADMIN, ROLES.MODERATOR],
      default: ROLES.MODERATOR,
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true },
);

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const Admin = mongoose.model("Admin", adminSchema);
