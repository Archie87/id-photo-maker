import { LocalWebProvider, type LocalProviderOptions } from './local-web-provider';
/** Local Hivision portrait matting; failures never silently select another provider. */
export class LocalMattingProvider extends LocalWebProvider {
  readonly id = 'local-matting';
  constructor(options?: LocalProviderOptions) {
    super('hivision', options);
  }
}
