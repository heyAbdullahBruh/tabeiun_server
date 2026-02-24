import { Cart } from "../models/cart.model.js";
import { Favourite } from "../models/favourite.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const toggleFavourite = async (req, res) => {
  const { productId } = req.body;
  const exists = await Favourite.findOne({
    user: req.user._id,
    product: productId,
  });

  if (exists) {
    await Favourite.findByIdAndDelete(exists._id);
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Removed from favourites"));
  }

  await Favourite.create({ user: req.user._id, product: productId });
  return res
    .status(201)
    .json(new ApiResponse(201, null, "Added to favourites"));
};

export const updateCart = async (req, res) => {
  const { items } = req.body; // Array of {product, quantity}
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { items },
    { upsert: true, new: true },
  );
  return res.status(200).json(new ApiResponse(200, cart, "Cart updated"));
};
