export const csrf_token = String(document.getElementById('csrf_token').value)

export function formatarDataBrasileira(dataISO) {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}
export function capitalizarString(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
