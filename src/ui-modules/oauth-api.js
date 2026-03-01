import { getRequestBody } from '../utils/common.js';
import logger from '../utils/logger.js';

/**
 * 占位：移除所有原有 OAuth 路由，专门为了 GROKAPI 服务
 */
export async function handleGenerateAuthUrl(req, res, currentConfig, providerType) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: `OAuth not supported in GROKAPI` } }));
    return true;
}

export async function handleManualOAuthCallback(req, res) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'OAuth not supported' }));
    return true;
}

export async function handleBatchImportKiroTokens(req, res) {
    return true;
}

export async function handleBatchImportGeminiTokens(req, res) {
    return true;
}

export async function handleImportAwsCredentials(req, res) {
    return true;
}

