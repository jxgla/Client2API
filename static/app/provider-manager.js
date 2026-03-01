// 提供商管理功能模块

import { providerStats, updateProviderStats } from './constants.js';
import { showToast, formatUptime } from './utils.js';
import { fileUploadHandler } from './file-upload.js';
import { t, getCurrentLanguage } from './i18n.js';
import { loadConfigList } from './upload-config-manager.js';
import { setServiceMode } from './event-handlers.js';

// 保存初始服务器时间和运行时间
let initialServerTime = null;
let initialUptime = null;
let initialLoadTime = null;

/**
 * 加载系统信息
 */
async function loadSystemInfo() {
    try {
        const data = await window.apiClient.get('/system');

        const appVersionEl = document.getElementById('appVersion');
        const nodeVersionEl = document.getElementById('nodeVersion');
        const serverTimeEl = document.getElementById('serverTime');
        const memoryUsageEl = document.getElementById('memoryUsage');
        const cpuUsageEl = document.getElementById('cpuUsage');
        const uptimeEl = document.getElementById('uptime');

        if (appVersionEl) appVersionEl.textContent = data.appVersion ? `v${data.appVersion}` : '--';

        // 自动检查更新
        if (data.appVersion) {
            checkUpdate(true);
        }

        if (nodeVersionEl) nodeVersionEl.textContent = data.nodeVersion || '--';
        if (memoryUsageEl) memoryUsageEl.textContent = data.memoryUsage || '--';
        if (cpuUsageEl) cpuUsageEl.textContent = data.cpuUsage || '--';

        // 保存初始时间用于本地计算
        if (data.serverTime && data.uptime !== undefined) {
            initialServerTime = new Date(data.serverTime);
            initialUptime = data.uptime;
            initialLoadTime = Date.now();
        }

        // 初始显示
        if (serverTimeEl) serverTimeEl.textContent = data.serverTime || '--';
        if (uptimeEl) uptimeEl.textContent = data.uptime ? formatUptime(data.uptime) : '--';

        // 加载服务模式信息
        await loadServiceModeInfo();

    } catch (error) {
        console.error('Failed to load system info:', error);
    }
}

/**
 * 加载服务运行模式信息
 */
async function loadServiceModeInfo() {
    try {
        const data = await window.apiClient.get('/service-mode');

        const serviceModeEl = document.getElementById('serviceMode');
        const processPidEl = document.getElementById('processPid');
        const platformInfoEl = document.getElementById('platformInfo');

        // 更新服务模式到 event-handlers
        setServiceMode(data.mode || 'worker');

        // 更新重启/重载按钮显示
        updateRestartButton(data.mode);

        if (serviceModeEl) {
            const modeText = data.mode === 'worker'
                ? t('dashboard.serviceMode.worker')
                : t('dashboard.serviceMode.standalone');
            const canRestartIcon = data.canAutoRestart
                ? '<i class="fas fa-check-circle" style="color: #10b981; margin-left: 4px;" title="' + t('dashboard.serviceMode.canRestart') + '"></i>'
                : '';
            serviceModeEl.innerHTML = modeText;
        }

        if (processPidEl) {
            processPidEl.textContent = data.pid || '--';
        }

        if (platformInfoEl) {
            // 格式化平台信息
            const platformMap = {
                'win32': 'Windows',
                'darwin': 'macOS',
                'linux': 'Linux',
                'freebsd': 'FreeBSD'
            };
            platformInfoEl.textContent = platformMap[data.platform] || data.platform || '--';
        }

    } catch (error) {
        console.error('Failed to load service mode info:', error);
    }
}

/**
 * 根据服务模式更新重启/重载按钮显示
 * @param {string} mode - 服务模式 ('worker' 或 'standalone')
 */
function updateRestartButton(mode) {
    const restartBtn = document.getElementById('restartBtn');
    const restartBtnIcon = document.getElementById('restartBtnIcon');
    const restartBtnText = document.getElementById('restartBtnText');

    if (!restartBtn) return;

    if (mode === 'standalone') {
        // 独立模式：显示"重载"按钮
        if (restartBtnIcon) {
            restartBtnIcon.className = 'fas fa-sync-alt';
        }
        if (restartBtnText) {
            restartBtnText.textContent = t('header.reload');
            restartBtnText.setAttribute('data-i18n', 'header.reload');
        }
        restartBtn.setAttribute('aria-label', t('header.reload'));
        restartBtn.setAttribute('data-i18n-aria-label', 'header.reload');
        restartBtn.title = t('header.reload');
    } else {
        // 子进程模式：显示"重启"按钮
        if (restartBtnIcon) {
            restartBtnIcon.className = 'fas fa-redo';
        }
        if (restartBtnText) {
            restartBtnText.textContent = t('header.restart');
            restartBtnText.setAttribute('data-i18n', 'header.restart');
        }
        restartBtn.setAttribute('aria-label', t('header.restart'));
        restartBtn.setAttribute('data-i18n-aria-label', 'header.restart');
        restartBtn.title = t('header.restart');
    }
}

