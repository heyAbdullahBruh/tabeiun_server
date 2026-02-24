import { Product } from "../models/product.model.js";

export const validateAndReduceStock = async (products) => {
  // We use a session or bulk write for atomicity
  const bulkOps = products.map((item) => {
    return {
      updateOne: {
        filter: { _id: item.product, stock: { $gte: item.quantity } },
        update: { $inc: { stock: -item.quantity, totalSold: item.quantity } },
      },
    };
  });

  const result = await Product.bulkWrite(bulkOps);

  if (result.modifiedCount !== products.length) {
    throw new Error("Some items are out of stock or insufficient quantity");
  }
  return true;
};

export const restoreStock = async (products) => {
  const bulkOps = products.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: { $inc: { stock: item.quantity, totalSold: -item.quantity } },
    },
  }));
  await Product.bulkWrite(bulkOps);
};
