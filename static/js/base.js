function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}
function abrirModal(conteudoHTML = '<p>Testando</p>') {
    const template = document.getElementById("modal-template");
    const modal = template.cloneNode(true);

    modal.style.display = "flex"; // flex para centralizar
    modal.id = "";

    modal.querySelector(".modal-body").innerHTML = conteudoHTML;

    modal.querySelector(".modal-close").addEventListener("click", () => {
        modal.remove();
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
}

