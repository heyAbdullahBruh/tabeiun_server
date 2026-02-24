import { Category } from "../models/category.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createCategory = async (req, res) => {
  const category = await Category.create(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, category, "Category Created"));
};

export const getAllCategories = async (req, res) => {
  const categories = await Category.find({ isActive: true });
  return res
    .status(200)
    .json(new ApiResponse(200, categories, "Categories Fetched"));
};

export const updateCategory = async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category Updated"));
};
