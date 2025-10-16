import { BASE_URL, ApiData } from "/static/js/api.js";
import { csrf_token, formatarDataBrasileira , capitalizarString } from "/static/js/main.js";

let tabela = []
let tipo;

function popularTurmaSelect(turmas) {
    const container = document.getElementById('turmaSelect')
    turmas.forEach(t => {
        container.innerHTML += `<option value="${t.id}">${t.nome}</option>`
    });
}
function popularEstagiarioSelect(turma_id, estagiarios) {
    const container = document.getElementById('estagiarioSelect')
    const estagiarios_turma = estagiarios.filter(e => e.turmas_estagiario.includes(parseInt(turma_id)));
    container.innerHTML = '<option value="all" selected>Todos os Estagiários</option>'
    estagiarios_turma.forEach(e => {
        container.innerHTML += `
        <option value="${e.uuid}">${e.nome}</option>
        `
    })
}

function salvarTabela(array) {
    tabela = []
    tabela.push(array)
    console.log(tabela)
}

function atualizarStatusEstagiario(array){
    let status = array[0]
    const container = document.getElementById('statusEstagiario')


    container.innerHTML=`<div class="card h-100 shadow-sm p-3" id="summary-card-status-bg"
            style="${status.status == 'presença' ? 'background-color: #e6ffe6; border-left: 5px solid var(--primary-green);' : 'background-color: #ffe6e6ff; border-left: 5px solid #6e0202ff;'}">
            <div class="d-flex align-items-center">
                <i class="fas fa-circle me-2 text-success" id="summary-card-status-icon"></i>
                <div>
                    <h6 class="mb-0 text-muted">Status do Estagiário</h6>
                    <h5 class="mb-0 fw-bold fs-5" id="summary-card-status-text">${capitalizarString(status.status)}</h5>
                    <small class="text-muted" id="summary-card-last-entry"><strong class="d-block">${status.nome}</strong>${status.ultimo_registro_data==null ? 'Último registro: --' : `Último registro: ${formatarDataBrasileira(status.ultimo_registro_data)} - ${status.ultimo_registro_hora}`}</small>
                </div>
            </div>
        </div>`
}

function carregarDados(estagiarios, estagiario = 'all', dias = 'all', status = 'all', turma) {
    if (!Array.isArray(estagiarios) || !turma) return [];

    const hoje = new Date().toLocaleDateString("sv-SE");
    // const hoje = '2025-10-07'

    const filtrarPorTurma = registros => registros.filter(r => String(r.turma_id) === String(turma));

    const gerarIntervaloDatas = (dias) => {
        const datas = [];
        const hojeDate = new Date();
        const quantidade = parseInt(dias, 10);
        for (let i = quantidade - 1; i >= 0; i--) {
            const novaData = new Date(hojeDate);
            novaData.setDate(hojeDate.getDate() - i);
            datas.push(novaData.toLocaleDateString("sv-SE").split("T")[0]);
        }
        return datas;
    };

    const montarRegistro = (uuid, foto, nome, data, status, hora_registro = null, ultimo_registro_data = null, ultimo_registro_hora = null) => ({
        uuid,
        foto,
        nome,
        data,
        status,
        hora_registro,
        ultimo_registro_data,
        ultimo_registro_hora
    });

    // CASO: Resumo de todos os estagiários
    if (estagiario === "all") {
        const estagiariosDaTurma = estagiarios.filter(est =>
            est.turmas_estagiario && Array.isArray(est.turmas_estagiario) &&
            est.turmas_estagiario.some(id => String(id) === String(turma))
        );

        // 1. Mapeia todos os estagiários da turma para descobrir o status de hoje de cada um.
        const resultadosComStatus = estagiariosDaTurma.map(est => {
            const registrosTurma = filtrarPorTurma(est.registros);

            const registrosHoje = registrosTurma
                .filter(r => r.data === hoje)
                .sort((a, b) => new Date(`1970-01-01T${b.hora_registro}`) - new Date(`1970-01-01T${a.hora_registro}`));

            const ultimoRegistroHoje = registrosHoje[0] || null;
            const statusHoje = ultimoRegistroHoje ? ultimoRegistroHoje.status : "falta";
            const horaRegistro = ultimoRegistroHoje ? ultimoRegistroHoje.hora_registro : null;

            const ultimoRegistro = [...registrosTurma]
                .sort((a, b) => new Date(`${b.data}T${b.hora_registro}`) - new Date(`${a.data}T${a.hora_registro}`))[0];

            const ultimoRegistroData = ultimoRegistro ? ultimoRegistro.data : null;
            const ultimoRegistroHora = ultimoRegistro ? ultimoRegistro.hora_registro : null;

            // Retorna o objeto completo com o status calculado
            return montarRegistro(
                est.uuid,
                est.foto,
                est.nome,
                hoje,
                statusHoje,
                horaRegistro,
                ultimoRegistroData !== hoje ? ultimoRegistroData : null,
                ultimoRegistroData !== hoje ? ultimoRegistroHora : null
            );
        });

        // 2. Aplica o filtro de status SOBRE o resultado já calculado.
        if (status === 'all') {
            // Se o filtro for 'all', retorna todos os resultados.
            return resultadosComStatus;
        } else {
            // Se um status específico for solicitado, filtra a lista.
            // Retorna apenas os estagiários cujo status de hoje corresponde ao filtro.
            return resultadosComStatus.filter(res => res.status.toLowerCase() === status.toLowerCase());
        }
    }

    // CASO: Histórico de um estagiário específico (lógica inalterada, já filtra por status corretamente)
    const estSelecionado = estagiarios.find(e => String(e.uuid) === String(estagiario));
    if (!estSelecionado) return [];

    const registrosFiltrados = filtrarPorTurma(estSelecionado.registros);

    const ultimoRegistroGeral = [...registrosFiltrados]
        .sort((a, b) => new Date(`${b.data}T${b.hora_registro}`) - new Date(`${a.data}T${a.hora_registro}`))[0];

    const ultimoRegistroData = ultimoRegistroGeral ? ultimoRegistroGeral.data : null;
    const ultimoRegistroHora = ultimoRegistroGeral ? ultimoRegistroGeral.hora_registro : null;

    const intervalo = dias === "all"
        ? gerarIntervaloDatas(15)
        : gerarIntervaloDatas(dias);

    const resultado = intervalo.map(data => {
        const registrosDoDia = registrosFiltrados
            .filter(r => r.data === data)
            .sort((a, b) => new Date(`1970-01-01T${b.hora_registro}`) - new Date(`1970-01-01T${a.hora_registro}`));

        const registroDoDia = registrosDoDia[0] || null;
        const statusDia = registroDoDia ? registroDoDia.status : "falta";
        const horaRegistro = registroDoDia ? registroDoDia.hora_registro : null;

        if (status !== "all" && statusDia.toLowerCase() !== status.toLowerCase()) {
            return null;
        }

        return montarRegistro(
            estSelecionado.uuid,
            estSelecionado.foto,
            estSelecionado.nome,
            data,
            statusDia,
            horaRegistro,
            registroDoDia ? null : ultimoRegistroData,
            registroDoDia ? null : ultimoRegistroHora
        );
    });
    return resultado.filter(r => r !== null).reverse();
}

