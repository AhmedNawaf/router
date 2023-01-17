import invariant from 'tiny-invariant'
import { GetFrameworkGeneric } from './frameworks'

import {
  LinkInfo,
  LinkOptions,
  NavigateOptions,
  ToOptions,
  ValidFromPath,
  ResolveRelativePath,
} from './link'
import {
  cleanPath,
  interpolatePath,
  joinPaths,
  matchPathname,
  resolvePath,
  trimPath,
} from './path'
import { AnyRoute, createRoute, Route } from './route'
import {
  AnyLoaderData,
  AnyPathParams,
  AnyRouteConfig,
  AnySearchSchema,
  LoaderContext,
  RouteConfig,
  SearchFilter,
} from './routeConfig'
import {
  AllRouteInfo,
  AnyAllRouteInfo,
  RouteInfo,
  RoutesById,
} from './routeInfo'
import { createRouteMatch, RouteMatch, RouteMatchStore } from './routeMatch'
import { defaultParseSearch, defaultStringifySearch } from './searchParams'
import { createStore, batch, Store } from './store'
import {
  functionalUpdate,
  last,
  NoInfer,
  pick,
  PickAsRequired,
  PickRequired,
  Timeout,
  Updater,
} from './utils'
import { replaceEqualDeep } from './interop'

export interface RegisterRouter {
  // router: Router
}

export type AnyRouter = Router<any, any, any>

export type RegisteredRouter = RegisterRouter extends {
  router: Router<infer TRouteConfig, infer TAllRouteInfo, infer TRouterContext>
}
  ? Router<TRouteConfig, TAllRouteInfo, TRouterContext>
  : Router

export type RegisteredAllRouteInfo = RegisterRouter extends {
  router: Router<infer TRouteConfig, infer TAllRouteInfo, infer TRouterContext>
}
  ? TAllRouteInfo
  : AnyAllRouteInfo

export interface LocationState {}

export interface ParsedLocation<
  TSearchObj extends AnySearchSchema = {},
  TState extends LocationState = LocationState,
> {
  href: string
  pathname: string
  search: TSearchObj
  searchStr: string
  state: TState
  hash: string
  key?: string
}

export interface FromLocation {
  pathname: string
  search?: unknown
  key?: string
  hash?: string
}

export type SearchSerializer = (searchObj: Record<string, any>) => string
export type SearchParser = (searchStr: string) => Record<string, any>
export type FilterRoutesFn = <TRoute extends Route<any, RouteInfo>>(
  routeConfigs: TRoute[],
) => TRoute[]

export interface RouterOptions<
  TRouteConfig extends AnyRouteConfig,
  TRouterContext,
> {
  stringifySearch?: SearchSerializer
  parseSearch?: SearchParser
  filterRoutes?: FilterRoutesFn
  defaultPreload?: false | 'intent'
  defaultPreloadMaxAge?: number
  defaultPreloadGcMaxAge?: number
  defaultPreloadDelay?: number
  defaultComponent?: GetFrameworkGeneric<'Component'>
  defaultErrorComponent?: GetFrameworkGeneric<'ErrorComponent'>
  defaultPendingComponent?: GetFrameworkGeneric<'Component'>
  defaultLoaderMaxAge?: number
  defaultLoaderGcMaxAge?: number
  caseSensitive?: boolean
  routeConfig?: TRouteConfig
  basepath?: string
  useServerData?: boolean
  createRouter?: (router: AnyRouter) => void
  createRoute?: (opts: { route: AnyRoute; router: AnyRouter }) => void
  context?: TRouterContext
  loadComponent?: (
    component: GetFrameworkGeneric<'Component'>,
  ) => Promise<GetFrameworkGeneric<'Component'>>
  onRouteChange?: () => void
}

export interface Loader<
  TFullSearchSchema extends AnySearchSchema = {},
  TAllParams extends AnyPathParams = {},
  TRouteLoaderData = AnyLoaderData,
> {
  fetch: keyof PickRequired<TFullSearchSchema> extends never
    ? keyof TAllParams extends never
      ? (loaderContext: { signal?: AbortSignal }) => Promise<TRouteLoaderData>
      : (loaderContext: {
          params: TAllParams
          search?: TFullSearchSchema
          signal?: AbortSignal
        }) => Promise<TRouteLoaderData>
    : keyof TAllParams extends never
    ? (loaderContext: {
        search: TFullSearchSchema
        params: TAllParams
        signal?: AbortSignal
      }) => Promise<TRouteLoaderData>
    : (loaderContext: {
        search: TFullSearchSchema
        signal?: AbortSignal
      }) => Promise<TRouteLoaderData>
  current?: LoaderState<TFullSearchSchema, TAllParams>
  latest?: LoaderState<TFullSearchSchema, TAllParams>
  pending: LoaderState<TFullSearchSchema, TAllParams>[]
}

