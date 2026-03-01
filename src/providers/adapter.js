import { GrokApiService } from './grok/grok-core.js';
import { MODEL_PROVIDER } from '../utils/common.js';
import logger from '../utils/logger.js';

// 适配器注册表
const adapterRegistry = new Map();

/**
 * 注册服务适配器
 * @param {string} provider - 提供商名称 (来自 MODEL_PROVIDER)
 * @param {typeof ApiServiceAdapter} adapterClass - 适配器类
 */
export function registerAdapter(provider, adapterClass) {
    logger.info(`[Adapter] Registering adapter for provider: ${provider}`);
    adapterRegistry.set(provider, adapterClass);
}

/**
 * 获取所有已注册的提供商
 * @returns {string[]} 已注册的提供商名称列表
 */
export function getRegisteredProviders() {
    return Array.from(adapterRegistry.keys());
}

// 定义AI服务适配器接口
// 所有的服务适配器都应该实现这些方法
export class ApiServiceAdapter {
    constructor() {
        if (new.target === ApiServiceAdapter) {
            throw new TypeError("Cannot construct ApiServiceAdapter instances directly");
        }
    }

    /**
     * 生成内容
     * @param {string} model - 模型名称
     * @param {object} requestBody - 请求体
     * @returns {Promise<object>} - API响应
     */
    async generateContent(model, requestBody) {
        throw new Error("Method 'generateContent()' must be implemented.");
    }

    /**
     * 流式生成内容
     * @param {string} model - 模型名称
     * @param {object} requestBody - 请求体
     * @returns {AsyncIterable<object>} - API响应流
     */
    async *generateContentStream(model, requestBody) {
        throw new Error("Method 'generateContentStream()' must be implemented.");
    }

    /**
     * 列出可用模型
     * @returns {Promise<object>} - 模型列表
     */
    async listModels() {
        throw new Error("Method 'listModels()' must be implemented.");
    }

    /**
     * 刷新认证令牌
     * @returns {Promise<void>}
     */
    async refreshToken() {
        throw new Error("Method 'refreshToken()' must be implemented.");
    }

    /**
     * 强制刷新认证令牌（不判断是否接近过期）
     * @returns {Promise<void>}
     */
    async forceRefreshToken() {
        throw new Error("Method 'forceRefreshToken()' must be implemented.");
    }

    /**
     * 判断日期是否接近过期
     * @returns {boolean}
     */
    isExpiryDateNear() {
        throw new Error("Method 'isExpiryDateNear()' must be implemented.");
    }
}


// Grok API 服务适配器
export class GrokApiServiceAdapter extends ApiServiceAdapter {
    constructor(config) {
        super();
        this.grokApiService = new GrokApiService(config);
    }

    async generateContent(model, requestBody) {
        if (!this.grokApiService.isInitialized) {
            await this.grokApiService.initialize();
        }
        return this.grokApiService.generateContent(model, requestBody);
    }

    async *generateContentStream(model, requestBody) {
        if (!this.grokApiService.isInitialized) {
            await this.grokApiService.initialize();
        }
        yield* this.grokApiService.generateContentStream(model, requestBody);
    }

    async listModels() {
        if (!this.grokApiService.isInitialized) {
            await this.grokApiService.initialize();
        }
        return this.grokApiService.listModels();
    }

    async refreshToken() {
        return this.grokApiService.refreshToken();
    }

    async forceRefreshToken() {
        return this.grokApiService.refreshToken();
    }

    isExpiryDateNear() {
        return this.grokApiService.isExpiryDateNear();
    }

    /**
     * 获取用量限制信息
     * @returns {Promise<Object>} 用量限制信息
     */
    async getUsageLimits() {
        if (!this.grokApiService.isInitialized) {
            await this.grokApiService.initialize();
        }
        return this.grokApiService.getUsageLimits();
    }
}

// 注册 Grok 适配器
registerAdapter(MODEL_PROVIDER.GROK_CUSTOM, GrokApiServiceAdapter);

// 用于存储服务适配器单例的映射
export const serviceInstances = {};

// 服务适配器工厂
export function getServiceAdapter(config) {
    const customNameDisplay = config.customName ? ` (${config.customName})` : '';
    logger.info(`[Adapter] getServiceAdapter, provider: ${config.MODEL_PROVIDER}, uuid: ${config.uuid}${customNameDisplay}`);
    const provider = config.MODEL_PROVIDER;
    const providerKey = config.uuid ? provider + config.uuid : provider;

    if (!serviceInstances[providerKey]) {
        const AdapterClass = adapterRegistry.get(provider);
        if (AdapterClass) {
            serviceInstances[providerKey] = new AdapterClass(config);
        } else {
            throw new Error(`Unsupported model provider: ${provider}`);
        }
    }
    return serviceInstances[providerKey];
}

