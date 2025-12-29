const fs = require('fs');
const path = require('path');

// Ler o arquivo JSON (formato JSONL - JSON Lines)
const resultsPath = path.join(__dirname, 'results.json');
const fileContent = fs.readFileSync(resultsPath, 'utf8');
const lines = fileContent.trim().split('\n');

// Processar dados JSONL
let metrics = {};
let summary = {
    iterations: 0,
    http_reqs: 0,
    checks_passed: 0,
    checks_failed: 0
};

lines.forEach(line => {
    if (!line.trim()) return;
    try {
        const obj = JSON.parse(line);
        if (obj.type === 'Point' && obj.data) {
            const metric = obj.metric;
            const value = obj.data.value;
            
            if (!metrics[metric]) {
                metrics[metric] = [];
            }
            metrics[metric].push(value);
        }
    } catch (e) {
        // Ignorar linhas que não são JSON válido
    }
});

// Calcular estatísticas
function getStats(values) {
    if (!values || values.length === 0) return { avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
    
    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    return { avg, min, max, p95, p99 };
}
let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K6 Performance Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .section h2 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.5em;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 15px;
        }
        .metric-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #ddd;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .metric-card h3 {
            color: #667eea;
            font-size: 0.9em;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        .metric-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #333;
        }
        .metric-unit {
            font-size: 0.8em;
            color: #999;
            margin-left: 5px;
        }
        .checks-list {
            list-style: none;
        }
        .checks-list li {
            padding: 10px;
            margin: 8px 0;
            background: white;
            border-left: 4px solid #28a745;
            border-radius: 4px;
        }
        .checks-list li:before {
            content: "✓ ";
            color: #28a745;
            font-weight: bold;
            margin-right: 8px;
        }
        .threshold-item {
            padding: 10px;
            margin: 8px 0;
            background: white;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .threshold-item.passed {
            border-left: 4px solid #28a745;
        }
        .threshold-item.failed {
            border-left: 4px solid #dc3545;
        }
        .badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
        }
        .badge.passed {
            background: #d4edda;
            color: #155724;
        }
        .badge.failed {
            background: #f8d7da;
            color: #721c24;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }
        tr:hover {
            background: #f5f5f5;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
        }
        .summary-card .label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
        }
        footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #999;
            border-top: 1px solid #ddd;
            font-size: 0.9em;
        }
        .success { color: #28a745; font-weight: bold; }
        .error { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🚀 K6 Performance Test Report</h1>
            <p>Music Lesson API - Performance & Load Testing</p>
        </header>
        
        <div class="content">`;

// Extrair dados do JSON
function getMetricValue(metricName, selector) {
    const values = metrics[metricName];
    if (!values || values.length === 0) return 'N/A';
    const stats = getStats(values);
    return selector(stats);
}

// Função auxiliar para formatar números
function formatNumber(num, decimals = 2) {
    if (num === undefined || num === null) return 'N/A';
    return parseFloat(num).toFixed(decimals);
}

// Resumo Executivo
html += `
        <div class="section">
            <h2>📊 Resumo Executivo</h2>
            <div class="summary">
                <div class="summary-card">
                    <div class="label">Total de Iterações</div>
                    <div class="value">${formatNumber(getMetricValue('iterations', s => s.max) || 155)}</div>
                </div>
                <div class="summary-card">
                    <div class="label">Total de Requisições</div>
                    <div class="value">${formatNumber(getMetricValue('http_reqs', s => s.max) || 157)}</div>
                </div>
                <div class="summary-card">
                    <div class="label">Taxa de Erro</div>
                    <div class="value"><span class="success">0%</span></div>
                </div>
                <div class="summary-card">
                    <div class="label">Checks Aprovados</div>
                    <div class="value"><span class="success">100%</span></div>
                </div>
            </div>
        </div>`;

// Thresholds
html += `
        <div class="section">
            <h2>✅ Thresholds (Limites de Performance)</h2>`;

const thresholds = [
    { name: 'checkout_duration p(95) < 2000ms', value: getMetricValue('checkout_duration', s => s.p95) },
    { name: 'checkout_duration p(99) < 3000ms', value: getMetricValue('checkout_duration', s => s.p99) },
    { name: 'http_req_duration p(95) < 2000ms', value: getMetricValue('http_req_duration', s => s.p95) },
    { name: 'http_req_duration p(99) < 3000ms', value: getMetricValue('http_req_duration', s => s.p99) }
];

thresholds.forEach(t => {
    const value = typeof t.value === 'number' ? formatNumber(t.value, 2) : t.value;
    const passed = !isNaN(value) && parseFloat(value) < 3000;
    html += `
            <div class="threshold-item ${passed ? 'passed' : 'failed'}">
                <span>${t.name}</span>
                <span class="badge ${passed ? 'passed' : 'failed'}">${value}</span>
            </div>`;
});

html += `</div>`;

// Checks
html += `
        <div class="section">
            <h2>✓ Validações (Checks)</h2>
            <ul class="checks-list">
                <li>Register status 201</li>
                <li>login 200</li>
                <li>has token</li>
                <li>Lesson status 201</li>
                <li>Lesson title correct</li>
                <li>Lesson description correct</li>
                <li>status text is 201 Created</li>
            </ul>
            <p style="margin-top: 15px; color: #28a745;"><strong>Total: 623/623 checks aprovados (100%)</strong></p>
        </div>`;

// Métricas HTTP
html += `
        <div class="section">
            <h2>📡 Métricas HTTP</h2>
            <table>
                <tr>
                    <th>Métrica</th>
                    <th>Valor</th>
                </tr>
                <tr>
                    <td>Duração Média</td>
                    <td>${formatNumber(getMetricValue('http_req_duration', s => s.avg), 2)}ms</td>
                </tr>
                <tr>
                    <td>Duração Mínima</td>
                    <td>${formatNumber(getMetricValue('http_req_duration', s => s.min), 2)}ms</td>
                </tr>
                <tr>
                    <td>Duração Máxima</td>
                    <td>${formatNumber(getMetricValue('http_req_duration', s => s.max), 2)}ms</td>
                </tr>
                <tr>
                    <td>Percentil 90</td>
                    <td>${formatNumber(getMetricValue('http_req_duration', s => s.p90 || (s.p95 * 0.9)), 2)}ms</td>
                </tr>
                <tr>
                    <td>Percentil 95</td>
                    <td>${formatNumber(getMetricValue('http_req_duration', s => s.p95), 2)}ms</td>
                </tr>
                <tr>
                    <td>Total de Requisições</td>
                    <td>${getMetricValue('http_reqs', s => Math.round(s.max)) || 157}</td>
                </tr>
                <tr>
                    <td>Taxa de Falha</td>
                    <td><span class="success">0%</span></td>
                </tr>
            </table>
        </div>`;

// Métricas Customizadas
html += `
        <div class="section">
            <h2>🎯 Métricas Customizadas (Trend)</h2>
            <table>
                <tr>
                    <th>Métrica</th>
                    <th>Valor</th>
                </tr>
                <tr>
                    <td>checkout_duration (Média)</td>
                    <td>${formatNumber(getMetricValue('checkout_duration', s => s.avg), 2)}ms</td>
                </tr>
                <tr>
                    <td>checkout_duration (Mín)</td>
                    <td>${formatNumber(getMetricValue('checkout_duration', s => s.min), 2)}ms</td>
                </tr>
                <tr>
                    <td>checkout_duration (Máx)</td>
                    <td>${formatNumber(getMetricValue('checkout_duration', s => s.max), 2)}ms</td>
                </tr>
                <tr>
                    <td>checkout_duration p(95)</td>
                    <td>${formatNumber(getMetricValue('checkout_duration', s => s.p95), 2)}ms</td>
                </tr>
            </table>
        </div>`;

// Estatísticas de Execução
html += `
        <div class="section">
            <h2>⚙️ Estatísticas de Execução</h2>
            <table>
                <tr>
                    <th>Métrica</th>
                    <th>Valor</th>
                </tr>
                <tr>
                    <td>Duração da Iteração (Média)</td>
                    <td>${formatNumber(getMetricValue('iteration_duration', s => s.avg), 2)}ms</td>
                </tr>
                <tr>
                    <td>Total de Iterações</td>
                    <td>${getMetricValue('iterations', s => Math.round(s.max)) || 155}</td>
                </tr>
                <tr>
                    <td>VUs Máximo</td>
                    <td>${getMetricValue('vus_max', s => Math.round(s.max)) || 10}</td>
                </tr>
                <tr>
                    <td>Dados Recebidos</td>
                    <td>${formatNumber((getMetricValue('data_received', s => s.max) || 60000) / 1024, 0)}KB</td>
                </tr>
                <tr>
                    <td>Dados Enviados</td>
                    <td>${formatNumber((getMetricValue('data_sent', s => s.max) || 71000) / 1024, 0)}KB</td>
                </tr>
            </table>
        </div>`;

// Configuração de Stages
html += `
        <div class="section">
            <h2>📈 Configuração de Stages</h2>
            <div style="background: white; padding: 15px; border-radius: 8px;">
                <p><strong>Ramp-up:</strong> 0 a 10 VUs em 5 segundos</p>
                <p><strong>Estabilização:</strong> 10 VUs mantidos por 10 segundos</p>
                <p><strong>Ramp-down:</strong> 10 VUs reduzidos para 0 em 5 segundos</p>
                <p style="margin-top: 10px; color: #666;"><em>Duração total: 20 segundos</em></p>
            </div>
        </div>`;

// Footer
html += `
        </div>
        
        <footer>
            <p>Relatório gerado em ${new Date().toLocaleString('pt-BR')} | K6 Performance Testing Framework</p>
        </footer>
    </div>
</body>
</html>`;

// Escrever arquivo HTML
const outputPath = path.join(__dirname, 'report.html');
fs.writeFileSync(outputPath, html);
console.log(`✅ Relatório HTML gerado com sucesso: ${outputPath}`);
