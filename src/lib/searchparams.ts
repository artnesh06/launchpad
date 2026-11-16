import {
  createSearchParamsCache,
  createSerializer,
  parseAsInteger,
  parseAsString
} from 'nuqs/server';

export const searchParams = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  name: parseAsString,
  gender: parseAsString,
  category: parseAsString,
  account: parseAsString,
  status: parseAsString,
  type: parseAsString,
  timeRange: parseAsString,
  // User-specific search parameters
  role: parseAsString,
  username: parseAsString,
  email: parseAsString,
  createdAtFrom: parseAsString,
  createdAtTo: parseAsString,
  lastLoginAtFrom: parseAsString,
  lastLoginAtTo: parseAsString,
  sortBy: parseAsString,
  sortOrder: parseAsString,
  matchType: parseAsString,
  direction: parseAsString
  // advanced filter
  // filters: getFiltersStateParser().withDefault([]),
  // joinOperator: parseAsStringEnum(['and', 'or']).withDefault('and')
};

export const searchParamsCache = createSearchParamsCache(searchParams);
export const serialize = createSerializer(searchParams);