/**
 * 更新服务器时间和运行时间显示（本地计算）
 */
function updateTimeDisplay() {
    if (!initialServerTime || initialUptime === null || !initialLoadTime) {
        return;
    }

    const serverTimeEl = document.getElementById('serverTime');
    const uptimeEl = document.getElementById('uptime');

    // 计算经过的秒数
    const elapsedSeconds = Math.floor((Date.now() - initialLoadTime) / 1000);

    // 更新服务器时间
    if (serverTimeEl) {
        const currentServerTime = new Date(initialServerTime.getTime() + elapsedSeconds * 1000);
        serverTimeEl.textContent = currentServerTime.toLocaleString(getCurrentLanguage(), {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    // 更新运行时间
    if (uptimeEl) {
        const currentUptime = initialUptime + elapsedSeconds;
        uptimeEl.textContent = formatUptime(currentUptime);
    }
}

/**
 * 加载提供商列表
 */
async function loadProviders() {
    try {
        const [providers, supportedProviders] = await Promise.all([
            window.apiClient.get('/providers'),
            window.apiClient.get('/providers/supported')
        ]);
        renderProviders(providers, supportedProviders);
    } catch (error) {
        console.error('Failed to load providers:', error);
    }
}

/**
 * 渲染提供商列表
 * @param {Object} providers - 提供商数据
 * @param {string[]} supportedProviders - 已注册的提供商类型列表
 */
function renderProviders(providers, supportedProviders = []) {
    const container = document.getElementById('providersList');
    if (!container) return;

    container.innerHTML = '';

    // 检查是否有提供商池数据
    const hasProviders = Object.keys(providers).length > 0;
    const statsGrid = document.querySelector('#providers .stats-grid');

    // 始终显示统计卡片
    if (statsGrid) statsGrid.style.display = 'grid';

    // 定义所有支持的提供商配置（顺序、显示名称、是否显示）
    // visible 现在由 supportedProviders 决定
    const providerConfigs = [
        { id: 'grok-custom', name: 'Grok Reverse', visible: supportedProviders.includes('grok-custom') }
    ];

    // 提取显示的 ID 顺序
    const providerDisplayOrder = providerConfigs.filter(c => c.visible !== false).map(c => c.id);

    // 建立 ID 到配置的映射，方便获取显示名称
    const configMap = providerConfigs.reduce((map, config) => {
        map[config.id] = config;
        return map;
    }, {});

    // 获取所有提供商类型并按指定顺序排序
    // 优先显示预定义的所有提供商类型，即使某些提供商没有数据也要显示
    let allProviderTypes;
    if (hasProviders) {
        // 合并预定义类型和实际存在的类型，确保显示所有预定义提供商
        const actualProviderTypes = Object.keys(providers);
        // 只保留配置中标记为 visible 的，或者不在配置中的（默认显示）
        allProviderTypes = [...new Set([...providerDisplayOrder, ...actualProviderTypes])];
    } else {
        allProviderTypes = providerDisplayOrder;
    }

    // 过滤掉明确设置为不显示的提供商
    const sortedProviderTypes = providerDisplayOrder.filter(type => allProviderTypes.includes(type))
        .concat(allProviderTypes.filter(type => !providerDisplayOrder.some(t => t === type) && !configMap[type]?.visible === false));

    // 计算总统计
    let totalAccounts = 0;
    let totalHealthy = 0;

    // 按照排序后的提供商类型渲染
    sortedProviderTypes.forEach((providerType) => {
        // 如果配置中明确设置为不显示，则跳过
        if (configMap[providerType] && configMap[providerType].visible === false) {
            return;
        }

        const accounts = hasProviders ? providers[providerType] || [] : [];
        const providerDiv = document.createElement('div');
        providerDiv.className = 'provider-item';
        providerDiv.dataset.providerType = providerType;
        providerDiv.style.cursor = 'pointer';

        const healthyCount = accounts.filter(acc => acc.isHealthy).length;
        const totalCount = accounts.length;
        const usageCount = accounts.reduce((sum, acc) => sum + (acc.usageCount || 0), 0);
        const errorCount = accounts.reduce((sum, acc) => sum + (acc.errorCount || 0), 0);

        totalAccounts += totalCount;
        totalHealthy += healthyCount;

        // 更新全局统计变量
        if (!providerStats.providerTypeStats[providerType]) {
            providerStats.providerTypeStats[providerType] = {
                totalAccounts: 0,
                healthyAccounts: 0,
                totalUsage: 0,
                totalErrors: 0,
                lastUpdate: null
            };
        }

        const typeStats = providerStats.providerTypeStats[providerType];
        typeStats.totalAccounts = totalCount;
        typeStats.healthyAccounts = healthyCount;
        typeStats.totalUsage = usageCount;
        typeStats.totalErrors = errorCount;
        typeStats.lastUpdate = new Date().toISOString();

        // 为无数据状态设置特殊样式
        const isEmptyState = !hasProviders || totalCount === 0;
        const statusClass = isEmptyState ? 'status-empty' : (healthyCount === totalCount ? 'status-healthy' : 'status-unhealthy');
        const statusIcon = isEmptyState ? 'fa-info-circle' : (healthyCount === totalCount ? 'fa-check-circle' : 'fa-exclamation-triangle');
        const statusText = isEmptyState ? t('providers.status.empty') : t('providers.status.healthy', { healthy: healthyCount, total: totalCount });

        // 获取显示名称
        const displayName = configMap[providerType]?.name || providerType;

        providerDiv.innerHTML = `
            <div class="provider-header">
                <div class="provider-name">
                    <span class="provider-type-text">${displayName}</span>
                </div>
                <div class="provider-header-right">
                    ${generateAuthButton(providerType)}
                    <div class="provider-status ${statusClass}">
                        <i class="fas fa-${statusIcon}"></i>
                        <span>${statusText}</span>
                    </div>
                </div>
            </div>
            <div class="provider-stats">
                <div class="provider-stat">
                    <span class="provider-stat-label" data-i18n="providers.stat.totalAccounts">${t('providers.stat.totalAccounts')}</span>
                    <span class="provider-stat-value">${totalCount}</span>
                </div>
                <div class="provider-stat">
                    <span class="provider-stat-label" data-i18n="providers.stat.healthyAccounts">${t('providers.stat.healthyAccounts')}</span>
                    <span class="provider-stat-value">${healthyCount}</span>
                </div>
                <div class="provider-stat">
                    <span class="provider-stat-label" data-i18n="providers.stat.usageCount">${t('providers.stat.usageCount')}</span>
                    <span class="provider-stat-value">${usageCount}</span>
                </div>
                <div class="provider-stat">
                    <span class="provider-stat-label" data-i18n="providers.stat.errorCount">${t('providers.stat.errorCount')}</span>
                    <span class="provider-stat-value">${errorCount}</span>
                </div>
            </div>
        `;

        // 如果是空状态，添加特殊样式
        if (isEmptyState) {
            providerDiv.classList.add('empty-provider');
        }

        // 添加点击事件 - 整个提供商组都可以点击
        providerDiv.addEventListener('click', (e) => {
            e.preventDefault();
            openProviderManager(providerType);
        });

        container.appendChild(providerDiv);

        // 为授权按钮添加事件监听
        const authBtn = providerDiv.querySelector('.generate-auth-btn');
        if (authBtn) {
            authBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡到父元素
                handleGenerateAuthUrl(providerType);
            });
        }
    });

    // 更新统计卡片数据
    const activeProviders = hasProviders ? Object.keys(providers).length : 0;
    updateProviderStatsDisplay(activeProviders, totalHealthy, totalAccounts);
}

/**
 * 更新提供商统计信息
 * @param {number} activeProviders - 活跃提供商数
 * @param {number} healthyProviders - 健康提供商数
 * @param {number} totalAccounts - 总账户数
 */
function updateProviderStatsDisplay(activeProviders, healthyProviders, totalAccounts) {
    // 更新全局统计变量
    const newStats = {
        activeProviders,
        healthyProviders,
        totalAccounts,
        lastUpdateTime: new Date().toISOString()
    };

    updateProviderStats(newStats);

    // 计算总请求数和错误数
    let totalUsage = 0;
    let totalErrors = 0;
    Object.values(providerStats.providerTypeStats).forEach(typeStats => {
        totalUsage += typeStats.totalUsage || 0;
        totalErrors += typeStats.totalErrors || 0;
    });

    const finalStats = {
        ...newStats,
        totalRequests: totalUsage,
        totalErrors: totalErrors
    };

    updateProviderStats(finalStats);

    // 修改：根据使用次数统计"活跃提供商"和"活动连接"
    // "活跃提供商"：统计有使用次数(usageCount > 0)的提供商类型数量
    let activeProvidersByUsage = 0;
    Object.entries(providerStats.providerTypeStats).forEach(([providerType, typeStats]) => {
        if (typeStats.totalUsage > 0) {
            activeProvidersByUsage++;
        }
    });

    // "活动连接"：统计所有提供商账户的使用次数总和
    const activeConnections = totalUsage;

    // 更新页面显示
    const activeProvidersEl = document.getElementById('activeProviders');
    const healthyProvidersEl = document.getElementById('healthyProviders');
    const activeConnectionsEl = document.getElementById('activeConnections');

    if (activeProvidersEl) activeProvidersEl.textContent = activeProvidersByUsage;
    if (healthyProvidersEl) healthyProvidersEl.textContent = healthyProviders;
    if (activeConnectionsEl) activeConnectionsEl.textContent = activeConnections;

    // 打印调试信息到控制台
    console.log('Provider Stats Updated:', {
        activeProviders,
        activeProvidersByUsage,
        healthyProviders,
        totalAccounts,
        totalUsage,
        totalErrors,
        providerTypeStats: providerStats.providerTypeStats
    });
}

/**
 * 打开提供商管理模态框
 * @param {string} providerType - 提供商类型
 */
async function openProviderManager(providerType) {
    try {
        const data = await window.apiClient.get(`/providers/${encodeURIComponent(providerType)}`);

        showProviderManagerModal(data);
    } catch (error) {
        console.error('Failed to load provider details:', error);
        showToast(t('common.error'), t('modal.provider.load.failed'), 'error');
    }
}

/**
 * 生成授权按钮HTML
 * @param {string} providerType - 提供商类型
 * @returns {string} 授权按钮HTML
 */
function generateAuthButton(providerType) {
    if (providerType === 'grok-custom') {
        return `
            <button class="generate-auth-btn" title="批量导入 SSO Token" onclick="showGrokBatchImportModal()">
                <i class="fas fa-file-import"></i>
                <span data-i18n="oauth.grok.batchImport">Batch Import</span>
            </button>
        `;
    }
    return '';
}
/**
 * 显示 Grok 批量导入模态框
 */
window.showGrokBatchImportModal = function () {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3><i class="fas fa-file-import"></i> <span data-i18n="oauth.grok.batchImport">Batch Import SSO Tokens</span> (grok-custom)</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="batch-import-instructions" style="margin-bottom: 16px; padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
                    <p style="margin: 0; font-size: 14px; color: #1e40af;">
                        <i class="fas fa-info-circle"></i>
                        <span data-i18n="oauth.grok.importInstructions">Enter one SSO Token per line. Empty lines will be ignored. Duplicate tokens will be skipped.</span>
                    </p>
                </div>
                <div class="form-group">
                    <label for="batchGrokTokens" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                        <span data-i18n="oauth.grok.tokensLabel">SSO Tokens</span>
                    </label>
                    <textarea 
                        id="batchGrokTokens" 
                        rows="10" 
                        style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-family: monospace; font-size: 13px; resize: vertical;"
                        placeholder="sso-xxx-12345
sso-yyy-67890"
                    ></textarea>
                </div>
                <div class="batch-import-stats" id="grokBatchStats" style="display: none; margin-top: 12px; padding: 12px; background: #f3f4f6; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span data-i18n="oauth.grok.tokenCount">Tokens to be imported:</span>
                        <span id="grokTokenCountValue" style="font-weight: 600;">0</span>
                    </div>
                </div>
                <div class="batch-import-progress" id="grokBatchProgress" style="display: none; margin-top: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-spinner fa-spin" style="color: #4285f4;"></i>
                        <span data-i18n="oauth.grok.importing">Importing...</span>
                    </div>
                </div>
                <div class="batch-import-result" id="grokBatchResult" style="display: none; margin-top: 16px; padding: 12px; border-radius: 8px;"></div>
            </div>
            <div class="modal-footer">
                <button class="modal-cancel" data-i18n="modal.provider.cancel">${t('modal.provider.cancel')}</button>
                <button class="btn btn-primary batch-import-submit" id="grokBatchSubmit">
                    <i class="fas fa-upload"></i>
                    <span data-i18n="oauth.grok.startImport">Start Import</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const textarea = modal.querySelector('#batchGrokTokens');
    const statsDiv = modal.querySelector('#grokBatchStats');
    const tokenCountValue = modal.querySelector('#grokTokenCountValue');
    const progressDiv = modal.querySelector('#grokBatchProgress');
    const resultDiv = modal.querySelector('#grokBatchResult');
    const submitBtn = modal.querySelector('#grokBatchSubmit');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.modal-cancel');

    // 实时统计 token 数量
    textarea.addEventListener('input', () => {
        const val = textarea.value.trim();
        if (!val) {
            statsDiv.style.display = 'none';
            return;
        }
        const lines = val.split('\\n').map(line => line.trim()).filter(line => line.length > 0);
        statsDiv.style.display = 'block';
        tokenCountValue.textContent = lines.length;
    });

    // 关闭按钮事件
    [closeBtn, cancelBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            modal.remove();
        });
    });

    // 提交按钮事件
    submitBtn.addEventListener('click', async () => {
        const tokenText = textarea.value.trim();

        if (!tokenText) {
            showToast(t('common.warning'), 'Please enter at least one token', 'warning');
            return;
        }

        textarea.disabled = true;
        submitBtn.disabled = true;
        cancelBtn.disabled = true;
        progressDiv.style.display = 'block';
        resultDiv.style.display = 'none';

        try {
            const response = await fetch('/api/grok/batch-import-tokens', {
                method: 'POST',
                headers: window.apiClient ? window.apiClient.getAuthHeaders() : {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    targetPool: 'grok-custom',
                    tokenText: tokenText
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
            }

            progressDiv.style.display = 'none';
            resultDiv.style.cssText = 'display: block; margin-top: 16px; padding: 12px; border-radius: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534;';
            resultDiv.innerHTML = `<i class="fas fa-check-circle"></i> <strong>Successfully imported ${data.importedCount} new tokens</strong>`;

            submitBtn.innerHTML = `<i class="fas fa-check-circle"></i> <span>${t('common.success')}</span>`;

            // Reload providers list
            loadProviders();

        } catch (error) {
            console.error('[Grok Batch Import] Failed:', error);
            progressDiv.style.display = 'none';
            resultDiv.style.cssText = 'display: block; margin-top: 16px; padding: 12px; border-radius: 8px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;';
            resultDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-times-circle"></i>
                    <strong>Import Error: ${error.message}</strong>
                </div>
            `;

            textarea.disabled = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-upload"></i> <span data-i18n="oauth.grok.startImport">Start Import</span>`;
            cancelBtn.disabled = false;
        }
    });
}



/**
 * 显示需要重启的提示模态框
 * @param {string} version - 更新到的版本号
 */
function showRestartRequiredModal(version) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay restart-required-modal';
    modal.style.display = 'flex';

    modal.innerHTML = `
                    < div class= "modal-content restart-modal-content" style = "max-width: 420px;" >
            <div class="modal-header restart-modal-header">
                <h3><i class="fas fa-check-circle" style="color: #10b981;"></i> <span data-i18n="dashboard.update.restartTitle">${t('dashboard.update.restartTitle')}</span></h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body" style="text-align: center; padding: 20px;">
                <p style="font-size: 1rem; color: #374151; margin: 0;" data-i18n="dashboard.update.restartMsg" data-i18n-params='{"version":"${version}"}'>${t('dashboard.update.restartMsg', { version })}</p>
            </div>
            <div class="modal-footer">
                <button class="btn restart-confirm-btn">
                    <i class="fas fa-check"></i>
                    <span data-i18n="common.confirm">${t('common.confirm')}</span>
                </button>
            </div>
        </div >
                    `;

    document.body.appendChild(modal);

    // 关闭按钮事件
    const closeBtn = modal.querySelector('.modal-close');
    const confirmBtn = modal.querySelector('.restart-confirm-btn');

    const closeModal = () => {
        modal.remove();
    };

    closeBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', closeModal);

    // 点击遮罩层关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

/**
 * 检查更新
 * @param {boolean} silent - 是否静默检查（不显示 Toast）
 */
async function checkUpdate(silent = false) {
    const checkBtn = document.getElementById('checkUpdateBtn');
    const updateBtn = document.getElementById('performUpdateBtn');
    const updateBadge = document.getElementById('updateBadge');
    const latestVersionText = document.getElementById('latestVersionText');
    const checkBtnIcon = checkBtn?.querySelector('i');
    const checkBtnText = checkBtn?.querySelector('span');

    try {
        if (!silent && checkBtn) {
            checkBtn.disabled = true;
            if (checkBtnIcon) checkBtnIcon.className = 'fas fa-spinner fa-spin';
            if (checkBtnText) checkBtnText.textContent = t('dashboard.update.checking');
        }

        const data = await window.apiClient.get('/check-update');

        if (data.hasUpdate) {
            if (updateBtn) updateBtn.style.display = 'inline-flex';
            if (updateBadge) updateBadge.style.display = 'inline-flex';
            if (latestVersionText) latestVersionText.textContent = data.latestVersion;

            if (!silent) {
                showToast(t('common.info'), t('dashboard.update.hasUpdate', { version: data.latestVersion }), 'info');
            }
        } else {
            if (updateBtn) updateBtn.style.display = 'none';
            if (updateBadge) updateBadge.style.display = 'none';
            if (!silent) {
                showToast(t('common.info'), t('dashboard.update.upToDate'), 'success');
            }
        }
    } catch (error) {
        console.error('Check update failed:', error);
        if (!silent) {
            showToast(t('common.error'), t('dashboard.update.failed', { error: error.message }), 'error');
        }
    } finally {
        if (checkBtn) {
            checkBtn.disabled = false;
            if (checkBtnIcon) checkBtnIcon.className = 'fas fa-sync-alt';
            if (checkBtnText) checkBtnText.textContent = t('dashboard.update.check');
        }
    }
}

/**
 * 执行更新
 */
async function performUpdate() {
    const updateBtn = document.getElementById('performUpdateBtn');
    const latestVersionText = document.getElementById('latestVersionText');
    const version = latestVersionText?.textContent || '';

    if (!confirm(t('dashboard.update.confirmMsg', { version }))) {
        return;
    }

    const updateBtnIcon = updateBtn?.querySelector('i');
    const updateBtnText = updateBtn?.querySelector('span');

    try {
        if (updateBtn) {
            updateBtn.disabled = true;
            if (updateBtnIcon) updateBtnIcon.className = 'fas fa-spinner fa-spin';
            if (updateBtnText) updateBtnText.textContent = t('dashboard.update.updating');
        }

        showToast(t('common.info'), t('dashboard.update.updating'), 'info');

        const data = await window.apiClient.post('/update');

        if (data.success) {
            if (data.updated) {
                // 代码已更新，直接调用重启服务
                showToast(t('common.success'), t('dashboard.update.success'), 'success');

                // 自动重启服务
                await restartServiceAfterUpdate();
            } else {
                // 已是最新版本
                showToast(t('common.info'), t('dashboard.update.upToDate'), 'info');
            }
        }
    } catch (error) {
        console.error('Update failed:', error);
        showToast(t('common.error'), t('dashboard.update.failed', { error: error.message }), 'error');
    } finally {
        if (updateBtn) {
            updateBtn.disabled = false;
            if (updateBtnIcon) updateBtnIcon.className = 'fas fa-download';
            if (updateBtnText) updateBtnText.textContent = t('dashboard.update.perform');
        }
    }
}

/**
 * 更新后自动重启服务
 */
async function restartServiceAfterUpdate() {
    try {
        showToast(t('common.info'), t('header.restart.requesting'), 'info');

        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/restart-service', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast(t('common.success'), result.message || t('header.restart.success'), 'success');

            // 如果是 worker 模式，服务会自动重启，等待几秒后刷新页面
            if (result.mode === 'worker') {
                setTimeout(() => {
                    showToast(t('common.info'), t('header.restart.reconnecting'), 'info');
                    // 等待服务重启后刷新页面
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                }, 2000);
            }
        } else {
            // 显示错误信息
            const errorMsg = result.message || result.error?.message || t('header.restart.failed');
            showToast(t('common.error'), errorMsg, 'error');

            // 如果是独立模式，显示提示
            if (result.mode === 'standalone') {
                showToast(t('common.info'), result.hint, 'warning');
            }
        }
    } catch (error) {
        console.error('Restart after update failed:', error);
        showToast(t('common.error'), t('header.restart.failed') + ': ' + error.message, 'error');
    }
}

export {
    loadSystemInfo,
    updateTimeDisplay,
    loadProviders,
    renderProviders,
    updateProviderStatsDisplay,
    openProviderManager,
    checkUpdate,
    performUpdate
};