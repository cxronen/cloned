import { PiniaPluginContext } from 'pinia';
import persistence from './persistence';
import preferencesSync from './preferencesSync';
import watchPlaybackReporting from './watchers/playbackManager';
import watchSocket from './watchers/socket';
import watchClientSettings from './watchers/clientSettings';

const piniaPlugins = (context: PiniaPluginContext): void => {
  const plugins = [persistence, preferencesSync];
  const watchers = [watchSocket, watchPlaybackReporting, watchClientSettings];

  for (const p of plugins.concat(watchers)) {
    context.pinia.use(p);
  }
};

export default piniaPlugins;
