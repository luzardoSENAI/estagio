import { setupFrequenciaPage } from './pages/frequencia.js';
import { setupAvaliacoesPage } from './pages/avaliacoes.js';
import { setupDemandaPage } from './pages/demanda.js';
import { setupPerfilPage } from './pages/perfil.js';
import { updateDashboard } from './pages/dashboard.js';

const mainContentArea = document.getElementById('main-content');
const navLinks = document.querySelectorAll('[data-page]');
const sidebarToggle = document.getElementById('sidebarToggle');
const wrapper = document.getElementById('wrapper');
const sidebarWrapper = document.getElementById('sidebar-wrapper');
const loader = document.getElementById('loader-wrapper');

let appData = { entities: [] };

// Mapeia nome da página para sua função de setup
const pageInitializers = {
    'home': updateDashboard,
    'frequência': setupFrequenciaPage,
    'avaliações': setupAvaliacoesPage,
    'demanda': setupDemandaPage,
    'perfil': setupPerfilPage,
};

function closeSidebarOnMobile() {
    if (window.innerWidth < 768 && wrapper.classList.contains('toggled')) {
        wrapper.classList.remove('toggled');
    }
}

async function loadPage(pageName) {
    try {
        const response = await fetch(`pages/${pageName}.html`);
        if (!response.ok) {
            throw new Error(`Erro ao carregar a página: ${response.statusText}`);
        }
        mainContentArea.innerHTML = await response.text();

        // Chama a função de inicialização específica da página
        const initializer = pageInitializers[pageName];
        if (initializer) {
            await initializer(appData.entities);
        }

        // Atualiza o título da página e o link ativo
        let pageTitle = pageName === 'home' ? 'Início' : pageName.charAt(0).toUpperCase() + pageName.slice(1);
        document.title = `EstagioS - ${pageTitle}`;
        navLinks.forEach(link => link.classList.remove('active'));
        document.querySelector(`.list-group-item[data-page="${pageName}"]`)?.classList.add('active');

    } catch (error) {
        console.error('Erro ao carregar o conteúdo da página:', error);
        mainContentArea.innerHTML = `<div class="alert alert-danger">Erro ao carregar o conteúdo. Por favor, tente novamente.</div>`;
        document.title = 'EstagioS - Erro';
    }
}

export function initializeUI(data) {
    appData.entities = data.entities;

    if (sidebarToggle && wrapper && sidebarWrapper) {
        sidebarToggle.addEventListener('click', () => wrapper.classList.toggle('toggled'));

        document.addEventListener('click', (event) => {
            const isClickInsideSidebar = sidebarWrapper.contains(event.target);
            const isClickOnToggle = sidebarToggle.contains(event.target);
            if (!isClickInsideSidebar && !isClickOnToggle) {
                closeSidebarOnMobile();
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const pageName = this.dataset.page;
            loadPage(pageName);
            closeSidebarOnMobile();
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = urlParams.get('page') || 'home';
    loadPage(initialPage).then(() => {
        if (loader) {
            loader.classList.add('loader-hidden');
        }
    });
}