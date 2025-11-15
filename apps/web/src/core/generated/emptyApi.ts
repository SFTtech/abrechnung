import { apiBaseQuery } from "../api";
import { createApi } from "@reduxjs/toolkit/query/react";

/**
 * This is the base template for generated api slices
 */
export const emptySplitApi = createApi({
    baseQuery: apiBaseQuery,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
    endpoints: () => ({}),
});