export interface LoaderState<
  TFullSearchSchema extends AnySearchSchema = {},
  TAllParams extends AnyPathParams = {},
> {
  loadedAt: number
  loaderContext: LoaderContext<TFullSearchSchema, TAllParams>
}

export interface RouterStore<
  TSearchObj extends AnySearchSchema = {},
  TState extends LocationState = LocationState,
> {
  status: 'idle' | 'loading'
  latestLocation: ParsedLocation<TSearchObj, TState>
  currentMatches: RouteMatch[]
  currentLocation: ParsedLocation<TSearchObj, TState>
  pendingMatches?: RouteMatch[]
  pendingLocation?: ParsedLocation<TSearchObj, TState>
  lastUpdated: number
  loaders: Record<string, Loader>
  isFetching: boolean
  isPreloading: boolean
  matchCache: Record<string, MatchCacheEntry>
}

export type ListenerFn = () => void

export interface BuildNextOptions {
  to?: string | number | null
  params?: true | Updater<unknown>
  search?: true | Updater<unknown>
  hash?: true | Updater<string>
  state?: LocationState
  key?: string
  from?: string
  fromCurrent?: boolean
  __preSearchFilters?: SearchFilter<any>[]
  __postSearchFilters?: SearchFilter<any>[]
}

export type MatchCacheEntry = {
  gc: number
  match: RouteMatch
}

export interface MatchLocation {
  to?: string | number | null
  fuzzy?: boolean
  caseSensitive?: boolean
  from?: string
  fromCurrent?: boolean
}

export interface MatchRouteOptions {
  pending?: boolean
  caseSensitive?: boolean
  fuzzy?: boolean
}

type LinkCurrentTargetElement = {
  preloadTimeout?: null | ReturnType<typeof setTimeout>
}

export interface DehydratedRouterState
  extends Pick<
    RouterStore,
    'status' | 'latestLocation' | 'currentLocation' | 'lastUpdated'
  > {
  currentMatches: DehydratedRouteMatch[]
}

export interface DehydratedRouter<TRouterContext = unknown> {
  // location: Router['__location']
  state: DehydratedRouterState
  context: TRouterContext
}

export type MatchCache = Record<string, MatchCacheEntry>

interface DehydratedRouteMatch {
  matchId: string
  state: Pick<
    RouteMatchStore<any, any>,
    'status' | 'routeLoaderData' | 'invalid' | 'invalidAt'
  >
}

export interface RouterContext {}

export interface Router<
  TRouteConfig extends AnyRouteConfig = RouteConfig,
  TAllRouteInfo extends AnyAllRouteInfo = AllRouteInfo<TRouteConfig>,
  TRouterContext = unknown,
> {
  types: {
    // Super secret internal stuff
    RouteConfig: TRouteConfig
    AllRouteInfo: TAllRouteInfo
  }

  // Public API
  options: PickAsRequired<
    RouterOptions<TRouteConfig, TRouterContext>,
    'stringifySearch' | 'parseSearch' | 'context'
  >
  store: Store<RouterStore<TAllRouteInfo['fullSearchSchema']>>
  basepath: string
  // __location: Location<TAllRouteInfo['fullSearchSchema']>
  routeTree: Route<TAllRouteInfo, RouteInfo>
  routesById: RoutesById<TAllRouteInfo>
  reset: () => void
  mount: () => () => void
  update: <
    TRouteConfig extends RouteConfig = RouteConfig,
    TAllRouteInfo extends AnyAllRouteInfo = AllRouteInfo<TRouteConfig>,
    TRouterContext = unknown,
  >(
    opts?: RouterOptions<TRouteConfig, TRouterContext>,
  ) => Router<TRouteConfig, TAllRouteInfo, TRouterContext>

  buildNext: (opts: BuildNextOptions) => ParsedLocation
  cancelMatches: () => void
  load: (next?: ParsedLocation) => Promise<void>
  cleanMatchCache: () => void
  getRoute: <TId extends keyof TAllRouteInfo['routeInfoById']>(
    id: TId,
  ) => Route<TAllRouteInfo, TAllRouteInfo['routeInfoById'][TId]>
  loadRoute: (navigateOpts: BuildNextOptions) => Promise<RouteMatch[]>
  preloadRoute: (
    navigateOpts: BuildNextOptions,
    loaderOpts: { maxAge?: number; gcMaxAge?: number },
  ) => Promise<RouteMatch[]>
  matchRoutes: (
    pathname: string,
    opts?: { strictParseParams?: boolean },
  ) => RouteMatch[]
  loadMatches: (
    resolvedMatches: RouteMatch[],
    loaderOpts?:
      | { preload: true; maxAge: number; gcMaxAge: number }
      | { preload?: false; maxAge?: never; gcMaxAge?: never },
  ) => Promise<void>
  loadMatchData: (
    routeMatch: RouteMatch<any, any>,
  ) => Promise<Record<string, unknown>>
  invalidateRoute: (opts: MatchLocation) => Promise<void>
  reload: () => Promise<void>
  resolvePath: (from: string, path: string) => string
  navigate: <
    TFrom extends ValidFromPath<TAllRouteInfo> = '/',
    TTo extends string = '.',
  >(
    opts: NavigateOptions<TAllRouteInfo, TFrom, TTo>,
  ) => Promise<void>
  matchRoute: <
    TFrom extends ValidFromPath<TAllRouteInfo> = '/',
    TTo extends string = '.',
  >(
    matchLocation: ToOptions<TAllRouteInfo, TFrom, TTo>,
    opts?: MatchRouteOptions,
  ) =>
    | false
    | TAllRouteInfo['routeInfoById'][ResolveRelativePath<
        TFrom,
        NoInfer<TTo>
      >]['allParams']
  buildLink: <
    TFrom extends ValidFromPath<TAllRouteInfo> = '/',
    TTo extends string = '.',
  >(
    opts: LinkOptions<TAllRouteInfo, TFrom, TTo>,
  ) => LinkInfo
  dehydrate: () => DehydratedRouter<TRouterContext>
  hydrate: (dehydratedRouter: DehydratedRouter<TRouterContext>) => void
  getLoader: <TFrom extends keyof TAllRouteInfo['routeInfoById'] = '/'>(opts: {
    from: TFrom
  }) => unknown extends TAllRouteInfo['routeInfoById'][TFrom]['routeLoaderData']
    ?
        | Loader<
            LoaderContext<
              TAllRouteInfo['routeInfoById'][TFrom]['fullSearchSchema'],
              TAllRouteInfo['routeInfoById'][TFrom]['allParams']
            >,
            TAllRouteInfo['routeInfoById'][TFrom]['routeLoaderData']
          >
        | undefined
    : Loader<
        TAllRouteInfo['routeInfoById'][TFrom]['fullSearchSchema'],
        TAllRouteInfo['routeInfoById'][TFrom]['allParams'],
        TAllRouteInfo['routeInfoById'][TFrom]['routeLoaderData']
      >
}

