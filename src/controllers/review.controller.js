import { Review } from "../models/review.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";

export const submitReview = async (req, res) => {
  const { productId, orderId, rating, comment } = req.body;

  // 1. Verify User actually bought this product
  const order = await Order.findOne({
    _id: orderId,
    user: req.user._id,
    "products.product": productId,
    status: "Delivered",
  });
  if (!order) {
    return res
      .status(403)
      .json(
        new ApiResponse(
          403,
          null,
          "You can only review items you have purchased and received.",
        ),
      );
  }

  // 2. Create Review
  const review = await Review.create({
    user: req.user._id,
    product: productId,
    orderId,
    rating,
    comment,
  });

  // 3. Update Product Rating Average (Background)
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  await Product.findByIdAndUpdate(productId, {
    ratingAverage: stats[0].avgRating,
    ratingCount: stats[0].count,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        review,
        "Review submitted and product rating updated",
      ),
    );
};
