import { BASE_URL, ApiData } from "/static/js/api.js";
import { csrf_token, formatarDataBrasileira, capitalizarString, isoToBR } from "/static/js/main.js";

document.addEventListener('DOMContentLoaded', async () => {
    const dados = await ApiData('api/dispositivos')
    const container = document.getElementById('dispositivos-container')
    console.log(dados)
    dados.forEach(d => {
        container.innerHTML += `
        
        <div class="col-lg-2 col-xl-3 mb-4">
            <div class="card h-100 shadow-sm custom-card-hover" data-demanda-index="">
                <div class="card-header  border-2 border-bottom-0 d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0 text-dark">${d.instituicao}</h5>
                    ${d.status == true ? '<span class="badge text-bg-primary">Online</span>' : '<span class="badge text-bg-warning">Offline</span>'}
                    <i class="bi bi-eye-fill info-cell" data-nome="${d.instituicao}" data-id="${d.id}" data-status="${d.status}" data-ur="${d.utlimo_registro}"></i>
                </div>
            </div>
        </div>
        `
    });
    // ABRIR MODAL DISPOSITIVOS
    document.body.addEventListener("click", (e) => {
        if (e.target.closest(".info-cell")) {
            const cell = e.target.closest(".info-cell");
            const nome = cell.dataset.nome;
            let status = cell.dataset.status
            let id = cell.dataset.id
            let utlimo_registro = cell.dataset.ur
            abrirModal(`
            <h3>Gerenciar Dispositivo - ${nome}</h3>
            <table class="table table-bordered">
                <thead>
                    <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Último Registro</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                    ${status == 'true' ? '<td class="table-success">Online</td>' : '<td class="table-warning">Offline</td>'}
                    ${utlimo_registro == 'None' ? '<td class="table-warning">--</td>' : `<td>${isoToBR(utlimo_registro)}</td>`}
                    </tr>
                    <tr>
                </tbody>
            </table>
            <h7>ID: ${id}</h7>
        `);
        }
    });
})