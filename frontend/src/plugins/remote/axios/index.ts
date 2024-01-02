/**
 * Instantiates the Axios instance used for the SDK and requests
 */
import { excludedProgressEndpoints, useLoading } from '@/composables/use-loading';
import { useSnackbar } from '@/composables/use-snackbar';
import { i18n } from '@/plugins/i18n';
/*
 * Import { items } from '@/store/items';
 * import { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
 */
import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios';
import auth from '../auth';

class JellyfinInterceptors {
  public startLoadInterceptor(
    config: InternalAxiosRequestConfig
  ): InternalAxiosRequestConfig {
    if (config.url) {
      const loading = useLoading();
      const isExcluded = excludedProgressEndpoints.some((i) =>
        config.url?.includes(i)
      );

      if (!isExcluded) {
        loading.start();
      }
    }

    return config;
  }
  public stopLoadInterceptor(response: AxiosResponse): AxiosResponse {
    if (response.config.url) {
      const loading = useLoading();
      const isExcluded = excludedProgressEndpoints.some((i) =>
        response.config.url?.includes(i)
      );

      if (!isExcluded) {
        loading.finish();
      }
    }

    return response;
  }
  /**
   * Intercepts each request that has BaseItemDto, adding the objects to the item store, so they can
   * be reactive and updated using the WebSocket connection
   */
  /*
   * Public reactiveItemsInterceptor(response: AxiosResponse): AxiosResponse {
   *   const data = response.data;
   */

  //   If (data) {
  //     If (data.Items && Array.isArray(data.Items)) {
  //       /*
  //        * TODO: Implement a proper check for reponses that are BaseItemDto.
  //        * This currently will try to cache the values for all response types.
  //        * The likelyhood of an id cache collision is low but this is caching a lot
  //        * In memory currently.
  //        */
  //       Response.data.Items = (data.Items as BaseItemDto[]).map((i) =>
  //         Items.add(i)
  //       );
  //     } else if (
  //       auth.currentUserId &&
  //       Response.config.url?.includes(`/Users/${auth.currentUserId}/Items/`)
  //     ) {
  //       Response.data = items.add(data);
  //     }
  //   }

  /*
   *   Return response;
   * }
   */

  /**
   * Intercepts 401 (Unathorized) error code and logs out the user inmmediately,
   * as the session probably has been revoked remotely.
   */
  public async logoutInterceptor(error: AxiosError): Promise<void> {
    if (
      error.response?.status === 401 &&
      auth.currentUser &&
      !error.config?.url?.includes('/Sessions/Logout')
    ) {
      await auth.logoutCurrentUser(true);
      useSnackbar(i18n.t('kickedOut'), 'error');
    }

    /**
     * Pass the error so it's handled in try/catch blocks afterwards
     */
    throw error;
  }

  public async serverUnreachableInterceptor(
    error: AxiosError
  ): Promise<void> {
    if (error.code === 'ERR_NETWORK') {
      await auth.logoutCurrentUser(true);
      useSnackbar(i18n.t('serverNotFound'), 'error');
    }

    throw error;
  }
}

class RemotePluginAxios {
  public readonly instance = axios.create();
  private readonly _interceptors = new JellyfinInterceptors();
  private readonly _defaults = this.instance.defaults;
  private _reactiveInterceptor = -1;
  private _logoutInterceptor = -1;
  private _serverUnreachableInterceptor = -1;
  private _startLoadInterceptor = -1;
  private _stopLoadInterceptor = -1;

  public constructor() {
    this.setLoadInterceptor();
    // This.setReactiveItemsInterceptor();
    this.setLogoutInterceptor();
    this.setServerUnreachableInterceptor();
  }

  public resetDefaults(): void {
    this.instance.defaults = this._defaults;
  }

  public setLoadInterceptor(): void {
    this._startLoadInterceptor = this.instance.interceptors.request.use(
      this._interceptors.startLoadInterceptor
    );
    this._stopLoadInterceptor = this.instance.interceptors.response.use(
      this._interceptors.stopLoadInterceptor
    );
  }

  public removeLoadInterceptor(): void {
    this.instance.interceptors.request.eject(this._startLoadInterceptor);
    this.instance.interceptors.response.eject(this._stopLoadInterceptor);
    this._startLoadInterceptor = -1;
    this._stopLoadInterceptor = -1;
  }

  /*
   * Public setReactiveItemsInterceptor(): void {
   *   this._reactiveInterceptor = this.instance.interceptors.response.use(
   *     this._interceptors.reactiveItemsInterceptor
   *   );
   * }
   */

  public removeReactiveItemsInterceptor(): void {
    this.instance.interceptors.response.eject(this._reactiveInterceptor);
    this._reactiveInterceptor = -1;
  }

  public setLogoutInterceptor(): void {
    this._logoutInterceptor = this.instance.interceptors.response.use(
      undefined,
      this._interceptors.logoutInterceptor
    );
  }

  public removeLogoutInterceptor(): void {
    this.instance.interceptors.response.eject(this._logoutInterceptor);
  }

  public setServerUnreachableInterceptor(): void {
    this._serverUnreachableInterceptor =
      this.instance.interceptors.response.use(
        undefined,
        this._interceptors.serverUnreachableInterceptor
      );
  }

  public removeServerUnreachableInterceptor(): void {
    this.instance.interceptors.response.eject(
      this._serverUnreachableInterceptor
    );
  }
}

const RemotePluginAxiosInstance = new RemotePluginAxios();

export default RemotePluginAxiosInstance;
