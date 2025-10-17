import { BASE_URL, ApiData } from "/static/js/api.js";
import { csrf_token, formatarDataBrasileira, capitalizarString, isoToBR } from "/static/js/main.js";

document.addEventListener('DOMContentLoaded', async () => {
    const dados = await ApiData('api/dispositivos')
    const container = document.getElementById('dispositivos-container')
    console.log(dados)
    dados.forEach(d => {
        container.innerHTML += `
        
        <div class="col-12 col-sm-12 col-lg-6">
            <div class="card h-100 shadow-sm custom-card-hover" data-demanda-index="">
                <div class="card-header  border-2 border-bottom-0 d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0 text-dark">${d.instituicao}</h5>
                    ${d.status == true ? '<span class="badge text-bg-primary">Online</span>' : '<span class="badge text-bg-warning">Offline</span>'}
                </div>
                <div class="card-body p-0">

                </div>
            </div>
        </div>
        `
    });
})