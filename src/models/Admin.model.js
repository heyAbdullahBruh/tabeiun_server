import mongoose from "mongoose";
import bcrypt from "bcrypt";

export const AdminRole = {
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
};

const adminSchema = new mongoose.Schema(
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
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: Object.values(AdminRole),
      default: AdminRole.MODERATOR,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    // NEW FIELDS FOR PASSWORD RESET
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpiry: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving - FIXED VERSION
adminSchema.pre("save", async function (next) {
  // Only hash if password is modified
  if (!this.isModified("password")) {
    return;
  }

  try {
    const salt = 10;
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw new Error("Error: Something went wrong:P");
  }
});

// Compare password method
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

adminSchema.index({ role: 1, isActive: 1 });

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
