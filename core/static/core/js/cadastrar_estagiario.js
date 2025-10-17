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


let turmaIdAtual = null;
let cpfSalvo = '';

function abrirModal(conteudoHTML, footerHTML) {
    const template = document.getElementById('modal-template');
    const modal = template.cloneNode(true);
    modal.id = ''; // remove ID do clone
    modal.style.display = 'flex'; // mostra o modal

    modal.querySelector('.custom-modal-body').innerHTML = conteudoHTML;
    modal.querySelector('.custom-modal-footer').innerHTML = footerHTML;

    // Fechar clicando no X
    modal.querySelector('.custom-modal-close').addEventListener('click', () => modal.remove());

    // Fechar clicando fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
    return modal;
}

// Exemplo de fluxo de CPF
document.addEventListener('click', async (e) => {
    const botao = e.target.closest('.adicionar-estagiario');
    if (!botao) return;

    turmaIdAtual = botao.dataset.id;

    // Passo 1: pedir CPF
    const conteudo1 = `
    <label>Digite o CPF:</label>
    <br>
    <input type="text" class='form-control my-3' id="inputCPFCheck" placeholder="000.000.000-00">
    <div id="cpfError" style="color:red; display:none;">Por favor, insira um CPF.</div>
  `;
    const footer1 = `<button id="btnProsseguir1" class='btn primary'>Prosseguir</button>`;

    const modal = abrirModal(conteudo1, footer1);

    modal.querySelector('#btnProsseguir1').addEventListener('click', async () => {
        const cpf = modal.querySelector('#inputCPFCheck').value.trim().replace(/[.-]/g, '');
        if (!cpf) {
            modal.querySelector('#cpfError').style.display = 'block';
            return;
        }

        cpfSalvo = cpf
        modal.remove(); // fecha etapa 1

        // Chamada API
        const response = await fetch(`/api/get_cpf/${String(cpf)}/${turmaIdAtual}`);
        const data = await response.json();

        if (data.status === true) {
            // Etapa 2: usuário existente
            const conteudo2 = `<p>Usuário (${data.nome}) já cadastrado. Deseja atribuí-lo à turma?</p>`;
            const footer2 = `<button id="btnAtribuir" class='btn primary'>Sim</button>`;
            const modal2 = abrirModal(conteudo2, footer2);

            modal2.querySelector('#btnAtribuir').addEventListener('click', async () => {
                await fetch(`/api/atribuir_estagiario/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cpf: cpfSalvo, turma_id: turmaIdAtual })
                });
                alert('Estagiário atribuído com sucesso!');
                modal2.remove();
            });

        } else if (data.status === false) {
            // Etapa 3: cadastro novo
            const conteudo3 = `
            <form id="formCadastroEstagiario">
                <div class="mb-3">
                    <label for="inputNome" class="form-label">Nome</label>
                    <input type="text" class="form-control" id="inputNome" placeholder="Digite seu nome" required>
                </div>
                <div class="mb-3">
                    <label for="inputEmail" class="form-label">E-mail</label>
                    <input type="email" class="form-control" id="inputEmail" placeholder="exemplo@dominio.com" required>
                </div>
                <div class="mb-3">
                    <label for="inputSenha" class="form-label">Senha</label>
                    <input type="password" class="form-control" id="inputSenha" placeholder="Digite sua senha" required>
                </div>
                <div class="mb-3">
                    <label for="inputCPF" class="form-label">CPF</label>
                    <input type="text" class="form-control" id="inputCPF" placeholder="000.000.000-00" value='${cpfSalvo}' required>
                </div>
                <div class="mb-3">
                    <label for="inputNascimento" class="form-label">Data de Nascimento</label>
                    <input type="date" class="form-control" id="inputNascimento" required>
                </div>
                <div class="mb-3">
                    <label for="inputEndereco" class="form-label">Endereço</label>
                    <input type="text" class="form-control" id="inputEndereco" placeholder="Rua, número, bairro">
                </div>
                <div class="mb-3">
                    <label for="inputTelefone" class="form-label">Telefone</label>
                    <input type="tel" class="form-control" id="inputTelefone" placeholder="(00) 00000-0000">
                </div>
            </form>
        `;
            const footer3 = `<button id="btnCadastrar" class="btn primary">Cadastrar</button>`;
            const modal3 = abrirModal(conteudo3, footer3);

            modal3.querySelector('#btnCadastrar').addEventListener('click', async () => {
                const dados = {
                    nome: modal3.querySelector('#inputNome').value,
                    cpf: modal3.querySelector('#inputCPF').value,
                    email: modal3.querySelector('#inputEmail').value,
                    nascimento: modal3.querySelector('#inputNascimento').value,
                    turma_id: turmaIdAtual
                };
                await fetch(`/api/estagiarios/cadastrar/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });
                alert('Novo estagiário cadastrado com sucesso!');
                modal3.remove();
            });

        } else {
            // Novo caso: status diferente de true ou false
            const conteudoErro = `<p>${data.status}</p>`;
            const footerErro = `<button class="btn btn-secondary" id="btnFecharErro">Fechar</button>`;
            const modalErro = abrirModal(conteudoErro, footerErro);

            modalErro.querySelector('#btnFecharErro').addEventListener('click', () => {
                modalErro.remove();
            });
        }
    });
});