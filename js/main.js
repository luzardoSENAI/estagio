import { ESTAGIARIOS_SHEET_URL, FREQUENCIAS_SHEET_URL } from './config.js';
import { loadAndMergeData } from './services/api.js';
import { initializeUI } from './ui/dom.js';
import { initializeDetailsModal } from './ui/components/modal.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('loader-wrapper');

    const entities = await loadAndMergeData(ESTAGIARIOS_SHEET_URL, FREQUENCIAS_SHEET_URL);

    if (!entities || entities.length === 0) {
        console.warn("Nenhuma entidade carregada. A aplicação pode não funcionar.");
        if (loader) loader.classList.add('loader-hidden');
        return;
    }

    // Inicializa a UI principal, passando os dados carregados
    initializeUI({ entities });

    // Inicializa os listeners para o modal de detalhes
    const mainContentArea = document.getElementById('main-content');
    initializeDetailsModal(mainContentArea, entities);
});