// CONFIGURAÇÕES DA SUA LOJA
const GOOGLE_SCRIPT_URL = "SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI";
const TELEFONE_WHATSAPP = "5541999999999"; // Seu número completo com DDD

// Preço dos itens
const PRECOS = {
  marmita_m: 22.00,
  marmita_g: 28.00,
  refri: 6.00
};

// Quantidades selecionadas
let pedidoItens = {
  marmita_m: 0,
  marmita_g: 0,
  refri: 0
};

// 1. CHECAR HORÁRIO DE FUNCIONAMENTO (Ex: 11:00 às 14:00 e 18:00 às 22:00)
function verificarHorario() {
  const agora = new Date();
  const hora = agora.getHours();
  
  const statusBadge = document.getElementById('status-loja');
  const bannerFechado = document.getElementById('banner-fechado');

  // Define se está aberto
  const abertoAlmoco = hora >= 11 && hora < 14;
  const abertoJantar = hora >= 18 && hora < 22;

  if (abertoAlmoco || abertoJantar) {
    statusBadge.textContent = "🟢 Loja Aberta";
    statusBadge.classList.add('aberto');
  } else {
    statusBadge.textContent = "🔴 Loja Fechada (Recebendo Agendamento)";
    statusBadge.classList.add('fechado');
    bannerFechado.classList.remove('hidden');
  }
}

// 2. ALTERAR QUANTIDADE DOS ITENS
function alterarQtd(item, valor) {
  if (pedidoItens[item] + valor >= 0) {
    pedidoItens[item] += valor;
    document.getElementById(`qtd-${item}`).textContent = pedidoItens[item];
    atualizarTotal();
  }
}

// 3. CALCULAR SUBTOTAL, TAXA DE ENTREGA E TOTAL GERAL
function atualizarTotal() {
  let subtotal = 0;
  
  subtotal += pedidoItens.marmita_m * PRECOS.marmita_m;
  subtotal += pedidoItens.marmita_g * PRECOS.marmita_g;
  subtotal += pedidoItens.refri * PRECOS.refri;

  const selectBairro = document.getElementById('bairro');
  const taxaOption = selectBairro.options[selectBairro.selectedIndex];
  const taxaEntrega = parseFloat(taxaOption.getAttribute('data-taxa') || 0);

  const totalGeral = subtotal + taxaEntrega;

  document.getElementById('subtotal').textContent = `R$ ${subtotal.toFixed(2)}`;
  document.getElementById('taxa-entrega').textContent = `R$ ${taxaEntrega.toFixed(2)}`;
  document.getElementById('total-geral').textContent = `R$ ${totalGeral.toFixed(2)}`;
}

// 4. ALTERNAR VISIBILIDADE DO QUADRO PIX
function togglePagamentoInfo() {
  const forma = document.getElementById('pagamento').value;
  const pixBox = document.getElementById('pix-info');
  
  if (forma === "PIX") {
    pixBox.classList.remove('hidden');
  } else {
    pixBox.classList.add('hidden');
  }
}

// 5. PROCESSAR E ENVIAR PEDIDO
document.getElementById('form-pedido').addEventListener('submit', function(e) {
  e.preventDefault();

  // Garante que o cliente escolheu pelo menos 1 item
  const totalItens = Object.values(pedidoItens).reduce((a, b) => a + b, 0);
  if (totalItens === 0) {
    alert("Por favor, adicione pelo menos 1 item ao seu pedido!");
    return;
  }

  // Coleta dados
  const nome = document.getElementById('nome').value;
  const telefone = document.getElementById('telefone').value;
  const bairro = document.getElementById('bairro').value;
  const endereco = document.getElementById('endereco').value;
  const obs = document.getElementById('observacao').value || "Nenhuma";
  const pagamento = document.getElementById('pagamento').value;
  const total = document.getElementById('total-geral').textContent;

  // Monta o resumo dos itens em texto
  let resumoItens = [];
  if (pedidoItens.marmita_m > 0) resumoItens.push(`${pedidoItens.marmita_m}x Marmita M`);
  if (pedidoItens.marmita_g > 0) resumoItens.push(`${pedidoItens.marmita_g}x Marmita G`);
  if (pedidoItens.refri > 0) resumoItens.push(`${pedidoItens.refri}x Refri Lata`);
  
  const textoItens = resumoItens.join(", ");

  const dadosPedido = {
    data: new Date().toLocaleString("pt-BR"),
    nome: nome,
    telefone: telefone,
    bairro: bairro,
    endereco: endereco,
    itens: textoItens,
    obs: obs,
    pagamento: pagamento,
    total: total
  };

  const btnEnviar = document.getElementById('btn-enviar');
  btnEnviar.disabled = true;
  btnEnviar.textContent = "Enviando pedido...";

  // Envia para o Google Sheets (se a URL estiver configurada)
  if (GOOGLE_SCRIPT_URL !== "SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI") {
    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosPedido)
    }).catch(err => console.error("Erro ao salvar na planilha:", err));
  }

  // Gera mensagem para WhatsApp
  const msgWhatsapp = `*NOVO PEDIDO DE LANCHE/MARMITA*%0A%0A` +
    `👤 *Cliente:* ${nome}%0A` +
    `📞 *Tel:* ${telefone}%0A` +
    `📍 *Endereço:* ${endereco} (${bairro})%0A` +
    `🛒 *Itens:* ${textoItens}%0A` +
    `📝 *Obs:* ${obs}%0A` +
    `💳 *Pagamento:* ${pagamento}%0A` +
    `💰 *Total:* ${total}`;

  // Abre o WhatsApp para confirmação do cliente
  setTimeout(() => {
    window.location.href = `https://wa.me/${TELEFONE_WHATSAPP}?text=${msgWhatsapp}`;
  }, 1000);
});

// Inicialização
window.onload = function() {
  verificarHorario();
};

