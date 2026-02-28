/**
 * Base service class with common CRUD operations
 */
export class BaseService {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    try {
      const document = await this.model.create(data);
      return document;
    } catch (error) {
      throw new Error(`Create failed: ${error.message}`);
    }
  }

  async findById(id, populate = []) {
    try {
      let query = this.model.findById(id);
      if (populate.length) {
        populate.forEach((field) => {
          query = query.populate(field);
        });
      }
      return await query;
    } catch (error) {
      throw new Error(`Find by ID failed: ${error.message}`);
    }
  }

  async findOne(conditions, populate = []) {
    try {
      let query = this.model.findOne(conditions);
      if (populate.length) {
        populate.forEach((field) => {
          query = query.populate(field);
        });
      }
      return await query;
    } catch (error) {
      throw new Error(`Find one failed: ${error.message}`);
    }
  }

  async find(conditions = {}, options = {}) {
    try {
      const {
        sort = "-createdAt",
        limit = 10,
        skip = 0,
        populate = [],
        select = "-__v",
      } = options;

      let query = this.model
        .find(conditions)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .select(select);

      if (populate.length) {
        populate.forEach((field) => {
          query = query.populate(field);
        });
      }

      const documents = await query;
      const total = await this.model.countDocuments(conditions);

      return {
        data: documents,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + documents.length < total,
        },
      };
    } catch (error) {
      throw new Error(`Find failed: ${error.message}`);
    }
  }

  async update(id, data, options = { new: true }) {
    try {
      const document = await this.model.findByIdAndUpdate(id, data, options);
      return document;
    } catch (error) {
      throw new Error(`Update failed: ${error.message}`);
    }
  }

  async delete(id, softDelete = true) {
    try {
      if (softDelete) {
        return await this.model.findByIdAndUpdate(id, { isDeleted: true });
      } else {
        return await this.model.findByIdAndDelete(id);
      }
    } catch (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  async bulkDelete(ids, softDelete = true) {
    try {
      if (softDelete) {
        return await this.model.updateMany(
          { _id: { $in: ids } },
          { isDeleted: true },
        );
      } else {
        return await this.model.deleteMany({ _id: { $in: ids } });
      }
    } catch (error) {
      throw new Error(`Bulk delete failed: ${error.message}`);
    }
  }
}
