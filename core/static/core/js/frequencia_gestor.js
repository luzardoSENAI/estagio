import { BASE_URL, ApiData } from "/static/js/api.js";
import { csrf_token, formatarDataBrasileira, capitalizarString } from "/static/js/main.js";
let tabela = []
let tipo;
let data_iso = new Date().toISOString().split('T')[0];
let hoje = new Date().toLocaleDateString('pt-BR');
let hora = new Date().toLocaleTimeString('pt-BR');

async function popularTurmaSelect() {
    const container = document.getElementById('turmaSelect')
    const dados = await ApiData('api/frequencia_gestor/')
    const turmas = dados.turmas;
    console.log(turmas)
    let turmas_string = ''
    turmas.forEach(t => {
        turmas_string += `<option value="${t.id}">${t.nome}</option>`
    });
    container.innerHTML = turmas_string
}

async function popularEstagiarioSelect() {
    let container = document.getElementById('estagiarioSelect')
    let turmaValue = document.getElementById('turmaSelect').value
    let dados = await ApiData('api/frequencia_gestor/')
    let e = dados.estagiarios;
    let estagiarios = e.filter(e => e.turmas_estagiario.includes(parseInt(turmaValue)))
    let string = '<option value="all" selected>Todos os Estagiários</option>';
    estagiarios.forEach(e => {
        string += `
        <option value="${e.uuid}">${e.nome}</option>
        `
    });
    container.innerHTML = string
}

async function CarregarDados() {
    let estagiarioValue = document.getElementById('estagiarioSelect').value
    let turmaValue = document.getElementById('turmaSelect').value
    let statusValue = document.getElementById('statusSelect').value
    let diasValue = document.getElementById('diasSelect').value
    let container = document.getElementById('tbody')
    let turmaTexto = turmaSelect.options[turmaSelect.selectedIndex].text;
    let head = document.getElementById('thead')
    let tabelaTitle = document.getElementById('tabelaTitle')

    const all = `
        
        <tr id="thead">
            <td>Estagiário <i class="bi bi-person-fill"></i></td>
            <td>Status de Hoje <i class="bi bi-clipboard-check-fill"></i></td>
            <td>Último Registro <i class="bi bi-calendar-fill"></i></td>
            <td>Ações <i class="bi bi-info-square-fill"></i></td>
        </tr>

        `

    const unique = `
            <td>Data <i class="bi bi-calendar-fill"></i></td>
            <td>Status <i class="bi bi-clipboard-check-fill"></i></td>
            <td>Hora <i class="bi bi-clock-fill"></i></td>
            <td>Ações <i class="bi bi-info-square-fill"></i></td>
        `

    let data = await fetch(BASE_URL + 'api/frequencia_gestor/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf_token
        },
        body: JSON.stringify({
            'estagiario': estagiarioValue,
            'turma': turmaValue,
            'status': statusValue,
            'dias': diasValue,
        })
    })
        .then(response => response.json())
        .then(data => {
            return data
        })

    let string = '';
    if (estagiarioValue == 'all') {

        tabelaTitle.innerHTML =`
        <h5 class="mb-0">Atividade de Geral</h5>
                <h5 class="mb-0">${hoje} - ${hora} - ${turmaTexto}</h5>
                <button id="exportarBtn" class="btn btn-outline-success"><i class="bi bi-filetype-pdf"
                style="color:white;"></i> Exportar
        PDF</button>
        `

        head.innerHTML = all

        data.dados.forEach(r => {
            string += `
        <tr>
            <td class='border'>${r.nome}</td>
            <td class='border'>${(r.status == 'presente' ? '<span class="badge text-bg-success">Presente</span>' : (r.status == 'falta' ? '<span class="badge text-bg-danger">Falta</span>' : (r.status == 'atrasado' ? '<span class="badge text-bg-warning">Atraso</span>' : '')))}</td>
            <td class='border'>${r.ultimo_registro_data == null ? '--' : r.ultimo_registro_data == data_iso ? `Hoje às ${r.ultimo_registro_hora}` : `${formatarDataBrasileira(r.ultimo_registro_data)} - ${r.ultimo_registro_hora}`}</td>
            <td class="info-cell border" data-nome="${r.nome}" data-img="${r.foto}">
                <i class="bi bi-eye"></i>
            </td>
        <tr>
        `
        });
    } else {

        tabelaTitle.innerHTML =`
        <h5 class="mb-0">Atividade de ${data.dados[0].nome}</h5>
                <h5 class="mb-0">${hoje} - ${hora} - ${turmaTexto}</h5>
                <button id="exportarBtn" class="btn btn-outline-success"><i class="bi bi-filetype-pdf"
                style="color:white;"></i> Exportar
        PDF</button>
        `

        head.innerHTML = unique

        data.dados.forEach(r => {
            string += `
        <tr>
            <td class='border'>${formatarDataBrasileira(r.data)} - ${r.dia}-Feira</td>
            <td class='border'>${(r.status == 'presente' ? '<span class="badge text-bg-success">Presente</span>' : (r.status == 'falta' ? '<span class="badge text-bg-danger">Falta</span>' : (r.status == 'atrasado' ? '<span class="badge text-bg-warning">Atraso</span>' : '')))}</td>
            <td class='border'>${(r.hora_registro == null) ? (r.ultimo_registro_data == null ? '--' : '--') : r.hora_registro}</td>
            <td class="info-cell border" data-nome="${r.nome}" data-img="${r.foto}">
                <i class="bi bi-info-circle"></i>
            </td>
        <tr>
        `
        });
    }

    container.innerHTML = string
}


document.addEventListener('DOMContentLoaded', async () => {

    await popularTurmaSelect()
    popularEstagiarioSelect()
    CarregarDados()

    document.getElementById('filterBtn').addEventListener('click', async () => {
        CarregarDados()
        popularEstagiarioSelect()
    })
})