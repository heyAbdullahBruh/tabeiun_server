import { Product } from "../models/product.model.js";

export const filterProductsService = async (queryParams) => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    ageGroup,
    genderSpecific,
    sort,
    page = 1,
    limit = 12,
  } = queryParams;

  let query = { isPublished: true, isDeleted: false };

  // 1. Category Filter
  if (category) query.diseaseCategory = category;

  // 2. Multi-field Search (Name, Benefits, Tags)
  if (search) {
    query.$text = { $search: search };
  }

  // 3. Price Range
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // 4. Age & Gender
  if (ageGroup) query.ageGroup = ageGroup;
  if (genderSpecific) query.genderSpecific = genderSpecific;

  // Sorting Logic
  let sortOptions = { createdAt: -1 };
  if (sort === "price_low") sortOptions = { price: 1 };
  if (sort === "price_high") sortOptions = { price: -1 };
  if (sort === "rating") sortOptions = { ratingAverage: -1 };

  const options = {
    page,
    limit,
    sort: sortOptions,
    populate: "diseaseCategory",
  };

  return await Product.paginate(query, options);
};
