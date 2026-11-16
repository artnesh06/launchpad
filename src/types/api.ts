// API request and response types for filtering, pagination, and sorting
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortingParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  multiSort?: Array<{
    field: string;
    order: 'asc' | 'desc';
  }>;
}

export interface FilterParams {
  search?: string;
  filters?: Record<string, any>;
  dateRange?: {
    startDate?: string;
    endDate?: string;
    field?: string;
  };
  // Advanced filtering
  where?: FilterCondition[];
  orWhere?: FilterCondition[];
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

export type FilterOperator = 
  | 'eq'        // equals
  | 'ne'        // not equals
  | 'gt'        // greater than
  | 'gte'       // greater than or equal
  | 'lt'        // less than
  | 'lte'       // less than or equal
  | 'like'      // contains (case sensitive)
  | 'ilike'     // contains (case insensitive)
  | 'in'        // in array
  | 'nin'       // not in array
  | 'isNull'    // is null
  | 'isNotNull' // is not null
  | 'isEmpty'   // is empty string
  | 'isNotEmpty' // is not empty string
  | 'startsWith' // starts with
  | 'endsWith'   // ends with
  | 'between';   // between two values

export interface QueryParams extends PaginationParams, SortingParams, FilterParams {
  include?: string[];
  exclude?: string[];
  fields?: string[];
  joinOperator?: 'and' | 'or';
  groupBy?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
  error?: string;
}

export interface ListResponse<T = any> {
  items: T[];
  meta: PaginationMeta;
}

// Data table specific types
export interface DataTableQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  columns?: string[];
}

export interface DataTableResponse<T = any> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  aggregations?: Record<string, any>;
}

// Service method options
export interface ServiceOptions {
  include?: string[];
  exclude?: string[];
  populate?: string[];
  select?: string[];
  lean?: boolean;
  cache?: boolean;
  timeout?: number;
}

// Query builder interface
export interface QueryBuilder {
  where(field: string, operator: FilterOperator, value: any): QueryBuilder;
  orWhere(field: string, operator: FilterOperator, value: any): QueryBuilder;
  whereIn(field: string, values: any[]): QueryBuilder;
  whereNotIn(field: string, values: any[]): QueryBuilder;
  whereBetween(field: string, start: any, end: any): QueryBuilder;
  whereNull(field: string): QueryBuilder;
  whereNotNull(field: string): QueryBuilder;
  search(query: string, fields?: string[]): QueryBuilder;
  sort(field: string, order?: 'asc' | 'desc'): QueryBuilder;
  page(page: number, limit?: number): QueryBuilder;
  include(relations: string[]): QueryBuilder;
  select(fields: string[]): QueryBuilder;
  build(): QueryParams;
}