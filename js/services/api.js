/**
 * Busca um arquivo CSV de uma URL e o converte em um array de objetos.
 * @param {string} url - A URL do arquivo CSV.
 * @param {string[]} expectedHeaders - Os cabeçalhos esperados para mapear as colunas.
 * @returns {Promise<Object[]>} - Um array de objetos, onde cada objeto representa uma linha.
 */
export async function fetchCsvAsObjects(url, expectedHeaders) {
    if (!url || url.includes('URL_DA_SUA_PLANILHA')) {
        throw new Error(`URL da planilha não fornecida para: ${expectedHeaders.join(', ')}`);
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Erro de rede ao buscar ${url}: ${response.statusText}`);
    }
    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1);

    const headerMap = {};
    for (const header of expectedHeaders) {
        const index = headers.indexOf(header);
        if (index === -1) {
            throw new Error(`Cabeçalho esperado "${header}" não encontrado no CSV de ${url}. Cabeçalhos encontrados: ${headers.join(', ')}`);
        }
        headerMap[header] = index;
    }

    return dataRows.map(rowStr => {
        const row = rowStr.split(',').map(item => item.trim().replace(/"/g, ''));
        const obj = {};
        for (const header of expectedHeaders) {
            obj[header] = row[headerMap[header]];
        }
        return obj;
    }).filter(obj => obj[expectedHeaders[0]]); // Garante que a primeira coluna (geralmente ID) não seja vazia
}


/**
 * Carrega e mescla dados de estagiários e suas frequências.
 * @param {string} estagiariosUrl - URL da planilha de estagiários.
 * @param {string} frequenciasUrl - URL da planilha de frequências.
 * @returns {Promise<Object[]>} - Um array de entidades de estagiários com seus registros de frequência aninhados.
 */
export async function loadAndMergeData(estagiariosUrl, frequenciasUrl) {
    try {
        const [estagiarios, frequencias] = await Promise.all([
            fetchCsvAsObjects(estagiariosUrl, ['id', 'nome', 'idade', 'cpf', 'data de nascimento', 'número']),
            fetchCsvAsObjects(frequenciasUrl, ['id_estagiario', 'data', 'hora'])
        ]);

        const entitiesMap = new Map();

        estagiarios.forEach(estagiario => {
            entitiesMap.set(estagiario.id, {
                ...estagiario,
                idade: parseInt(estagiario.idade, 10) || 'N/A',
                registros: []
            });
        });

        frequencias.forEach(freq => {
            const entity = entitiesMap.get(freq.id_estagiario);
            if (entity) {
                entity.registros.push({
                    data: freq.data,
                    hora: freq.hora || null
                });
            }
        });

        return Array.from(entitiesMap.values());
    } catch (error) {
        console.error("Falha ao carregar ou processar dados das planilhas:", error);
        document.getElementById('main-content').innerHTML = `<div class="alert alert-danger">Falha ao carregar dados das planilhas. Verifique o console para mais detalhes e se as URLs estão corretas.</div>`;
        return [];
    }
}