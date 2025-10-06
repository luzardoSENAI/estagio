import { getStatusFromRecord } from '../../utils/helpers.js';

export function initializeDetailsModal(mainContentArea, entities) {
    mainContentArea.addEventListener('click', function(event) {
        if (event.target.classList.contains('view-details-btn')) {
            event.preventDefault();
            const nomeEstagiario = event.target.dataset.nome;
            const entity = entities.find(e => e.nome === nomeEstagiario);

            if (entity) {
                populateAndShowModal(entity);
            }
        }
    });
}

function populateAndShowModal(entity) {
    const modalBody = document.getElementById('entityDetailsModalBody');
    const modalTitle = document.getElementById('entityDetailsModalLabel');
    if (!modalBody || !modalTitle) return;

    const stats = calculateFrequencyStats(entity);

    modalTitle.textContent = `Detalhes de ${entity.nome}`;
    modalBody.innerHTML = `
        <h6>Dados Pessoais</h6>
        <p class="mb-1 small"><strong>ID:</strong> ${entity.id || 'N/A'}</p>
        <p class="mb-1 small"><strong>Idade:</strong> ${entity.idade || 'N/A'}</p>
        <p class="mb-1 small"><strong>CPF:</strong> ${entity.cpf || 'N/A'}</p>
        <p class="mb-1 small"><strong>Nascimento:</strong> ${entity['data de nascimento'] || 'N/A'}</p>
        <p class="mb-1 small"><strong>Número:</strong> ${entity.número || 'N/A'}</p>
        <hr>
        <h6>Resumo de Frequência (Total)</h6>
        <div class="row align-items-center">
            <div class="col-md-7">
                <ul class="list-unstyled mb-0">
                    <li><strong>Total de dias no sistema:</strong> ${stats.totalDays}</li>
                    <li><i class="fas fa-check-circle text-success me-2"></i><strong>Presenças:</strong> ${stats.presentDays}</li>
                    <li><i class="fas fa-clock text-warning me-2"></i><strong>Atrasos:</strong> ${stats.lateDays}</li>
                    <li><i class="fas fa-times-circle text-danger me-2"></i><strong>Faltas:</strong> ${stats.absentDays}</li>
                </ul>
            </div>
            <div class="col-md-5 d-flex align-items-center justify-content-center mt-3 mt-md-0">
                <div style="position: relative; height: 140px; width: 140px;">
                    <canvas id="frequencyDetailChart"></canvas>
                </div>
            </div>
        </div>
    `;

    const chartCanvas = document.getElementById('frequencyDetailChart');
    // Renderiza o gráfico apenas se houver dados para exibir
    if (chartCanvas && (stats.presentDays > 0 || stats.lateDays > 0 || stats.absentDays > 0)) {
        const existingChart = Chart.getChart(chartCanvas);
        if (existingChart) {
            existingChart.destroy();
        }

        new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Presenças', 'Atrasos', 'Faltas'],
                datasets: [{
                    data: [stats.presentDays, stats.lateDays, stats.absentDays],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.raw} dias` } } }
            }
        });
    }

    const entityModal = new bootstrap.Modal(document.getElementById('entityDetailsModal'));
    entityModal.show();
}

function calculateFrequencyStats(entity) {
    const stats = { totalDays: entity.registros.length, presentDays: 0, lateDays: 0, absentDays: 0 };

    entity.registros.forEach(record => {
        const status = getStatusFromRecord(record);
        switch (status) {
            case 'Presente': stats.presentDays++; break;
            case 'Atraso': stats.lateDays++; break;
            case 'Faltou': stats.absentDays++; break;
        }
    });
    return stats;
}