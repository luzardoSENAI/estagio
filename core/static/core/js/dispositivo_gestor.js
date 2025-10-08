import { BASE_URL, ApiData } from "/static/js/api.js";
import { csrf_token, formatarDataBrasileira , capitalizarString , isoToBR } from "/static/js/main.js";

document.addEventListener('DOMContentLoaded', async () => {
    const dados = await ApiData('api/dispositivos')
    const container = document.getElementById('dispositivos-container')
    console.log(dados)
    dados.forEach(d => {
        container.innerHTML+=`
        
        <div class="col-lg-2 col-xl-3 mb-4">
            <div class="card h-100 shadow-sm custom-card-hover" data-demanda-index="">
                <div class="card-header  border-2 border-bottom-0 d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0 text-dark">${d.instituicao}</h5>
                    ${d.status == true ? '<span class="badge text-bg-primary">Online</span>' : '<span class="badge text-bg-warning">Offline</span>'}
                </div>
                <div class="card-body  border-2 border-bottom-0 d-flex flex-column justify-content-between align-items-start">
                    <h5>Último registro:</h5>
                    <h7>${d.utlimo_registro.includes('None') ? '--' : isoToBR(d.utlimo_registro)}</h7>
                    <h5>Último sinal:</h5>
                    <h7>${d.utlimo_ping.includes('None') ? '--' : isoToBR(d.utlimo_ping)}</h7>
                    <h5>id:</h5>
                    <h9>${d.id}</h9>
                </div>
            </div>
        </div>
        `
    });
})