/**
 * Retorna o registro mais recente de uma entidade.
 * @param {Object} entity - A entidade do estagiário.
 * @returns {Object|null} - O registro mais recente ou null se não houver registros.
 */
export function getLatestRecord(entity) {
    if (!entity.registros || entity.registros.length === 0) {
        return null;
    }
    // Ordena os registros pela data em ordem decrescente e pega o primeiro.
    return [...entity.registros].sort((a, b) => new Date(b.data) - new Date(a.data))[0];
}

/**
 * Calcula o status (Presente, Atraso, Faltou) com base em um registro.
 * @param {Object} record - O registro de frequência.
 * @returns {string} - O status.
 */
export function getStatusFromRecord(record) {
    if (!record || record.hora === null || record.hora === '-') {
        return 'Faltou';
    }
    const limitHour = 8;
    const limitMinute = 15;
    const [regHour, regMinute] = record.hora.split(':').map(Number);

    if (regHour > limitHour || (regHour === limitHour && regMinute > limitMinute)) {
        return 'Atraso';
    }
    return 'Presente';
}