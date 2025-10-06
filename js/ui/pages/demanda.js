import { fetchCsvAsObjects } from '../../services/api.js';
import { DEMANDAS_SHEET_URL, APPS_SCRIPT_DEMANDAS_URL } from '../../config.js';

let allDemandas = [];

function popularDemandas(demandas) {
    const container = document.getElementById('demandas-container');
    if (!container) return;
    if (!demandas || demandas.length === 0) {
        container.innerHTML = '<div class="alert alert-secondary w-100">Nenhuma demanda encontrada.</div>'; return;
    }
    const statusStyles = {
        'Pendente': { header: 'bg-warning bg-opacity-10 border-warning', badge: 'bg-warning text-dark' },
        'Concluída': { header: 'bg-success bg-opacity-10 border-success', badge: 'bg-success' },
        'Em Andamento': { header: 'bg-primary bg-opacity-10 border-primary', badge: 'bg-primary' }
    };
    container.innerHTML = demandas.map((demanda, index) => {
        const style = statusStyles[demanda.status] || statusStyles['Pendente'];
        return `<div class="col-lg-6 col-xl-4 mb-4">
            <div class="card h-100 shadow-sm custom-card-hover" data-demanda-index="${index}">
                <div class="card-header ${style.header} border-2 border-bottom-0 d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0 text-dark">${demanda.titulo}</h5><span class="badge ${style.badge}">${demanda.status}</span>
                </div>
                <div class="card-body">
                    <p class="card-text text-muted">${demanda.descriçao}</p>
                    <ul class="list-unstyled text-muted small mt-3">
                        <li class="mb-2"><i class="fas fa-calendar-alt me-2 text-primary"></i><strong>Entrega:</strong> ${demanda.entrega}</li>
                        <li class="mb-2"><i class="fas fa-user-tie me-2 text-primary"></i><strong>Responsável:</strong> ${demanda.responsavel}</li>
                        <li><i class="fas fa-building me-2 text-primary"></i><strong>Empresa:</strong> ${demanda.empresa}</li>
                    </ul>
                </div>
                <div class="card-footer bg-white border-top-0 d-flex justify-content-end gap-2">
                    <a href="#" class="btn btn-outline-primary btn-sm">Ver Detalhes</a>
                    <button class="btn btn-outline-danger btn-sm btn-apagar-demanda">Apagar</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function setupNewDemandModal() {
    const btnSalvarDemanda = document.getElementById('btnSalvarDemanda');
    if (!btnSalvarDemanda) return;

    btnSalvarDemanda.addEventListener('click', async () => {
        const form = document.getElementById('formNovaDemanda');
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('novaDemandaModal'));

        const titulo = document.getElementById('demandaTitulo').value;
        const descricao = document.getElementById('demandaDescricao').value;
        let entrega = document.getElementById('demandaEntrega').value;
        const responsavel = document.getElementById('demandaResponsavel').value;
        const empresa = document.getElementById('demandaEmpresa').value;
        const status = document.getElementById('demandaStatus').value;

        if (!titulo || !descricao || !entrega || !responsavel || !empresa) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Formata a data para DD/MM/YYYY
        const [year, month, day] = entrega.split('-');
        entrega = `${day}/${month}/${year}`;

        const novaDemanda = { titulo, 'descriçao': descricao, entrega, responsavel, empresa, status };

        // Feedback visual para o usuário
        btnSalvarDemanda.disabled = true;
        btnSalvarDemanda.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...`;

        try {
            const response = await fetch(APPS_SCRIPT_DEMANDAS_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    // Apps Script espera text/plain para e.postData.contents
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(novaDemanda)
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || 'Ocorreu um erro no servidor.');
            }

            // A UI só é atualizada se a requisição for bem-sucedida.
            allDemandas.unshift(novaDemanda);
            popularDemandas(allDemandas);
            modalInstance?.hide();
            form.reset();

        } catch (error) {
            console.error('Erro ao salvar a demanda:', error);
            alert('Ocorreu um erro ao salvar a demanda. Verifique o console para mais detalhes.');
        } finally {
            // Restaura o estado original do botão
            btnSalvarDemanda.disabled = false;
            btnSalvarDemanda.innerHTML = 'Salvar Demanda';
        }
    });
}

/**
 * Exibe um modal de confirmação e executa uma ação se o usuário confirmar.
 * @param {string} title - O título do modal.
 * @param {string} body - A mensagem no corpo do modal.
 * @param {function} onConfirm - A função a ser executada ao confirmar.
 */
function showConfirmationModal(title, body, onConfirm) {
    const modalElement = document.getElementById('confirmationModal');
    if (!modalElement) return;

    const modalTitle = modalElement.querySelector('#confirmationModalLabel');
    const modalBody = modalElement.querySelector('#confirmationModalBody');
    const confirmBtn = modalElement.querySelector('#confirmActionBtn');

    modalTitle.textContent = title;
    modalBody.textContent = body;

    const modal = new bootstrap.Modal(modalElement);
    confirmBtn.onclick = () => { onConfirm(); modal.hide(); };
    modal.show();
}

function setupDeleteDemandHandler(container) {
    container.addEventListener('click', async (event) => {
        if (!event.target.classList.contains('btn-apagar-demanda')) {
            return;
        }

        const card = event.target.closest('.card');
        const demandaIndex = card.dataset.demandaIndex;
        if (demandaIndex === undefined) return;

        const demandaParaApagar = allDemandas[demandaIndex];
        if (!demandaParaApagar) return;

        // Usa o novo modal de confirmação
        showConfirmationModal(
            'Apagar Demanda',
            `Tem certeza que deseja apagar a demanda "${demandaParaApagar.titulo}"? Esta ação não pode ser desfeita.`,
            async () => { // Esta função só será executada se o usuário clicar em "Confirmar"
                const deleteButton = event.target;
                deleteButton.disabled = true;
                deleteButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;

                try {
                    const payload = {
                        action: 'delete',
                        demanda: {
                            titulo: demandaParaApagar.titulo,
                            descriçao: demandaParaApagar.descriçao,
                            entrega: demandaParaApagar.entrega
                        }
                    };

                    const response = await fetch(APPS_SCRIPT_DEMANDAS_URL, {
                        method: 'POST',
                        redirect: 'follow',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errorResult = await response.json();
                        throw new Error(errorResult.message || 'Ocorreu um erro no servidor ao apagar.');
                    }

                    // Remove o item do array e atualiza a UI apenas em caso de sucesso.
                    allDemandas.splice(demandaIndex, 1);
                    popularDemandas(allDemandas);

                } catch (error) {
                    console.error('Erro ao apagar a demanda:', error);
                    // Aqui você poderia usar outro modal para exibir o erro de forma elegante
                    alert(`Ocorreu um erro ao apagar a demanda: ${error.message}`);
                    // Restaura o botão para que o usuário possa tentar novamente se for um erro temporário.
                    deleteButton.disabled = false;
                    deleteButton.innerHTML = 'Apagar';
                }
            }
        );
    });
}

export async function setupDemandaPage() {
    const container = document.getElementById('demandas-container');
    if (!container) return;
    try {
        allDemandas = await fetchCsvAsObjects(DEMANDAS_SHEET_URL, ['titulo', 'descriçao', 'entrega', 'responsavel', 'empresa', 'status']);
        popularDemandas(allDemandas);
        setupNewDemandModal();
        setupDeleteDemandHandler(container);
    } catch (error) {
        console.error("Falha ao carregar demandas:", error);
        container.innerHTML = `<div class="alert alert-danger w-100">Não foi possível carregar as demandas.</div>`;
    }
}