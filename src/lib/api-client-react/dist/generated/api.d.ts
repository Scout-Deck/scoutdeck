import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { HealthStatus, ListOpportunitiesParams, Opportunity, OpportunityInput, Profile, ProfileInput } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListOpportunitiesUrl: (params?: ListOpportunitiesParams) => string;
/**
 * @summary List ranked opportunities
 */
export declare const listOpportunities: (params?: ListOpportunitiesParams, options?: Parameters<typeof customFetch>[1]) => Promise<Opportunity[]>;
export declare const getListOpportunitiesQueryKey: (params?: ListOpportunitiesParams) => readonly ["/api/opportunities", ...ListOpportunitiesParams[]];
export declare const getListOpportunitiesQueryOptions: <TData = Awaited<ReturnType<typeof listOpportunities>>, TError = ErrorType<unknown>>(params?: ListOpportunitiesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listOpportunities>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listOpportunities>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListOpportunitiesQueryResult = NonNullable<Awaited<ReturnType<typeof listOpportunities>>>;
export type ListOpportunitiesQueryError = ErrorType<unknown>;
/**
 * @summary List ranked opportunities
 */
export declare function useListOpportunities<TData = Awaited<ReturnType<typeof listOpportunities>>, TError = ErrorType<unknown>>(params?: ListOpportunitiesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listOpportunities>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSubmitOpportunityUrl: () => string;
/**
 * @summary Submit an opportunity URL
 */
export declare const submitOpportunity: (opportunityInput: OpportunityInput, options?: Parameters<typeof customFetch>[1]) => Promise<Opportunity>;
export declare const getSubmitOpportunityMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitOpportunity>>, TError, {
        data: BodyType<OpportunityInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof submitOpportunity>>, TError, {
    data: BodyType<OpportunityInput>;
}, TContext>;
export type SubmitOpportunityMutationResult = NonNullable<Awaited<ReturnType<typeof submitOpportunity>>>;
export type SubmitOpportunityMutationBody = BodyType<OpportunityInput>;
export type SubmitOpportunityMutationError = ErrorType<unknown>;
/**
* @summary Submit an opportunity URL
*/
export declare const useSubmitOpportunity: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitOpportunity>>, TError, {
        data: BodyType<OpportunityInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof submitOpportunity>>, TError, {
    data: BodyType<OpportunityInput>;
}, TContext>;
export declare const getGetOpportunityUrl: (id: string) => string;
/**
 * @summary Get opportunity details
 */
export declare const getOpportunity: (id: string, options?: Parameters<typeof customFetch>[1]) => Promise<Opportunity>;
export declare const getGetOpportunityQueryKey: (id: string) => readonly [`/api/opportunities/${string}`];
export declare const getGetOpportunityQueryOptions: <TData = Awaited<ReturnType<typeof getOpportunity>>, TError = ErrorType<void>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOpportunity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOpportunity>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOpportunityQueryResult = NonNullable<Awaited<ReturnType<typeof getOpportunity>>>;
export type GetOpportunityQueryError = ErrorType<void>;
/**
 * @summary Get opportunity details
 */
export declare function useGetOpportunity<TData = Awaited<ReturnType<typeof getOpportunity>>, TError = ErrorType<void>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOpportunity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetProfileUrl: () => string;
/**
 * @summary Get current profile
 */
export declare const getProfile: (options?: Parameters<typeof customFetch>[1]) => Promise<Profile>;
export declare const getGetProfileQueryKey: () => readonly ["/api/profile"];
export declare const getGetProfileQueryOptions: <TData = Awaited<ReturnType<typeof getProfile>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProfileQueryResult = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
export type GetProfileQueryError = ErrorType<unknown>;
/**
 * @summary Get current profile
 */
export declare function useGetProfile<TData = Awaited<ReturnType<typeof getProfile>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateProfileUrl: () => string;
/**
 * @summary Update current profile
 */
export declare const updateProfile: (profileInput: ProfileInput, options?: Parameters<typeof customFetch>[1]) => Promise<Profile>;
export declare const getUpdateProfileMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProfile>>, TError, {
        data: BodyType<ProfileInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProfile>>, TError, {
    data: BodyType<ProfileInput>;
}, TContext>;
export type UpdateProfileMutationResult = NonNullable<Awaited<ReturnType<typeof updateProfile>>>;
export type UpdateProfileMutationBody = BodyType<ProfileInput>;
export type UpdateProfileMutationError = ErrorType<unknown>;
/**
* @summary Update current profile
*/
export declare const useUpdateProfile: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProfile>>, TError, {
        data: BodyType<ProfileInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProfile>>, TError, {
    data: BodyType<ProfileInput>;
}, TContext>;
export declare const getListSavedOpportunitiesUrl: () => string;
/**
 * @summary List saved opportunities
 */
export declare const listSavedOpportunities: (options?: Parameters<typeof customFetch>[1]) => Promise<Opportunity[]>;
export declare const getListSavedOpportunitiesQueryKey: () => readonly ["/api/saved"];
export declare const getListSavedOpportunitiesQueryOptions: <TData = Awaited<ReturnType<typeof listSavedOpportunities>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSavedOpportunities>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSavedOpportunities>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSavedOpportunitiesQueryResult = NonNullable<Awaited<ReturnType<typeof listSavedOpportunities>>>;
export type ListSavedOpportunitiesQueryError = ErrorType<unknown>;
/**
 * @summary List saved opportunities
 */
export declare function useListSavedOpportunities<TData = Awaited<ReturnType<typeof listSavedOpportunities>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSavedOpportunities>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSaveOpportunityUrl: (id: string) => string;
/**
 * @summary Save an opportunity
 */
export declare const saveOpportunity: (id: string, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getSaveOpportunityMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveOpportunity>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof saveOpportunity>>, TError, {
    id: string;
}, TContext>;
export type SaveOpportunityMutationResult = NonNullable<Awaited<ReturnType<typeof saveOpportunity>>>;
export type SaveOpportunityMutationError = ErrorType<unknown>;
/**
* @summary Save an opportunity
*/
export declare const useSaveOpportunity: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveOpportunity>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof saveOpportunity>>, TError, {
    id: string;
}, TContext>;
export declare const getUnsaveOpportunityUrl: (id: string) => string;
/**
 * @summary Remove a saved opportunity
 */
export declare const unsaveOpportunity: (id: string, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getUnsaveOpportunityMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof unsaveOpportunity>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof unsaveOpportunity>>, TError, {
    id: string;
}, TContext>;
export type UnsaveOpportunityMutationResult = NonNullable<Awaited<ReturnType<typeof unsaveOpportunity>>>;
export type UnsaveOpportunityMutationError = ErrorType<unknown>;
/**
* @summary Remove a saved opportunity
*/
export declare const useUnsaveOpportunity: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof unsaveOpportunity>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof unsaveOpportunity>>, TError, {
    id: string;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map