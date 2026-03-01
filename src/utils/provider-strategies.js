import { MODEL_PROTOCOL_PREFIX } from '../utils/common.js';
import { GrokStrategy } from '../providers/grok/grok-strategy.js';

/**
 * Strategy factory that returns the appropriate strategy instance based on the provider protocol.
 */
class ProviderStrategyFactory {
    static getStrategy(providerProtocol) {
        switch (providerProtocol) {
            case MODEL_PROTOCOL_PREFIX.GROK:
                return new GrokStrategy();
            default:
                throw new Error(`Unsupported provider protocol: ${providerProtocol}`);
        }
    }
}

export { ProviderStrategyFactory };
