import { getLatestRecord, getStatusFromRecord } from '../../utils/helpers.js';

export function updateDashboard(entities) {
    if (!entities || entities.length === 0) return;

    // 1. Atualiza KPIs
    const totalEstagiarios = entities.length;
    const kpiTotalEl = document.getElementById('kpi-total-estagiarios');
    if (kpiTotalEl) kpiTotalEl.textContent = totalEstagiarios;

    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    let presentCount = 0;
    entities.forEach(entity => {
        const todayRecord = entity.registros.find(reg => reg.data === today);
        if (todayRecord && getStatusFromRecord(todayRecord) !== 'Faltou') { // Presente ou Atraso
            presentCount++;
        }
    });
    const presenceRate = totalEstagiarios > 0 ? Math.round((presentCount / totalEstagiarios) * 100) : 0;
    const kpiPresencaEl = document.getElementById('kpi-taxa-presenca');
    if (kpiPresencaEl) kpiPresencaEl.textContent = `${presenceRate}%`;

    // 2. Atualiza o gráfico de status
    updateStatusChart(entities, today);

    // 3. Atualiza o feed de atividades
    updateActivityFeed(entities);
}

function updateStatusChart(entities, today) {
    const chartEl = document.getElementById('statusChart');
    if (!chartEl) return;
    
    // Destruir gráfico antigo se existir
    const existingChart = Chart.getChart(chartEl);
    if (existingChart) {
        existingChart.destroy();
    }

    const statusCounts = { 'Presente': 0, 'Atraso': 0, 'Faltou': 0 };
    entities.forEach(entity => {
        const todayRecord = entity.registros.find(reg => reg.data === today);
        const status = todayRecord ? getStatusFromRecord(todayRecord) : 'Faltou';
        statusCounts[status]++;
    });

    new Chart(chartEl, {
        type: 'doughnut',
        data: {
            labels: ['Presentes', 'Atrasos', 'Faltas'],
            datasets: [{
                data: [statusCounts['Presente'], statusCounts['Atraso'], statusCounts['Faltou']],
                backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function updateActivityFeed(entities) {
    const activityFeedEl = document.getElementById('activity-feed');
    if (!activityFeedEl) return;

    const allRecords = entities.flatMap(entity => 
        entity.registros.map(reg => ({ ...reg, nome: entity.nome }))
    ).sort((a, b) => new Date(b.data) - new Date(a.data));

    const recentRecords = allRecords.slice(0, 5);
    activityFeedEl.innerHTML = recentRecords.map(record => {
        const dateStr = new Date(record.data).toLocaleDateString('pt-BR');
        const timeStr = record.hora ? ` às ${record.hora}` : '';
        const status = getStatusFromRecord(record);
        let statusClass = 'text-secondary';
        if (status === 'Presente') statusClass = 'text-success';
        if (status === 'Atraso') statusClass = 'text-warning';
        if (status === 'Faltou') statusClass = 'text-danger';

        return `<li class="list-group-item py-3">
            <i class="fas fa-user me-2"></i>
            <span class="fw-bold">${record.nome}</span> -
            <span class="${statusClass}">${status}</span>
            <span class="text-muted small">em ${dateStr}${timeStr}</span>
        </li>`;
    }).join('');
}