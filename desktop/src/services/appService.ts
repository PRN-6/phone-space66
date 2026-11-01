import { webSocketService } from './webSocketService';
import { useAppStore } from '../stores/appStore';
import {
  AppListRequestPayload,
  AppListResponsePayload,
  AppLaunchRequestPayload,
  AppLaunchResponsePayload,
} from '../types/protocol';

class AppService {
  private launchTimeoutId: number | null = null;

  /**
   * Request list of installed applications from connected Android companion.
   */
  public refreshApps(filter?: string) {
    const store = useAppStore.getState();
    store.setLoading(true);
    store.setError(null);

    const payload: AppListRequestPayload = {
      includeSystemApps: store.includeSystemApps,
      filter: filter || store.searchQuery || undefined,
    };

    webSocketService.sendMessage('APP_LIST_REQUEST', payload);
  }

  /**
   * Request Android companion to launch an application by package name.
   */
  public launchApp(packageName: string, appName: string, activityName?: string) {
    const store = useAppStore.getState();

    // Clear previous timeout if any
    if (this.launchTimeoutId) {
      window.clearTimeout(this.launchTimeoutId);
      this.launchTimeoutId = null;
    }

    store.setLaunchStatus({
      packageName,
      appName,
      status: 'launching',
      message: `Requesting launch of ${appName}...`,
      timestamp: Date.now(),
    });

    const payload: AppLaunchRequestPayload = {
      packageName,
      activityName,
    };

    webSocketService.sendMessage('APP_LAUNCH_REQUEST', payload);
  }

  /**
   * Dispatched when APP_LIST_RESPONSE is received from phone.
   */
  public handleAppListResponse(payload: AppListResponsePayload) {
    const store = useAppStore.getState();
    store.setApps(payload.apps || []);
  }

  /**
   * Dispatched when APP_LAUNCH_RESPONSE is received from phone.
   */
  public handleAppLaunchResponse(payload: AppLaunchResponsePayload) {
    const store = useAppStore.getState();

    if (payload.success) {
      store.addRecentApp(payload.packageName);
      store.setLaunchStatus({
        packageName: payload.packageName,
        appName: payload.appName,
        status: 'success',
        message: `${payload.appName} launched successfully on your phone.`,
        timestamp: Date.now(),
      });

      // Automatically clear positive toast after 4 seconds
      this.launchTimeoutId = window.setTimeout(() => {
        store.setLaunchStatus(null);
      }, 4000);
    } else {
      store.setLaunchStatus({
        packageName: payload.packageName,
        appName: payload.appName,
        status: 'error',
        message: payload.errorMessage || `Failed to launch ${payload.appName}.`,
        timestamp: Date.now(),
      });

      // Keep error message visible slightly longer
      this.launchTimeoutId = window.setTimeout(() => {
        store.setLaunchStatus(null);
      }, 6000);
    }
  }
}

export const appService = new AppService();

