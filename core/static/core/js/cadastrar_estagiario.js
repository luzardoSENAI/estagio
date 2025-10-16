import { BASE_URL, ApiData } from "/static/js/api.js";
import { csrf_token, formatarDataBrasileira, capitalizarString, isoToBR } from "/static/js/main.js";

const tabelas_container = document.getElementById('tabelas-container')

function filtrarPorTurma(e, turma_id) {
    return e.filter(e => e.turmas_estagiario.includes(parseInt(turma_id)));
}

async function popularTabelas() {
    const dados = await ApiData('api/frequencia_gestor/')
    const turmas = dados.turmas;
    const estagiarios = dados.estagiarios;

    let tabelasString = '';
    turmas.forEach(t => {
        tabelasString += `
        <div class="card border mb-4">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
                <div id="tabelaTitle" class="d-flex justify-content-between align-items-center w-100">
                    <h5 class="">${t.nome}</h5><button class="btn btn-outline-success adicionar-estagiario" data-id='${t.id}'>
                        <i class="bi bi-person-fill-add" style="color: white;" ></i> Adicionar Estagiário</button>
                </div>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr>
                                <td>Estagiário <i class="bi bi-person-fill"></i></td>
                                <td>Email <i class="bi bi-envelope-at-fill"></i></td>
                                <td>Contato <i class="bi bi-telephone-fill"></i></td>
                                <td>Matrícula <i class="bi bi-layout-sidebar"></i></td>
                                <td>Ações <i class="bi bi-info-circle"></i></td>
                            </tr>
                        </thead>
                        ${filtrarPorTurma(estagiarios, t.id).map(e => {
                            return `
                                            <tbody>
                                <tr>
                                    <td class="border">${e.nome}</td>
                                    <td class="border">${e.email}</td>
                                    <td class="border">${e.telefone}</td>
                                    <td class="border">${e.matricula}</td>
                                    <td class="info-cell border">
                                        <i class="bi bi-pen"></i>
                                    </td>
                                </tr>
                            </tbody>
                                            `
                        }).join('')}
                    </table>
                </div>
            </div>
        </div>

        `
    });
    tabelas_container.innerHTML = tabelasString;
}

document.addEventListener('DOMContentLoaded', async () => {
    const dados = await ApiData('api/frequencia_gestor/')
    const turmas = dados.turmas;
    const estagiarios = dados.estagiarios;
    console.log(dados)

    popularTabelas()
})