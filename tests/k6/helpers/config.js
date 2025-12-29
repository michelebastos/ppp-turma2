/**
 * Função para obter a BASE_URL a partir de variáveis de ambiente
 * @returns {string} Base URL da API
 */
export function getBaseURL() {
  return __ENV.BASE_URL || 'http://localhost:3000';
}
