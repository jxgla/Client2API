import { MODEL_PROTOCOL_PREFIX } from '../utils/common.js';
import { GrokStrategy } from '../providers/grok/grok-strategy.js';

import { OpenAIStrategy } from '../providers/openai/openai-strategy.js';
import { OpenAIResponsesStrategy } from '../providers/openai/openai-responses-strategy.js';
import { GeminiStrategy } from '../providers/gemini/gemini-strategy.js';
import { ClaudeStrategy } from '../providers/claude/claude-strategy.js';

/**
 * Strategy factory that returns the appropriate strategy instance based on the provider protocol.
 */
class ProviderStrategyFactory {
    static getStrategy(providerProtocol) {
        switch (providerProtocol) {
            case MODEL_PROTOCOL_PREFIX.GROK:
                return new GrokStrategy();
            case MODEL_PROTOCOL_PREFIX.OPENAI:
                return new OpenAIStrategy();
            case MODEL_PROTOCOL_PREFIX.OPENAI_RESPONSES:
                return new OpenAIResponsesStrategy();
            case MODEL_PROTOCOL_PREFIX.GEMINI:
                return new GeminiStrategy();
            case MODEL_PROTOCOL_PREFIX.CLAUDE:
                return new ClaudeStrategy();
            default:
                throw new Error(`Unsupported provider protocol: ${providerProtocol}`);
        }
    }
}

export { ProviderStrategyFactory };
