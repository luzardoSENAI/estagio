import { getStatusFromRecord } from '../../utils/helpers.js';

function generateStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) stars += '<i class="fas fa-star text-warning"></i>';
        else if (i - 0.5 <= rating) stars += '<i class="fas fa-star-half-alt text-warning"></i>';
        else stars += '<i class="far fa-star text-warning"></i>';
    }
    return stars;
}

function calculateFrequencyRating(entity) {
    if (entity.registros.length === 0) return 0;
    const absences = entity.registros.filter(r => getStatusFromRecord(r) === 'Faltou').length;
    const presencePercentage = ((entity.registros.length - absences) / entity.registros.length) * 100;
    if (presencePercentage >= 95) return 5;
    if (presencePercentage >= 85) return 4;
    if (presencePercentage >= 75) return 3;
    if (presencePercentage >= 60) return 2;
    return presencePercentage > 0 ? 1 : 0;
}

function calculatePunctualityRating(entity) {
    const relevantRecords = entity.registros.filter(r => getStatusFromRecord(r) !== 'Faltou');
    if (relevantRecords.length === 0) return 5; // Nota máxima se não há registros de presença para avaliar
    const lateDays = relevantRecords.filter(r => getStatusFromRecord(r) === 'Atraso').length;
    const latePercentage = (lateDays / relevantRecords.length) * 100;
    if (latePercentage === 0) return 5;
    if (latePercentage <= 10) return 4;
    if (latePercentage <= 20) return 3;
    if (latePercentage <= 40) return 2;
    return 1;
}

function calculateWorkQualityRating(entity) {
    // Simulação de nota de qualidade baseada no ID para consistência
    const baseRating = (parseInt(entity.id, 10) % 4) + 1.5;
    return Math.min(5, baseRating);
}

function popularTabelaAvaliacoes(container, ratedEntities) {
    if (!ratedEntities || ratedEntities.length === 0) {
        container.innerHTML = '<div class="alert alert-secondary">Nenhum estagiário encontrado.</div>';
        return;
    }
    container.innerHTML = `<div class="row row-cols-1 row-cols-lg-2 row-cols-xl-3 g-4">${ratedEntities.map(entity => {
        const { frequencyRating, punctualityRating, qualityRating, overallRating } = entity;
        let ratingColorClass = overallRating >= 4 ? 'text-success' : (overallRating >= 2.5 ? 'text-warning' : 'text-danger');
        return `<div class="col">
            <div class="card h-100 shadow-sm custom-card-hover">
                <div class="card-body p-4">
                    <div class="row g-0">
                        <div class="col-md-4 text-center d-flex flex-column justify-content-center align-items-center border-md-end pe-md-4 mb-3 mb-md-0">
                            <i class="fas fa-user-graduate fa-3x text-primary mb-3"></i>
                            <h5 class="card-title mb-1">${entity.nome}</h5>
                            <p class="text-muted small">ID: ${entity.id}</p>
                            <div class="mt-3">
                                <h4 class="fw-bold ${ratingColorClass}" style="font-size: 2.8rem; line-height: 1;">${overallRating.toFixed(1)}</h4>
                                <small class="text-muted text-uppercase" style="font-size: 0.7rem;">Média Geral</small>
                            </div>
                        </div>
                        <div class="col-md-8 d-flex flex-column justify-content-center ps-md-4">
                            <div class="d-flex justify-content-between align-items-center mb-3"><span class="text-muted">Frequência</span><div class="d-inline-block" style="min-width: 100px;">${generateStarRating(frequencyRating)}</div></div>
                            <div class="d-flex justify-content-between align-items-center mb-3"><span class="text-muted">Assiduidade</span><div class="d-inline-block" style="min-width: 100px;">${generateStarRating(punctualityRating)}</div></div>
                            <div class="d-flex justify-content-between align-items-center"><span class="text-muted">Qualidade (Sim.)</span><div class="d-inline-block" style="min-width: 100px;">${generateStarRating(qualityRating)}</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('')}</div>`;
}

export function setupAvaliacoesPage(entities) {
    const container = document.getElementById('avaliacoes-container');
    const sortSelect = document.getElementById('sortAvaliacoes');
    if (!container || !sortSelect) return;

    const ratedEntities = entities.map(entity => {
        const frequencyRating = calculateFrequencyRating(entity);
        const punctualityRating = calculatePunctualityRating(entity);
        const qualityRating = calculateWorkQualityRating(entity);
        return { ...entity, frequencyRating, punctualityRating, qualityRating, overallRating: (frequencyRating + punctualityRating + qualityRating) / 3 };
    });

    const sortAndDisplay = () => {
        const sortBy = sortSelect.value;
        const sorted = [...ratedEntities].sort((a, b) => {
            if (sortBy === 'nome-asc') return a.nome.localeCompare(b.nome);
            if (sortBy === 'nome-desc') return b.nome.localeCompare(a.nome);
            if (sortBy === 'media-desc') return b.overallRating - a.overallRating;
            if (sortBy === 'media-asc') return a.overallRating - b.overallRating;
            return 0;
        });
        popularTabelaAvaliacoes(container, sorted);
    };

    sortSelect.addEventListener('change', sortAndDisplay);
    sortAndDisplay(); // Carga inicial
}