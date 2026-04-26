const axios = require('axios');

function somarDiasUteis(dataInicial, dias) {
  let data = new Date(dataInicial);
  let count = 0;
  while (count < dias) {
    data.setDate(data.getDate() + 1);
    if (data.getDay() !== 0 && data.getDay() !== 6) count++;
  }
  return data;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    const body = JSON.parse(event.body || '{}');
    if (body.code) {
      const auth = Buffer.from(`${body.client_id}:${body.client_secret}`).toString('base64');
      const res = await axios.post('https://www.bling.com.br/Api/v3/oauth/token', 
        `grant_type=authorization_code&code=${body.code}`, 
        { headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return { statusCode: 200, headers, body: JSON.stringify(res.data) };
    }

    if (body.access_token) {
      const auth = { headers: { 'Authorization': `Bearer ${body.access_token}` } };
      const resVendas = await axios.get('https://www.bling.com.br/Api/v3/pedidos/vendas?pagina=1&limite=100', auth);
      const vendas = resVendas.data.data || [];
      const hoje = new Date();
      const hojeMesDia = hoje.toISOString().slice(5, 10); // "MM-DD"

      const pedidos = vendas.filter(v => [6, 9].includes(v.situacao.id)).map(v => {
        const dataVenda = new Date(v.data);
        const previsao = somarDiasUteis(dataVenda, 10);
        const ciclos = [2, 4, 7, 9].map(d => somarDiasUteis(dataVenda, d));
        return {
          id: v.id, numero: v.numero, nome: v.contato.nome, celular: v.contato.celular || '',
          previsao: previsao.toISOString(), proxima: (ciclos.find(d => d > hoje) || previsao).toISOString(),
          contatoAtual: ciclos.filter(d => d <= hoje).length + 1
        };
      });

      const aniversarios = vendas.filter(v => v.contato.dataNascimento?.slice(5, 10) === hojeMesDia);
      const feedbacks = vendas.filter(v => {
        const diff = Math.floor((hoje - new Date(v.data)) / 86400000);
        return v.situacao.id === 11 && diff >= 30 && diff <= 45;
      });

      return { statusCode: 200, headers, body: JSON.stringify({ pedidos, aniversarios, feedbacks }) };
    }
  } catch (error) { return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }; }
};