function atualizarTabela(array) {
    const tabelaHead = document.getElementById('thead')
    const tabelaBody = document.getElementById('tbody')
    const estagiarioValue = document.getElementById('estagiarioSelect').value
    const tabelaTitle = document.getElementById('tabelaTitle')
    const turma = document.getElementById('turmaSelect').options[document.getElementById('turmaSelect').selectedIndex].textContent;
    const hoje = new Date().toLocaleDateString("sv-SE");
    const hora = new Date().toTimeString().split(" ")[0]; // HH:MM:SS
    tabelaBody.innerHTML = ''
    tabelaHead.innerHTML = ''
    if (estagiarioValue == 'all') {
        tabelaTitle.innerHTML = `<h5 class='mb-0'>Atividade Geral</h5><h5 class='mb-0'>${formatarDataBrasileira(hoje)} - ${hora} - ${turma}</h5><button id="exportarBtn" class="btn btn-outline-success"><i class="bi bi-filetype-pdf" style='color:white;'></i> Exportar PDF</button> `
        tabelaHead.innerHTML = `
            <td>Estagiário <i class="bi bi-person-fill"></i></td>
            <td>Status de Hoje <i class="bi bi-clipboard-check-fill"></i></td>
            <td>Último Registro <i class="bi bi-calendar-fill"></i></td>
            <td>Ações <i class="bi bi-info-square-fill"></i></td>
        `
        array.forEach(r => {
            tabelaBody.innerHTML += `
        <tr>
            <td class='border'>${r.nome}</td>
            <td class='border'>${(r.status == 'presente' ? '<span class="badge text-bg-success">Presente</span>' : (r.status == 'falta' ? '<span class="badge text-bg-danger">Falta</span>' : (r.status == 'atrasado' ? '<span class="badge text-bg-warning">Atraso</span>' : '')))}</td>
            <td class='border'>${(r.hora_registro == null) ? (r.ultimo_registro_data == null ? '--' : `${formatarDataBrasileira(r.ultimo_registro_data)} às ${r.ultimo_registro_hora}`) : `Hoje - ${r.hora_registro}`}</td>
            <td class="info-cell border" data-nome="${r.nome}" data-img="${r.foto}">
                <i class="bi bi-eye"></i>
            </td>
        <tr>
        `
        })
    } else {
        tabelaTitle.innerHTML = `<h5 class='mb-0'>Atividade de ${array[0].nome}</h5>  <h5 class='mb-0'>${formatarDataBrasileira(hoje)} - ${hora} - ${turma}</h5> <button id="exportarBtn" class="btn btn-outline-success"><i class="bi bi-filetype-pdf" style='color:white;'></i> Exportar PDF</button>`
        tabelaHead.innerHTML = `
            <td>Data <i class="bi bi-calendar-fill"></i></td>
            <td>Status <i class="bi bi-clipboard-check-fill"></i></td>
            <td>Hora <i class="bi bi-clock-fill"></i></td>
            <td>Ações <i class="bi bi-info-square-fill"></i></td>
        `
        array.forEach(r => {
            tabelaBody.innerHTML += `
        <tr>
            <td class='border'>${formatarDataBrasileira(r.data)}</td>
            <td class='border'>${(r.status == 'presente' ? '<span class="badge text-bg-success">Presente</span>' : (r.status == 'falta' ? '<span class="badge text-bg-danger">Falta</span>' : (r.status == 'atrasado' ? '<span class="badge text-bg-warning">Atraso</span>' : '')))}</td>
            <td class='border'>${(r.hora_registro == null) ? (r.ultimo_registro_data == null ? '--' : '--') : r.hora_registro}</td>
            <td class="info-cell border" data-nome="${r.nome}" data-img="${r.foto}">
                <i class="bi bi-info-circle"></i>
            </td>
        <tr>
        `
        })
    }

}


