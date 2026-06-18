import type { SKU, Batch, OperationLog, Alert } from '@/types';
import { formatDate } from './inventoryCalculator';

export interface ReportData {
  skus: SKU[];
  batches: Batch[];
  operationLogs: OperationLog[];
  alerts: Alert[];
}

export function generateReportText(data: ReportData): string {
  const { skus, batches, operationLogs, alerts } = data;
  const now = new Date();
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                  盲盒仓管 - 演练报告');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`导出时间：${now.toLocaleString('zh-CN')}`);
  lines.push('');

  const totalStock = skus.reduce((sum, s) => sum + s.totalStock, 0);
  const totalSKUs = skus.length;
  const totalBatches = batches.length;
  const warningBatches = batches.filter(b => b.status === 'warning' && !b.isFrozen).length;
  const frozenBatches = batches.filter(b => b.isFrozen).length;
  const expiredBatches = batches.filter(b => b.status === 'expired').length;
  const unreadAlerts = alerts.filter(a => !a.isRead).length;

  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  一、总览统计');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`  总库存数量：${totalStock} 件`);
  lines.push(`  商品种类：  ${totalSKUs} 种`);
  lines.push(`  批次总数：  ${totalBatches} 个`);
  lines.push(`  临期批次：  ${warningBatches} 个`);
  lines.push(`  冻结批次：  ${frozenBatches} 个`);
  lines.push(`  过期批次：  ${expiredBatches} 个`);
  lines.push(`  未读告警：  ${unreadAlerts} 条`);
  lines.push('');

  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  二、临期批次明细');
  lines.push('───────────────────────────────────────────────────────────────');
  const warningBatchList = batches.filter(b => b.status === 'warning' && !b.isFrozen);
  if (warningBatchList.length === 0) {
    lines.push('  暂无临期批次');
  } else {
    warningBatchList.forEach((batch, index) => {
      const sku = skus.find(s => s.id === batch.skuId);
      lines.push(`  ${index + 1}. 批次号：${batch.batchNo}`);
      lines.push(`     商品：${sku?.name || batch.skuId}（${sku?.skuCode || ''}）`);
      lines.push(`     生产日期：${formatDate(batch.productionDate)}`);
      lines.push(`     过期日期：${formatDate(batch.expiryDate)}`);
      lines.push(`     可用数量：${batch.availableQuantity} / ${batch.quantity}`);
      lines.push('');
    });
  }
  lines.push('');

  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  三、冻结批次明细');
  lines.push('───────────────────────────────────────────────────────────────');
  const frozenBatchList = batches.filter(b => b.isFrozen);
  if (frozenBatchList.length === 0) {
    lines.push('  暂无冻结批次');
  } else {
    frozenBatchList.forEach((batch, index) => {
      const sku = skus.find(s => s.id === batch.skuId);
      lines.push(`  ${index + 1}. 批次号：${batch.batchNo}`);
      lines.push(`     商品：${sku?.name || batch.skuId}（${sku?.skuCode || ''}）`);
      lines.push(`     生产日期：${formatDate(batch.productionDate)}`);
      lines.push(`     过期日期：${formatDate(batch.expiryDate)}`);
      lines.push(`     冻结数量：${batch.availableQuantity} / ${batch.quantity}`);
      lines.push(`     状态：${batch.status === 'normal' ? '正常' : batch.status === 'warning' ? '临期' : '过期'}`);
      lines.push('');
    });
  }
  lines.push('');

  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  四、未读告警明细');
  lines.push('───────────────────────────────────────────────────────────────');
  const unreadAlertList = alerts.filter(a => !a.isRead);
  if (unreadAlertList.length === 0) {
    lines.push('  暂无未读告警');
  } else {
    unreadAlertList.forEach((alert, index) => {
      const levelText = alert.level === 'error' ? '错误' : alert.level === 'warning' ? '警告' : '信息';
      lines.push(`  ${index + 1}. [${levelText}] ${alert.title}`);
      lines.push(`     时间：${new Date(alert.createdAt).toLocaleString('zh-CN')}`);
      lines.push(`     内容：${alert.message}`);
      if (alert.skuId) {
        const sku = skus.find(s => s.id === alert.skuId);
        lines.push(`     关联商品：${sku?.name || alert.skuId}`);
      }
      lines.push('');
    });
  }
  lines.push('');

  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  五、最近操作日志');
  lines.push('───────────────────────────────────────────────────────────────');
  if (operationLogs.length === 0) {
    lines.push('  暂无操作记录');
  } else {
    const recentLogs = operationLogs.slice(0, 20);
    recentLogs.forEach((log, index) => {
      const typeText = log.type === 'inbound' ? '入库' : log.type === 'outbound' ? '出库' : log.type === 'freeze' ? '冻结' : '解冻';
      const statusText = log.status === 'success' ? '成功' : '失败';
      const sku = skus.find(s => s.id === log.skuId);
      lines.push(`  ${index + 1}. [${typeText}] ${statusText} - ${new Date(log.createdAt).toLocaleString('zh-CN')}`);
      lines.push(`     商品：${sku?.name || log.skuId}`);
      lines.push(`     数量：${log.quantity}`);
      lines.push(`     说明：${log.message}`);
      lines.push('');
    });
    if (operationLogs.length > 20) {
      lines.push(`  ... 共 ${operationLogs.length} 条记录，显示最近 20 条`);
    }
  }
  lines.push('');

  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  六、各 SKU 批次明细');
  lines.push('───────────────────────────────────────────────────────────────');
  skus.forEach((sku, skuIndex) => {
    const skuBatches = batches
      .filter(b => b.skuId === sku.id)
      .sort((a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime());

    lines.push('');
    lines.push(`  ${skuIndex + 1}. ${sku.name}（${sku.skuCode}）`);
    lines.push(`     分类：${sku.category}`);
    lines.push(`     可用总库存：${sku.totalStock} 件`);
    lines.push('');
    lines.push('     ┌──────────────┬────────────┬────────────┬──────────┬──────────┬──────────┐');
    lines.push('     │  批次号      │  生产日期  │  过期日期  │  总数量  │  可用量  │  状态    │');
    lines.push('     ├──────────────┼────────────┼────────────┼──────────┼──────────┼──────────┤');

    if (skuBatches.length === 0) {
      lines.push('     │  暂无批次                                                            │');
    } else {
      skuBatches.forEach(batch => {
        const statusText = batch.isFrozen ? '冻结' : batch.status === 'normal' ? '正常' : batch.status === 'warning' ? '临期' : '过期';
        const pad = (str: string, len: number) => {
          const s = str.toString();
          return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
        };
        lines.push(`     │ ${pad(batch.batchNo, 12)} │ ${pad(formatDate(batch.productionDate), 10)} │ ${pad(formatDate(batch.expiryDate), 10)} │ ${pad(batch.quantity.toString(), 8)} │ ${pad(batch.availableQuantity.toString(), 8)} │ ${pad(statusText, 8)} │`);
      });
    }
    lines.push('     └──────────────┴────────────┴────────────┴──────────┴──────────┴──────────┘');
  });
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                      报告结束');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

export function downloadReport(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateReportFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `演练报告_${year}${month}${day}_${hours}${minutes}${seconds}.txt`;
}
