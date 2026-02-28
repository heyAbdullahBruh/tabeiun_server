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
    const excludedFields = ["page", "sort", "limit", "fields", "search"];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering with operators
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // Add isDeleted filter for soft delete
    if (!queryObj.includeDeleted) {
      this.query = this.query.find({ isDeleted: false });
    }

    this.query = this.query.find(JSON.parse(queryStr));
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
      const priceFilter = {};
      if (this.queryString.minPrice) {
        priceFilter.$gte = parseFloat(this.queryString.minPrice);
      }
      if (this.queryString.maxPrice) {
        priceFilter.$lte = parseFloat(this.queryString.maxPrice);
      }
      this.query = this.query.find({
        $expr: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$discountPrice", null] },
                { $lt: ["$discountPrice", "$price"] },
              ],
            },
            then: {
              $and: [
                { $gte: ["$discountPrice", priceFilter.$gte || 0] },
                { $lte: ["$discountPrice", priceFilter.$lte || Infinity] },
              ],
            },
            else: {
              $and: [
                { $gte: ["$price", priceFilter.$gte || 0] },
                { $lte: ["$price", priceFilter.$lte || Infinity] },
              ],
            },
          },
        },
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
    const countQuery = { ...this.query._conditions };
    return await this.query.model.countDocuments(countQuery);
  }
}
