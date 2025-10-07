export const BASE_URL = 'http://127.0.0.1:8000/'
export function ApiData(url) {
    return fetch(`${BASE_URL}${url}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            return data;
        })
        .catch(error => {
            console.error('Erro ao buscar dados:', error);
        });
}