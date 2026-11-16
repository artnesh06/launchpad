import { 
  QueryParams, 
  FilterCondition, 
  FilterOperator, 
  QueryBuilder as IQueryBuilder 
} from '@/types/api';

export class QueryBuilder implements IQueryBuilder {
  private query: QueryParams = {};
  private whereConditions: FilterCondition[] = [];
  private orWhereConditions: FilterCondition[] = [];

  where(field: string, operator: FilterOperator, value: any): QueryBuilder {
    this.whereConditions.push({
      field,
      operator,
      value,
      type: this.inferType(value)
    });
    return this;
  }

  orWhere(field: string, operator: FilterOperator, value: any): QueryBuilder {
    this.orWhereConditions.push({
      field,
      operator,
      value,
      type: this.inferType(value)
    });
    return this;
  }

  whereIn(field: string, values: any[]): QueryBuilder {
    return this.where(field, 'in', values);
  }

  whereNotIn(field: string, values: any[]): QueryBuilder {
    return this.where(field, 'nin', values);
  }

  whereBetween(field: string, start: any, end: any): QueryBuilder {
    return this.where(field, 'between', [start, end]);
  }

  whereNull(field: string): QueryBuilder {
    return this.where(field, 'isNull', null);
  }

  whereNotNull(field: string): QueryBuilder {
    return this.where(field, 'isNotNull', null);
  }

  search(query: string, fields?: string[]): QueryBuilder {
    this.query.search = query;
    if (fields) {
      this.query.filters = {
        ...this.query.filters,
        searchFields: fields
      };
    }
    return this;
  }

  sort(field: string, order: 'asc' | 'desc' = 'asc'): QueryBuilder {
    if (!this.query.multiSort) {
      this.query.multiSort = [];
    }
    this.query.multiSort.push({ field, order });
    
    // Also set single sort for backward compatibility
    this.query.sortBy = field;
    this.query.sortOrder = order;
    
    return this;
  }

  page(page: number, limit: number = 10): QueryBuilder {
    this.query.page = page;
    this.query.limit = limit;
    this.query.offset = (page - 1) * limit;
    return this;
  }

  include(relations: string[]): QueryBuilder {
    this.query.include = relations;
    return this;
  }

  select(fields: string[]): QueryBuilder {
    this.query.fields = fields;
    return this;
  }

  dateRange(startDate: string, endDate: string, field: string = 'createdAt'): QueryBuilder {
    this.query.dateRange = { startDate, endDate, field };
    return this;
  }

  build(): QueryParams {
    const result: QueryParams = { ...this.query };

    if (this.whereConditions.length > 0) {
      result.where = this.whereConditions;
    }

    if (this.orWhereConditions.length > 0) {
      result.orWhere = this.orWhereConditions;
    }

    return result;
  }

  private inferType(value: any): 'string' | 'number' | 'boolean' | 'date' | 'array' {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string' && !isNaN(Date.parse(value))) return 'date';
    return 'string';
  }

  // Static helper methods
  static create(): QueryBuilder {
    return new QueryBuilder();
  }

  static fromParams(params: URLSearchParams): QueryBuilder {
    const builder = new QueryBuilder();
    
    // Basic pagination
    if (params.get('page')) {
      builder.page(parseInt(params.get('page')!), parseInt(params.get('limit') || '10'));
    }
    
    // Sorting
    if (params.get('sortBy')) {
      builder.sort(params.get('sortBy')!, params.get('sortOrder') as 'asc' | 'desc' || 'asc');
    }
    
    // Search
    if (params.get('search')) {
      builder.search(params.get('search')!);
    }
    
    // Date range
    if (params.get('startDate') && params.get('endDate')) {
      builder.dateRange(
        params.get('startDate')!,
        params.get('endDate')!,
        params.get('dateField') || 'createdAt'
      );
    }
    
    // Dynamic filters
    Array.from(params.keys()).forEach(key => {
      if (!['page', 'limit', 'sortBy', 'sortOrder', 'search', 'startDate', 'endDate', 'dateField'].includes(key)) {
        if (key.startsWith('filter_')) {
          const field = key.replace('filter_', '');
          const value = params.get(key);
          if (value) {
            builder.where(field, 'eq', value);
          }
        }
      }
    });
    
    return builder;
  }
}

// Utility functions for query parameter handling
export const queryUtils = {
  /**
   * Convert URL search params to query parameters
   */
  fromSearchParams(searchParams: URLSearchParams): QueryParams {
    return QueryBuilder.fromParams(searchParams).build();
  },

  /**
   * Convert query parameters to URL search params
   */
  toSearchParams(query: QueryParams): URLSearchParams {
    const params = new URLSearchParams();
    
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());
    if (query.sortBy) params.set('sortBy', query.sortBy);
    if (query.sortOrder) params.set('sortOrder', query.sortOrder);
    if (query.search) params.set('search', query.search);
    
    if (query.dateRange) {
      if (query.dateRange.startDate) params.set('startDate', query.dateRange.startDate);
      if (query.dateRange.endDate) params.set('endDate', query.dateRange.endDate);
      if (query.dateRange.field) params.set('dateField', query.dateRange.field);
    }
    
    // Add filters
    if (query.filters) {
      Object.entries(query.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.set(`filter_${key}`, value.toString());
        }
      });
    }
    
    // Add where conditions
    if (query.where) {
      query.where.forEach((condition, index) => {
        params.set(`where_${index}_field`, condition.field);
        params.set(`where_${index}_operator`, condition.operator);
        params.set(`where_${index}_value`, JSON.stringify(condition.value));
      });
    }
    
    return params;
  },

  /**
   * Merge multiple query parameters
   */
  merge(...queries: QueryParams[]): QueryParams {
    return queries.reduce((merged, query) => {
      return {
        ...merged,
        ...query,
        filters: { ...merged.filters, ...query.filters },
        where: [...(merged.where || []), ...(query.where || [])],
        orWhere: [...(merged.orWhere || []), ...(query.orWhere || [])],
        include: [...(merged.include || []), ...(query.include || [])],
        fields: [...(merged.fields || []), ...(query.fields || [])]
      };
    }, {} as QueryParams);
  },

  /**
   * Create a query for data table
   */
  forDataTable(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, any>;
  }): QueryParams {
    const builder = QueryBuilder.create();
    
    if (params.page) builder.page(params.page, params.limit);
    if (params.search) builder.search(params.search);
    if (params.sortBy) builder.sort(params.sortBy, params.sortOrder);
    
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          builder.where(key, 'eq', value);
        }
      });
    }
    
    return builder.build();
  }
};