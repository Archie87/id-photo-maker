import { LocalWebProvider, type LocalProviderOptions } from './local-web-provider';
/** Optional local semantic cleanup, independent of the portrait matte. */
export class LocalHairCleanupProvider extends LocalWebProvider {
  readonly id = 'local-hair-cleanup';
  constructor(options?: LocalProviderOptions) {
    super('hair-cleanup', options);
  }
}
