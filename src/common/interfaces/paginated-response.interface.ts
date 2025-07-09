export interface PaginationMetaFormate {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface Paginatedresponse<T> {
  items: T[];
  meta: PaginationMetaFormate;
}
