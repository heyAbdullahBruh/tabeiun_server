/**
 * Advanced query builder for product filtering
 */
export class QueryBuilder {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = [
      "page",
      "sort",
      "limit",
      "fields",
      "search",
      "stockStatus",
      "isPublished",
      "diseaseCategory",
      // Price filters - handled separately by filterByPrice()
      "minPrice",
      "maxPrice",
      // Other filters handled separately
      "age",
      "gender",
      "disease",
      "minRating",
    ];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering with operators
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // Start with base filter (isDeleted: false)
    this.query = this.query.find({ isDeleted: false });

    // Apply additional filters if they exist
    const parsedQuery = JSON.parse(queryStr);
    if (Object.keys(parsedQuery).length > 0) {
      this.query = this.query.find(parsedQuery);
    }

    return this;
  }

  search() {
    if (this.queryString.search) {
      const searchTerm = this.queryString.search;
      this.query = this.query.find({
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { shortDescription: { $regex: searchTerm, $options: "i" } },
          { medicineBenefits: { $in: [new RegExp(searchTerm, "i")] } },
          { diseaseTags: { $in: [new RegExp(searchTerm, "i")] } },
        ],
      });
    }
    return this;
  }

  filterByDisease() {
    if (this.queryString.disease) {
      this.query = this.query.find({
        diseaseTags: { $in: [this.queryString.disease] },
      });
    }
    return this;
  }

  filterByAgeGender() {
    const filters = [];

    if (this.queryString.age) {
      filters.push({ ageGroup: this.queryString.age });
    }

    if (this.queryString.gender && this.queryString.gender !== "Unisex") {
      filters.push({
        $or: [
          { genderSpecific: this.queryString.gender },
          { genderSpecific: "Unisex" },
        ],
      });
    }

    if (filters.length > 0) {
      this.query = this.query.find({ $and: filters });
    }
    return this;
  }

  filterByPrice() {
    if (this.queryString.minPrice || this.queryString.maxPrice) {
      const minPrice = this.queryString.minPrice
        ? parseFloat(this.queryString.minPrice)
        : 0;
      const maxPrice = this.queryString.maxPrice
        ? parseFloat(this.queryString.maxPrice)
        : 999999;

      // Filter by regular price
      this.query = this.query.find({
        price: { $gte: minPrice, $lte: maxPrice },
      });
    }
    return this;
  }

  filterByRating() {
    if (this.queryString.minRating) {
      this.query = this.query.find({
        ratingAverage: { $gte: parseFloat(this.queryString.minRating) },
      });
    }
    return this;
  }

  filterByStockStatus() {
    if (this.queryString.stockStatus) {
      const status = this.queryString.stockStatus;

      if (status === "in") {
        this.query = this.query.find({
          $expr: { $gt: ["$stock", { $ifNull: ["$lowStockAlert", 10] }] },
        });
      } else if (status === "low") {
        this.query = this.query.find({
          $and: [
            {
              $expr: { $lte: ["$stock", { $ifNull: ["$lowStockAlert", 10] }] },
            },
            { stock: { $gt: 0 } },
          ],
        });
      } else if (status === "out") {
        this.query = this.query.find({ stock: 0 });
      }
    }
    return this;
  }

  filterByPublishStatus() {
    if (this.queryString.isPublished !== undefined) {
      this.query = this.query.find({
        isPublished: this.queryString.isPublished === "true",
      });
    }
    return this;
  }

  filterByCategory() {
    if (this.queryString.diseaseCategory) {
      this.query = this.query.find({
        diseaseCategory: this.queryString.diseaseCategory,
      });
    }
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  paginate() {
    const page = parseInt(this.queryString.page) || 1;
    const limit = parseInt(this.queryString.limit) || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  async getTotalCount() {
    // Clone the query to get count without pagination
    const countQuery = this.query.model.find(this.query._conditions);
    return await countQuery.countDocuments();
  }
}