// Detect if we're in the DOM
const isServer =
  typeof window === 'undefined' || !window.document?.createElement

function getInitialRouterState(): RouterStore {
  return {
    status: 'idle',
    latestLocation: null!,
    currentLocation: null!,
    currentMatches: [],
    loaders: {},
    lastUpdated: Date.now(),
    matchCache: {},
    get isFetching() {
      return (
        this.status === 'loading' ||
        this.currentMatches.some((d) => d.store.state.isFetching)
      )
    },
    get isPreloading() {
      return Object.values(this.matchCache).some(
        (d) =>
          d.match.store.state.isFetching &&
          !this.currentMatches.find((dd) => dd.matchId === d.match.matchId),
      )
    },
  }
}

export function createRouter<
  TRouteConfig extends AnyRouteConfig = RouteConfig,
  TAllRouteInfo extends AnyAllRouteInfo = AllRouteInfo<TRouteConfig>,
  TRouterContext = unknown,
>(
  userOptions?: RouterOptions<TRouteConfig, TRouterContext>,
): Router<TRouteConfig, TAllRouteInfo, TRouterContext> {
  const originalOptions = {
    defaultLoaderGcMaxAge: 5 * 60 * 1000,
    defaultLoaderMaxAge: 0,
    defaultPreloadMaxAge: 2000,
    defaultPreloadDelay: 50,
    context: undefined!,
    ...userOptions,
    stringifySearch: userOptions?.stringifySearch ?? defaultStringifySearch,
    parseSearch: userOptions?.parseSearch ?? defaultParseSearch,
  }

  const store = createStore<RouterStore>(getInitialRouterState())

  let navigateTimeout: undefined | Timeout
  let nextAction: undefined | 'push' | 'replace'
  let navigationPromise: undefined | Promise<void>

  let startedLoadingAt = Date.now()
  let resolveNavigation = () => {}

  function onFocus() {
    router.load()
  }

  function buildRouteTree(rootRouteConfig: RouteConfig) {
    const recurseRoutes = (
      routeConfigs: RouteConfig[],
      parent?: Route<TAllRouteInfo, any, any>,
    ): Route<TAllRouteInfo, any, any>[] => {
      return routeConfigs.map((routeConfig, i) => {
        const routeOptions = routeConfig.options
        const route = createRoute(routeConfig, routeOptions, i, parent, router)
        const existingRoute = (router.routesById as any)[route.routeId]

        if (existingRoute) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              `Duplicate routes found with id: ${String(route.routeId)}`,
              router.routesById,
              route,
            )
          }
          throw new Error()
        }

        ;(router.routesById as any)[route.routeId] = route

        const children = routeConfig.children as RouteConfig[]

        route.childRoutes = children?.length
          ? recurseRoutes(children, route)
          : undefined

        return route
      })
    }

    const routes = recurseRoutes([rootRouteConfig])

    return routes[0]!
  }

  function parseLocation(previousLocation?: ParsedLocation): ParsedLocation {
    let { pathname, search, hash } = window.location
    let state = window.history.state || {}
    const parsedSearch = router.options.parseSearch(search)

    return {
      pathname: pathname,
      searchStr: search,
      search: replaceEqualDeep(previousLocation?.search, parsedSearch),
      hash: hash.split('#').reverse()[0] ?? '',
      href: `${pathname}${search}${hash}`,
      state: state.usr as LocationState,
      key: state.key || '__init__',
    }
  }

  function navigate(location: BuildNextOptions & { replace?: boolean }) {
    const next = router.buildNext(location)
    const id = '' + Date.now() + Math.random()

    if (navigateTimeout) clearTimeout(navigateTimeout)

    let nextAction: 'push' | 'replace' = 'replace'

    if (!location.replace) {
      nextAction = 'push'
    }

    const isSameUrl = window.location.href === next.href

    if (isSameUrl && !next.key) {
      nextAction = 'replace'
    }

    const href = `${next.pathname}${next.searchStr}${
      next.hash ? `#${next.hash}` : ''
    }`

    window.history[nextAction === 'push' ? 'pushState' : 'replaceState'](
      {
        id,
        ...next.state,
      },
      '',
      href,
    )

    router.load(parseLocation(store.state.latestLocation))

    return (navigationPromise = new Promise((resolve) => {
      const previousNavigationResolve = resolveNavigation

      resolveNavigation = () => {
        previousNavigationResolve()
        resolve()
      }
    }))
  }

  function buildLocation(dest: BuildNextOptions = {}): ParsedLocation {
    const fromPathname = dest.fromCurrent
      ? store.state.latestLocation.pathname
      : dest.from ?? store.state.latestLocation.pathname

    let pathname = resolvePath(
      router.basepath ?? '/',
      fromPathname,
      `${dest.to ?? '.'}`,
    )

    const fromMatches = router.matchRoutes(
      store.state.latestLocation.pathname,
      {
        strictParseParams: true,
      },
    )

    const toMatches = router.matchRoutes(pathname)

    const prevParams = { ...last(fromMatches)?.params }

    let nextParams =
      (dest.params ?? true) === true
        ? prevParams
        : functionalUpdate(dest.params!, prevParams)

    if (nextParams) {
      toMatches
        .map((d) => d.options.stringifyParams)
        .filter(Boolean)
        .forEach((fn) => {
          Object.assign({}, nextParams!, fn!(nextParams!))
        })
    }

    pathname = interpolatePath(pathname, nextParams ?? {})

    // Pre filters first
    const preFilteredSearch = dest.__preSearchFilters?.length
      ? dest.__preSearchFilters.reduce(
          (prev, next) => next(prev),
          store.state.latestLocation.search,
        )
      : store.state.latestLocation.search

    // Then the link/navigate function
    const destSearch =
      dest.search === true
        ? preFilteredSearch // Preserve resolvedFrom true
        : dest.search
        ? functionalUpdate(dest.search, preFilteredSearch) ?? {} // Updater
        : dest.__preSearchFilters?.length
        ? preFilteredSearch // Preserve resolvedFrom filters
        : {}

    // Then post filters
    const postFilteredSearch = dest.__postSearchFilters?.length
      ? dest.__postSearchFilters.reduce((prev, next) => next(prev), destSearch)
      : destSearch

    const search = replaceEqualDeep(
      store.state.latestLocation.search,
      postFilteredSearch,
    )

    const searchStr = router.options.stringifySearch(search)
    let hash =
      dest.hash === true
        ? store.state.latestLocation.hash
        : functionalUpdate(dest.hash!, store.state.latestLocation.hash)
    hash = hash ? `#${hash}` : ''

    return {
      pathname,
      search,
      searchStr,
      state: store.state.latestLocation.state,
      hash,
      href: `${pathname}${searchStr}${hash}`,
      key: dest.key,
    }
  }

  const router: Router<TRouteConfig, TAllRouteInfo, TRouterContext> = {
    types: undefined!,

    // public api
    store,
    options: originalOptions,
    basepath: '',
    routeTree: undefined!,
    routesById: {} as any,

    reset: () => {
      store.setState((s) => Object.assign(s, getInitialRouterState()))
    },

    getRoute: (id) => {
      const route = router.routesById[id]

      invariant(route, `Route with id "${id as string}" not found`)

      return route
    },

    dehydrate: () => {
      return {
        state: {
          ...pick(store.state, [
            'latestLocation',
            'currentLocation',
            'status',
            'lastUpdated',
          ]),
          currentMatches: store.state.currentMatches.map((match) => ({
            matchId: match.matchId,
            state: {
              ...pick(match.store.state, [
                'status',
                'routeLoaderData',
                'invalidAt',
                'invalid',
              ]),
            },
          })),
        },
        context: router.options.context as TRouterContext,
      }
    },

    hydrate: (dehydratedRouter) => {
      store.setState((s) => {
        // Update the context TODO: make this part of state?
        router.options.context = dehydratedRouter.context

        // Match the routes
        const currentMatches = router.matchRoutes(
          dehydratedRouter.state.latestLocation.pathname,
          {
            strictParseParams: true,
          },
        )

        currentMatches.forEach((match, index) => {
          const dehydratedMatch = dehydratedRouter.state.currentMatches[index]
          invariant(
            dehydratedMatch && dehydratedMatch.matchId === match.matchId,
            'Oh no! There was a hydration mismatch when attempting to restore the state of the router! 😬',
          )
          Object.assign(match, dehydratedMatch)
        })

        currentMatches.forEach((match) => match.__.validate())

        Object.assign(s, { ...dehydratedRouter.state, currentMatches })
      })
    },

    mount: () => {
      // Mount only does anything on the client
      if (!isServer) {
        // If the router matches are empty, load the matches
        if (!store.state.currentMatches.length) {
          router.load()
        }

        const cb = () => {
          router.load(parseLocation(store.state.latestLocation))
        }

        // addEventListener does not exist in React Native, but window does
        // In the future, we might need to invert control here for more adapters
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (window.addEventListener) {
          // Listen to visibilitychange and focus
          window.addEventListener('popstate', cb)
          window.addEventListener('visibilitychange', onFocus, false)
          window.addEventListener('focus', onFocus, false)
        }

        return () => {
          if (window.removeEventListener) {
            // Be sure to unsubscribe if a new handler is set
            window.removeEventListener('popstate', cb)
            window.removeEventListener('visibilitychange', onFocus)
            window.removeEventListener('focus', onFocus)
          }
        }
      }

      return () => {}
    },

    update: (opts) => {
      if (!store.state.latestLocation) {
        store.setState((s) => {
          s.latestLocation = parseLocation()
          s.currentLocation = s.latestLocation
        })
      }

      Object.assign(router.options, opts)

      const { basepath, routeConfig } = router.options

      router.basepath = `/${trimPath(basepath ?? '') ?? ''}`

      if (routeConfig) {
        router.routesById = {} as any
        router.routeTree = buildRouteTree(routeConfig)
      }

      return router as any
    },

    cancelMatches: () => {
      ;[
        ...store.state.currentMatches,
        ...(store.state.pendingMatches || []),
      ].forEach((match) => {
        match.cancel()
      })
    },

    load: async (next?: ParsedLocation) => {
      let now = Date.now()
      const startedAt = now
      startedLoadingAt = startedAt

      // Cancel any pending matches
      router.cancelMatches()

      let matches!: RouteMatch<any, any>[]

      batch(() => {
        if (next) {
          // Ingest the new location
          store.setState((s) => {
            s.latestLocation = next
          })
        }

        // Match the routes
        matches = router.matchRoutes(store.state.latestLocation.pathname, {
          strictParseParams: true,
        })

        store.setState((s) => {
          s.status = 'loading'
          s.pendingMatches = matches
          s.pendingLocation = store.state.latestLocation
        })
      })

      // Load the matches
      try {
        await router.loadMatches(matches)
      } catch (err: any) {
        console.warn(err)
        invariant(
          false,
          'Matches failed to load due to error above ☝️. Navigation cancelled!',
        )
      }

      if (startedLoadingAt !== startedAt) {
        // Ignore side-effects of outdated side-effects
        return navigationPromise
      }

      const previousMatches = store.state.currentMatches

      const exiting: RouteMatch[] = [],
        staying: RouteMatch[] = []

      previousMatches.forEach((d) => {
        if (matches.find((dd) => dd.matchId === d.matchId)) {
          staying.push(d)
        } else {
          exiting.push(d)
        }
      })

      const entering = matches.filter((d) => {
        return !previousMatches.find((dd) => dd.matchId === d.matchId)
      })

      now = Date.now()

      exiting.forEach((d) => {
        d.__.onExit?.({
          params: d.params,
          search: d.store.state.routeSearch,
        })

        // Clear idle error states when match leaves
        if (d.store.state.status === 'error' && !d.store.state.isFetching) {
          d.store.setState((s) => {
            s.status = 'idle'
            s.error = undefined
          })
        }

        const gc = Math.max(
          d.options.loaderGcMaxAge ?? router.options.defaultLoaderGcMaxAge ?? 0,
          d.options.loaderMaxAge ?? router.options.defaultLoaderMaxAge ?? 0,
        )

        if (gc > 0) {
          store.setState((s) => {
            s.matchCache[d.matchId] = {
              gc: gc == Infinity ? Number.MAX_SAFE_INTEGER : now + gc,
              match: d,
            }
          })
        }
      })

      staying.forEach((d) => {
        d.options.onTransition?.({
          params: d.params,
          search: d.store.state.routeSearch,
        })
      })

      entering.forEach((d) => {
        d.__.onExit = d.options.onLoaded?.({
          params: d.params,
          search: d.store.state.search,
        })
        delete store.state.matchCache[d.matchId]
      })

      store.setState((s) => {
        // matches.forEach((match) => {
        //   // Clear actions
        //   const action = s.actions[match.routeId]

        //   if (action) {
        //     action.current = undefined
        //   }
        // })

        Object.assign(s, {
          status: 'idle',
          currentLocation: store.state.latestLocation,
          currentMatches: matches,
          pendingLocation: undefined,
          pendingMatches: undefined,
        })
      })

      router.options.onRouteChange?.()

      resolveNavigation()
    },

    cleanMatchCache: () => {
      const now = Date.now()

      store.setState((s) => {
        Object.keys(s.matchCache).forEach((matchId) => {
          const entry = s.matchCache[matchId]!

          // Don't remove loading matches
          if (entry.match.store.state.status === 'loading') {
            return
          }

          // Do not remove successful matches that are still valid
          if (entry.gc > 0 && entry.gc > now) {
            return
          }

          // Everything else gets removed
          delete s.matchCache[matchId]
        })
      })
    },

    loadRoute: async (navigateOpts = store.state.latestLocation) => {
      const next = router.buildNext(navigateOpts)
      const matches = router.matchRoutes(next.pathname, {
        strictParseParams: true,
      })
      await router.loadMatches(matches)
      return matches
    },

    preloadRoute: async (
      navigateOpts = store.state.latestLocation,
      loaderOpts,
    ) => {
      const next = router.buildNext(navigateOpts)
      const matches = router.matchRoutes(next.pathname, {
        strictParseParams: true,
      })

      await router.loadMatches(matches, {
        preload: true,
        maxAge:
          loaderOpts.maxAge ??
          router.options.defaultPreloadMaxAge ??
          router.options.defaultLoaderMaxAge ??
          0,
        gcMaxAge:
          loaderOpts.gcMaxAge ??
          router.options.defaultPreloadGcMaxAge ??
          router.options.defaultLoaderGcMaxAge ??
          0,
      })
      return matches
    },

    matchRoutes: (pathname, opts) => {
      const matches: RouteMatch[] = []

      if (!router.routeTree) {
        return matches
      }

      const existingMatches = [
        ...store.state.currentMatches,
        ...(store.state.pendingMatches ?? []),
      ]

      const recurse = async (routes: Route<any, any>[]): Promise<void> => {
        const parentMatch = last(matches)
        let params = parentMatch?.params ?? {}

        const filteredRoutes = router.options.filterRoutes?.(routes) ?? routes

        let foundRoutes: Route[] = []

        const findMatchInRoutes = (parentRoutes: Route[], routes: Route[]) => {
          routes.some((route) => {
            if (!route.routePath && route.childRoutes?.length) {
              return findMatchInRoutes(
                [...foundRoutes, route],
                route.childRoutes,
              )
            }

            const fuzzy = !!(
              route.routePath !== '/' || route.childRoutes?.length
            )

            const matchParams = matchPathname(router.basepath, pathname, {
              to: route.fullPath,
              fuzzy,
              caseSensitive:
                route.options.caseSensitive ?? router.options.caseSensitive,
            })

            if (matchParams) {
              let parsedParams

              try {
                parsedParams =
                  route.options.parseParams?.(matchParams!) ?? matchParams
              } catch (err) {
                if (opts?.strictParseParams) {
                  throw err
                }
              }

              params = {
                ...params,
                ...parsedParams,
              }
            }

            if (!!matchParams) {
              foundRoutes = [...parentRoutes, route]
            }

            return !!foundRoutes.length
          })

          return !!foundRoutes.length
        }

        findMatchInRoutes([], filteredRoutes)

        if (!foundRoutes.length) {
          return
        }

        foundRoutes.forEach((foundRoute) => {
          const interpolatedPath = interpolatePath(foundRoute.routePath, params)
          const matchId = interpolatePath(foundRoute.routeId, params, true)

          const match =
            existingMatches.find((d) => d.matchId === matchId) ||
            store.state.matchCache[matchId]?.match ||
            createRouteMatch(router, foundRoute, {
              parentMatch,
              matchId,
              params,
              pathname: joinPaths([router.basepath, interpolatedPath]),
            })

          matches.push(match)
        })

        const foundRoute = last(foundRoutes)!

        if (foundRoute.childRoutes?.length) {
          recurse(foundRoute.childRoutes)
        }
      }

      recurse([router.routeTree])

      linkMatches(matches)

      return matches
    },

    loadMatches: async (resolvedMatches, loaderOpts) => {
      router.cleanMatchCache()
      resolvedMatches.forEach(async (match) => {
        // Validate the match (loads search params etc)
        match.__.validate()
      })

      // Check each match middleware to see if the route can be accessed
      await Promise.all(
        resolvedMatches.map(async (match) => {
          try {
            await match.options.beforeLoad?.({
              router: router as any,
              match,
            })
          } catch (err) {
            if (!loaderOpts?.preload) {
              match.options.onLoadError?.(err)
            }

            throw err
          }
        }),
      )

      const matchPromises = resolvedMatches.map(async (match, index) => {
        const prevMatch = resolvedMatches[(index = 1)]
        const search = match.store.state.search as { __data?: any }

        if (search.__data?.matchId && search.__data.matchId !== match.matchId) {
          return
        }

        match.load(loaderOpts)

        if (match.store.state.status !== 'success' && match.__.loadPromise) {
          // Wait for the first sign of activity from the match
          await match.__.loadPromise
        }

        if (prevMatch) {
          await prevMatch.__.loadPromise
        }
      })

      await Promise.all(matchPromises)
    },

    loadMatchData: async (routeMatch) => {
      if (isServer || !router.options.useServerData) {
        return (
          (await routeMatch.options.loader?.({
            // parentLoaderPromise: routeMatch.parentMatch?.__.dataPromise,
            params: routeMatch.params,
            search: routeMatch.store.state.routeSearch,
            signal: routeMatch.__.abortController.signal,
          })) || {}
        )
      } else {
        const next = router.buildNext({
          to: '.',
          search: (d: any) => ({
            ...(d ?? {}),
            __data: {
              matchId: routeMatch.matchId,
            },
          }),
        })

        // Refresh:
        // '/dashboard'
        // '/dashboard/invoices/'
        // '/dashboard/invoices/123'

        // New:
        // '/dashboard/invoices/456'

        // TODO: batch requests when possible

        const res = await fetch(next.href, {
          method: 'GET',
          // signal: routeMatch.__.abortController.signal,
        })

        if (res.ok) {
          return res.json()
        }

        throw new Error('Failed to fetch match data')
      }
    },

    invalidateRoute: async (opts: MatchLocation) => {
      const next = router.buildNext(opts)
      const unloadedMatchIds = router
        .matchRoutes(next.pathname)
        .map((d) => d.matchId)

      await Promise.allSettled(
        [
          ...store.state.currentMatches,
          ...(store.state.pendingMatches ?? []),
        ].map(async (match) => {
          if (unloadedMatchIds.includes(match.matchId)) {
            return match.invalidate()
          }
        }),
      )
    },

    reload: () =>
      navigate({
        fromCurrent: true,
        replace: true,
        search: true,
      }),

    resolvePath: (from: string, path: string) => {
      return resolvePath(router.basepath!, from, cleanPath(path))
    },

    matchRoute: (location, opts) => {
      location = {
        ...location,
        to: location.to
          ? router.resolvePath(location.from ?? '', location.to)
          : undefined,
      }

      const next = router.buildNext(location)

      if (opts?.pending) {
        if (!store.state.pendingLocation) {
          return false
        }

        return !!matchPathname(
          router.basepath,
          store.state.pendingLocation!.pathname,
          {
            ...opts,
            to: next.pathname,
          },
        )
      }

      return matchPathname(
        router.basepath,
        store.state.currentLocation.pathname,
        {
          ...opts,
          to: next.pathname,
        },
      ) as any
    },

    navigate: async ({ from, to = '.', search, hash, replace, params }) => {
      // If this link simply reloads the current route,
      // make sure it has a new key so it will trigger a data refresh

      // If this `to` is a valid external URL, return
      // null for LinkUtils
      const toString = String(to)
      const fromString = String(from)

      let isExternal

      try {
        new URL(`${toString}`)
        isExternal = true
      } catch (e) {}

      invariant(
        !isExternal,
        'Attempting to navigate to external url with router.navigate!',
      )

      return navigate({
        from: fromString,
        to: toString,
        search,
        hash,
        replace,
        params,
      })
    },

    buildLink: ({
      from,
      to = '.',
      search,
      params,
      hash,
      target,
      replace,
      activeOptions,
      preload,
      preloadMaxAge: userPreloadMaxAge,
      preloadGcMaxAge: userPreloadGcMaxAge,
      preloadDelay: userPreloadDelay,
      disabled,
    }) => {
      // If this link simply reloads the current route,
      // make sure it has a new key so it will trigger a data refresh

      // If this `to` is a valid external URL, return
      // null for LinkUtils

      try {
        new URL(`${to}`)
        return {
          type: 'external',
          href: to,
        }
      } catch (e) {}

      const nextOpts = {
        from,
        to,
        search,
        params,
        hash,
        replace,
      }

      const next = router.buildNext(nextOpts)

      preload = preload ?? router.options.defaultPreload
      const preloadDelay =
        userPreloadDelay ?? router.options.defaultPreloadDelay ?? 0

      // Compare path/hash for matches
      const pathIsEqual = store.state.currentLocation.pathname === next.pathname
      const currentPathSplit = store.state.currentLocation.pathname.split('/')
      const nextPathSplit = next.pathname.split('/')
      const pathIsFuzzyEqual = nextPathSplit.every(
        (d, i) => d === currentPathSplit[i],
      )
      const hashIsEqual = store.state.currentLocation.hash === next.hash
      // Combine the matches based on user options
      const pathTest = activeOptions?.exact ? pathIsEqual : pathIsFuzzyEqual
      const hashTest = activeOptions?.includeHash ? hashIsEqual : true

      // The final "active" test
      const isActive = pathTest && hashTest

      // The click handler
      const handleClick = (e: MouseEvent) => {
        if (
          !disabled &&
          !isCtrlEvent(e) &&
          !e.defaultPrevented &&
          (!target || target === '_self') &&
          e.button === 0
        ) {
          e.preventDefault()
          if (pathIsEqual && !search && !hash) {
            router.invalidateRoute(nextOpts)
          }

          // All is well? Navigate!
          navigate(nextOpts)
        }
      }

      // The click handler
      const handleFocus = (e: MouseEvent) => {
        if (preload) {
          router
            .preloadRoute(nextOpts, {
              maxAge: userPreloadMaxAge,
              gcMaxAge: userPreloadGcMaxAge,
            })
            .catch((err) => {
              console.warn(err)
              console.warn('Error preloading route! ☝️')
            })
        }
      }

      const handleEnter = (e: MouseEvent) => {
        const target = (e.target || {}) as LinkCurrentTargetElement

        if (preload) {
          if (target.preloadTimeout) {
            return
          }

          target.preloadTimeout = setTimeout(() => {
            target.preloadTimeout = null
            router
              .preloadRoute(nextOpts, {
                maxAge: userPreloadMaxAge,
                gcMaxAge: userPreloadGcMaxAge,
              })
              .catch((err) => {
                console.warn(err)
                console.warn('Error preloading route! ☝️')
              })
          }, preloadDelay)
        }
      }

      const handleLeave = (e: MouseEvent) => {
        const target = (e.target || {}) as LinkCurrentTargetElement

        if (target.preloadTimeout) {
          clearTimeout(target.preloadTimeout)
          target.preloadTimeout = null
        }
      }

      return {
        type: 'internal',
        next,
        handleFocus,
        handleClick,
        handleEnter,
        handleLeave,
        isActive,
        disabled,
      }
    },
    buildNext: (opts: BuildNextOptions) => {
      const next = buildLocation(opts)

      const matches = router.matchRoutes(next.pathname)

      const __preSearchFilters = matches
        .map((match) => match.options.preSearchFilters ?? [])
        .flat()
        .filter(Boolean)

      const __postSearchFilters = matches
        .map((match) => match.options.postSearchFilters ?? [])
        .flat()
        .filter(Boolean)

      return buildLocation({
        ...opts,
        __preSearchFilters,
        __postSearchFilters,
      })
    },
    getLoader: ({ from }) => {
      const id = from || ('/' as any)

      const route = router.getRoute(id)

      if (!route) return

      let loader =
        router.store.state.loaders[id] ||
        (() => {
          router.store.setState((s) => {
            s.loaders[id] = {
              pending: [],
              fetch: (async (loaderContext: LoaderContext<any, any>) => {
                if (!route) {
                  return
                }
                const loaderState: LoaderState<any, any> = {
                  loadedAt: Date.now(),
                  loaderContext,
                }
                router.store.setState((s) => {
                  s.loaders[id]!.current = loaderState
                  s.loaders[id]!.latest = loaderState
                  s.loaders[id]!.pending.push(loaderState)
                })
                try {
                  return await route.options.loader?.(loaderContext)
                } finally {
                  router.store.setState((s) => {
                    s.loaders[id]!.pending = s.loaders[id]!.pending.filter(
                      (d) => d !== loaderState,
                    )
                  })
                }
              }) as any,
            }
          })
          return router.store.state.loaders[id]!
        })()

      return loader as any
    },
  }

  router.update(userOptions)

  // Allow frameworks to hook into the router creation
  router.options.createRouter?.(router)

  return router
}

function isCtrlEvent(e: MouseEvent) {
  return !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey)
}

function linkMatches(matches: RouteMatch<any, any>[]) {
  matches.forEach((match, index) => {
    const parent = matches[index - 1]

    if (parent) {
      match.__.setParentMatch(parent)
    } else {
      match.__.setParentMatch(undefined)
    }
  })
}
