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
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpiry: {
      type: Date,
      select: false,
    },
    // NEW FIELDS FOR SETTINGS
    notificationPreferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        email: {
          orderNotifications: true,
          newUserAlerts: true,
          lowStockAlerts: true,
          dailySummary: false,
          weeklyReport: true,
          systemUpdates: true,
          marketingEmails: false,
        },
        inApp: {
          realTimeOrders: true,
          mentionNotifications: true,
          taskAssignments: true,
          commentReplies: false,
        },
        desktop: {
          enabled: false,
          soundAlerts: true,
          quietHours: {
            enabled: false,
            start: "22:00",
            end: "08:00",
          },
        },
        channels: {
          email: true,
          webhook: false,
        },
        priority: {
          high: ["email", "inApp"],
          medium: ["email"],
          low: [],
        },
      },
    },
    userPreferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        theme: "light",
        language: "en",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h",
        currency: "BDT",
        dashboard: {
          defaultView: "overview",
          widgets: ["stats", "recentOrders", "topProducts", "chart"],
          autoRefresh: true,
          refreshInterval: 30,
        },
        accessibility: {
          fontSize: "medium",
          highContrast: false,
          reducedMotion: false,
          screenReaderOptimized: false,
        },
        tableSettings: {
          defaultPageSize: 10,
          denseView: false,
        },
      },
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(
      parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    );
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw new Error("Error : Somw");
  }
});

// Compare password method
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

adminSchema.index({ role: 1, isActive: 1 });

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
