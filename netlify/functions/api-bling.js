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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = JSON.parse(event.body || '{}');
    
    // CASO 1: TROCA DE CÓDIGO POR TOKEN
    if (body.code) {
      const authHeader = Buffer.from(`${body.client_id}:${body.client_secret}`).toString('base64');
      const res = await axios.post('https://www.bling.com.br/Api/v3/oauth/token', 
        `grant_type=authorization_code&code=${body.code}`, 
        { headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return { statusCode: 200, headers, body: JSON.stringify(res.data) };
    }

    // CASO 2: BUSCA DE DADOS (FLUXO, NIVER, FEEDBACK)
    if (body.access_token) {
      const auth = { headers: { 'Authorization': `Bearer ${body.access_token}` } };
      const resVendas = await axios.get('https://www.bling.com.br/Api/v3/pedidos/vendas?pagina=1&limite=100', auth);
      const vendas = resVendas.data.data || [];
      
      const hoje = new Date();
      const hojeStr = hoje.toISOString().slice(5, 10); // "04-25"

      // FLUXO DE ENVIOS (10 DIAS ÚTEIS)
      const pedidos = vendas.filter(v => [6, 9].includes(v.situacao.id)).map(v => {
        const dataVenda = new Date(v.data);
        const previsao = somarDiasUteis(dataVenda, 10);
        const ciclos = [2, 4, 7, 9].map(d => somarDiasUteis(dataVenda, d));
        const proxima = ciclos.find(d => d > hoje) || previsao;
        const contato = ciclos.filter(d => d <= hoje).length + 1;

        return {
          id: v.id, numero: v.numero, nome: v.contato.nome,
          celular: v.contato.celular || '',
          previsao: previsao.toISOString(),
          proxima: proxima.toISOString(),
          contatoAtual: contato > 5 ? 5 : contato
        };
      });

      // ANIVERSARIANTES (Filtro Inteligente V3)
      const aniversarios = vendas.filter(v => {
        const niver = v.contato.dataNascimento; // Formato YYYY-MM-DD
        return niver && niver.slice(5, 10) === hojeStr;
      }).map(v => ({ id: v.id, nome: v.contato.nome, celular: v.contato.celular || '' }));

      // FEEDBACK (Pedidos Atendidos há 30 dias)
      const feedbacks = vendas.filter(v => {
        const diff = Math.floor((hoje - new Date(v.data)) / 86400000);
        return v.situacao.id === 11 && diff >= 30 && diff <= 45;
      }).map(v => ({ id: v.id, nome: v.contato.nome, celular: v.contato.celular || '', numero: v.numero }));

      return { statusCode: 200, headers, body: JSON.stringify({ pedidos, aniversarios, feedbacks }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltam parametros' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};