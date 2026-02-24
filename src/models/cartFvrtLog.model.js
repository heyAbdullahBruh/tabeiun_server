// Cart Model
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, default: 1 },
      },
    ],
  },
  { timestamps: true },
);

// Favourite Model
const favouriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  { timestamps: true },
);
favouriteSchema.index({ user: 1, product: 1 }, { unique: true });

// Admin Activity Log
const logSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    actionType: String, // CREATE_PRODUCT, UPDATE_ORDER, etc
    targetModel: String,
    targetId: mongoose.Schema.Types.ObjectId,
    details: String,
  },
  { timestamps: true },
);

export const Cart = mongoose.model("Cart", cartSchema);
export const Favourite = mongoose.model("Favourite", favouriteSchema);
export const ActivityLog = mongoose.model("ActivityLog", logSchema);
