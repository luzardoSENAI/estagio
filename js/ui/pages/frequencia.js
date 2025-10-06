import { getLatestRecord, getStatusFromRecord } from '../../utils/helpers.js';

let lastSelectedEntityForSummary = null;

function updateSummaryCard(entity) {
    if (!entity) return;
    const statusBg = document.getElementById('summary-card-status-bg');
    const statusIcon = document.getElementById('summary-card-status-icon');
    const statusText = document.getElementById('summary-card-status-text');
    const lastEntry = document.getElementById('summary-card-last-entry');
    if (!statusBg || !statusIcon || !statusText || !lastEntry) return;

    const latestRecord = getLatestRecord(entity);
    const status = getStatusFromRecord(latestRecord);
    const lastRegDate = latestRecord ? new Date(latestRecord.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--';
    const lastRegTime = latestRecord?.hora || '--:--';

    let iconClass, bgColor, borderColor;
    switch (status) {
        case 'Presente':
            iconClass = 'text-success'; bgColor = '#e6ffe6'; borderColor = 'var(--primary-green)'; break;
        case 'Atraso':
            iconClass = 'text-warning'; bgColor = '#fffbe6'; borderColor = 'var(--bs-warning)'; break;
        case 'Faltou':
            iconClass = 'text-danger'; bgColor = '#f8d7da'; borderColor = 'var(--bs-danger)'; break;
        default:
            iconClass = 'text-secondary'; bgColor = '#f8f9fa'; borderColor = 'var(--bs-secondary)'; break;
    }
    statusIcon.className = `fas fa-circle me-2 ${iconClass}`;
    statusText.textContent = status;
    lastEntry.innerHTML = `<strong class="d-block">${entity.nome}</strong>Último registro: ${lastRegTime} - ${lastRegDate}`;
    statusBg.style.backgroundColor = bgColor;
    statusBg.style.borderLeft = `5px solid ${borderColor}`;
}

function updateFrequencyCard(entity, startDateStr, endDateStr) {
    const titleEl = document.getElementById('frequency-card-title-2');
    const percentageEl = document.getElementById('frequency-card-percentage-2');
    const absencesEl = document.getElementById('frequency-card-absences-2');
    if (!titleEl || !percentageEl || !absencesEl) return;
    if (!entity || !entity.registros) {
        titleEl.textContent = 'Frequência'; percentageEl.textContent = 'N/A'; absencesEl.textContent = 'Nenhum registro.'; return;
    }
    let relevantRecords = entity.registros;
    let monthName = "do período";
    if (startDateStr && endDateStr) {
        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T23:59:59');
        monthName = `de ${new Date(start.valueOf() + start.getTimezoneOffset() * 60000).toLocaleString('pt-BR', { month: 'long' })}`;
        relevantRecords = entity.registros.filter(r => r.data && new Date(r.data + 'T12:00:00') >= start && new Date(r.data + 'T12:00:00') <= end);
    }
    const totalDays = relevantRecords.length;
    const absences = relevantRecords.filter(r => getStatusFromRecord(r) === 'Faltou').length;
    const presentDays = totalDays - absences;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    titleEl.textContent = `Frequência ${monthName}`;
    percentageEl.textContent = `${percentage}%`;
    absencesEl.textContent = `${absences} Faltas em ${totalDays} dias`;
}

function popularTabelaFrequencia(displayItems) {
    const tbody = document.getElementById('frequencia-tbody');
    if (!tbody) return;
    const statusMap = { 'Presente': 'bg-success', 'Atraso': 'bg-warning text-dark', 'Faltou': 'bg-danger' };

    if (displayItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">Nenhum registro encontrado.</td></tr>`;
        return;
    }
    tbody.innerHTML = displayItems.map(item => {
        const { nome, registro } = item;
        const status = getStatusFromRecord(registro);
        const lastRegDate = registro ? new Date(registro.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--';
        const lastRegTime = registro?.hora || '--:--';
        const displayReg = registro ? `${lastRegTime} - ${lastRegDate}` : '-- --';
        const badgeClass = statusMap[status] || 'bg-secondary';
        return `<tr>
            <td>${nome}</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
            <td>${displayReg}</td>
            <td><a href="#" class="text-decoration-none view-details-btn" data-nome="${nome}">Ver Detalhes</a></td>
        </tr>`;
    }).join('');
}

export function setupFrequenciaPage(entities) {
    const estagiarioSelect = document.getElementById('estagiarioSelect');
    if (estagiarioSelect) {
        const uniqueNames = [...new Set(entities.map(e => e.nome))].sort();
        uniqueNames.forEach(nome => {
            const option = document.createElement('option');
            option.value = nome;
            option.textContent = nome;
            estagiarioSelect.appendChild(option);
        });
    }

    if (!lastSelectedEntityForSummary && entities.length > 0) {
        lastSelectedEntityForSummary = entities[0];
    }

    document.getElementById('filterBtn')?.addEventListener('click', () => {
        const selectedEstagiario = document.getElementById('estagiarioSelect').value;
        const selectedStatus = document.getElementById('statusSelect').value;
        const startDateValue = document.getElementById('dataInicio').value;
        const endDateValue = document.getElementById('dataFim').value;
        document.getElementById('registro-header').textContent = selectedEstagiario === 'all' ? 'Último Registro' : 'Histórico de Registros';

        let itemsToDisplay;
        if (selectedEstagiario === 'all') {
            itemsToDisplay = entities.map(entity => ({ nome: entity.nome, registro: getLatestRecord(entity) }));
        } else {
            const selectedEntityObject = entities.find(e => e.nome === selectedEstagiario);
            if (selectedEntityObject) {
                lastSelectedEntityForSummary = selectedEntityObject;
                itemsToDisplay = selectedEntityObject.registros.map(registro => ({ nome: selectedEntityObject.nome, registro }))
                    .sort((a, b) => new Date(b.registro.data) - new Date(a.registro.data));
            } else {
                itemsToDisplay = [];
            }
        }
        if (selectedStatus !== 'all') {
            itemsToDisplay = itemsToDisplay.filter(item => getStatusFromRecord(item.registro) === selectedStatus);
        }
        if (startDateValue && endDateValue) {
            const start = new Date(startDateValue + 'T00:00:00');
            const end = new Date(endDateValue + 'T23:59:59');
            itemsToDisplay = itemsToDisplay.filter(item => item.registro?.data && new Date(item.registro.data + 'T12:00:00') >= start && new Date(item.registro.data + 'T12:00:00') <= end);
        }
        popularTabelaFrequencia(itemsToDisplay);
        updateSummaryCard(lastSelectedEntityForSummary);
        updateFrequencyCard(lastSelectedEntityForSummary, startDateValue, endDateValue);
    });

    // Carga inicial
    const initialItems = entities.map(entity => ({ nome: entity.nome, registro: getLatestRecord(entity) }));
    popularTabelaFrequencia(initialItems);
    updateSummaryCard(lastSelectedEntityForSummary);
    updateFrequencyCard(lastSelectedEntityForSummary, document.getElementById('dataInicio').value, document.getElementById('dataFim').value);
}