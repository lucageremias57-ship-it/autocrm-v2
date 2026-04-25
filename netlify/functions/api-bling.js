const axios = require('axios');

function somarDiasUteis(dataInicial, dias) {
  let data = new Date(dataInicial);
  let count = 0;
  while (count < dias) {
    data.setDate(data.getDate() + 1);
    let diaSemana = data.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) count++;
  }
  return data;
}

exports.handler = async (event) => {
  try {
    const { access_token } = JSON.parse(event.body || '{}');
    if (!access_token) return { statusCode: 400, body: JSON.stringify({ error: 'Faltam credenciais' }) };

    // Buscamos os últimos 100 pedidos para ter margem de manobra
    const res = await axios.get('https://www.bling.com.br/Api/v3/pedidos/vendas', {
      headers: { 'Authorization': `Bearer ${access_token}` },
      params: { pagina: 1, limite: 100, dataInicial: new Date(new Date().setDate(new Date().getDate() - 45)).toISOString().split('T')[0] }
    });

    const vendas = res.data.data || [];
    const hoje = new Date();
    const hojeMesDia = hoje.toLocaleDateString('pt-BR').slice(0, 5); // "23/04"

    const pedidos = vendas.filter(v => v.situacao.id === 6).map(v => {
      try {
        const dataVenda = new Date(v.data);
        const previsao = somarDiasUteis(dataVenda, 10);
        // Ciclos de contato: 2, 4, 7 e 9 dias úteis
        const ciclos = [2, 4, 7, 9].map(d => somarDiasUteis(dataVenda, d));
        const proxima = ciclos.find(d => d > hoje) || previsao;
        const contagem = ciclos.filter(d => d <= hoje).length + 1;

        return {
          id: v.id,
          numero: v.numero,
          nome: v.contato.nome,
          celular: v.contato.celular,
          previsao: previsao.toISOString(),
          proxima: proxima.toISOString(),
          contatoAtual: contagem > 5 ? 5 : contagem
        };
      } catch (e) { return null; }
    }).filter(v => v !== null);

    const feedbacks = vendas.filter(v => {
      const diff = Math.floor((hoje - new Date(v.data)) / 86400000);
      return v.situacao.id === 11 && diff >= 30;
    });

    // Filtro de aniversariantes corrigido
    const aniversarios = vendas.filter(v => {
      const niver = v.contato.dataNascimento;
      return niver && niver.includes(hojeMesDia);
    });

    return { 
      statusCode: 200, 
      body: JSON.stringify({ pedidos, feedbacks, aniversarios }) 
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};