document.addEventListener('DOMContentLoaded', async () => {
    const dados = await ApiData('api/frequencia_gestor/');
    const turmas = dados.turmas;
    const estagiarios = dados.estagiarios;
    const turmaSelect = document.getElementById('turmaSelect')
    tipo = document.getElementById('estagiarioSelect').value

    popularTurmaSelect(turmas);
    popularEstagiarioSelect(document.getElementById('turmaSelect').value, estagiarios)
    atualizarTabela(carregarDados(estagiarios, document.getElementById('estagiarioSelect').value, document.getElementById('diasSelect').value, document.getElementById('statusSelect').value, document.getElementById('turmaSelect').value))
    salvarTabela(carregarDados(estagiarios, document.getElementById('estagiarioSelect').value, document.getElementById('diasSelect').value, document.getElementById('statusSelect').value, document.getElementById('turmaSelect').value))
    atualizarStatusEstagiario(carregarDados(estagiarios, document.getElementById('estagiarioSelect').value, document.getElementById('diasSelect').value, document.getElementById('statusSelect').value, document.getElementById('turmaSelect').value))

    document.getElementById('turmaSelect').addEventListener('change', () => {
        popularEstagiarioSelect(document.getElementById('turmaSelect').value, estagiarios)
    })

    document.getElementById('filterBtn').addEventListener('click', () => {
        tipo = document.getElementById('estagiarioSelect').value
        const array = carregarDados(estagiarios, document.getElementById('estagiarioSelect').value, document.getElementById('diasSelect').value, document.getElementById('statusSelect').value, document.getElementById('turmaSelect').value)
        atualizarTabela(array)
        popularEstagiarioSelect(document.getElementById('turmaSelect').value, estagiarios)
        salvarTabela(array)
        atualizarStatusEstagiario(array)
    })

    // ABRIR MODAL INFOS
    document.body.addEventListener("click", (e) => {
        if (e.target.closest(".info-cell")) {
            const cell = e.target.closest(".info-cell");
            const nome = cell.dataset.nome;
            const img = cell.dataset.img;

            abrirModal(`
            <div class='text-center'>
                <div class="profile-pic-container mb-3">
                    <img class="profile-pic" src="${img}" alt="Foto de Perfil">
                </div>
                <h5>Informações sobre</h5>
                <h3>${nome}</h3>
            </div>
            
        `);
        }
    });


    // EXPORTAR
    document.body.addEventListener("click", (event) => {
        if (event.target.id === "exportarBtn") {
            let unico = tipo != 'all'
            let data;
            const turma = document.getElementById('turmaSelect').options[document.getElementById('turmaSelect').selectedIndex].textContent;
            const hoje = new Date().toLocaleDateString("sv-SE");
            const hora = new Date().toTimeString().split(" ")[0];
            if (unico == false) {
                data = {
                    unico: unico,
                    data: hoje,
                    hora: hora,
                    turma: turma,
                    dados: tabela
                }
            } else if (unico == true) {
                data = {
                    unico: unico,
                    data: hoje,
                    hora: hora,
                    turma: turma,
                    nome: tabela[0][0].nome,
                    dados: tabela
                }
            }
            console.log(JSON.stringify(data))
            fetch("http://127.0.0.1:8000/api/exportar_pdf/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'X-CSRFToken': csrf_token
                },
                body: JSON.stringify(data),
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Erro ao gerar PDF");
                    }
                    return response.blob(); // caso o endpoint retorne o PDF
                })
                .then((blob) => {
                    // cria um link para baixar o PDF
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "relatorio.pdf";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                })
            // .catch((error) => console.error("Erro:", error));
        }
    });
});
