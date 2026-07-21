const SCRIPT_URL = "SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI";
const SEU_WHATSAPP = "5541999999999"; // Digite seu número aqui com DDD

const PRECOS = {
  feijoada: 26.90,
  bife: 21.90,
  xtudo: 24.00,
  refri: 6.00
};

let carrinho = { feijoada: 0, bife: 0, xtudo: 0, refri: 0 };
let taxaEntregaAtual = 0;

// 1. CHECA HORÁRIO
function checarHorario() {
  const hora = new Date().getHours();
  const estaAberto = (hora >= 11 && hora < 14) || (hora >= 18 && hora < 23);
  const badge = document.getElementById("status-loja");
  const banner = document.getElementById("banner-fechado");

  if (estaAberto) {
    badge.textContent = "🟢 Aberto Agora";
    badge.className = "status-badge open";
  } else {
    badge.textContent = "🔴 Fechado";
    badge.className = "status-badge closed";
    banner.classList.remove("hidden");
  }
}

// 2. ALTERA QUANTIDADE E ANIMA A BARRA FLUTUANTE
function alterarQtd(item, valor) {
  if (carrinho[item] + valor >= 0) {
    carrinho[item] += valor;
    document.getElementById(`qty-${item}`).textContent = carrinho[item];
    atualizarResumo();
  }
}

function atualizarResumo() {
  let subtotal = 0;
  let totalItens = 0;

  subtotal += carrinho.feijoada * PRECOS.feijoada;
  subtotal += carrinho.bife * PRECOS.bife;
  subtotal += carrinho.xtudo * PRECOS.xtudo;
  subtotal += carrinho.refri * PRECOS.refri;

  totalItens = Object.values(carrinho).reduce((a, b) => a + b, 0);

  const totalGeral = subtotal + taxaEntregaAtual;

  document.getElementById("subtotal-txt").textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  document.getElementById("taxa-txt").textContent = `R$ ${taxaEntregaAtual.toFixed(2).replace('.', ',')}`;
  document.getElementById("total-txt").textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;

  // Atualiza Barra Flutuante estilo iFood
  const floatingCart = document.getElementById("floating-cart");
  if (totalItens > 0) {
    floatingCart.classList.remove("hidden");
    document.getElementById("cart-count-badge").textContent = totalItens;
    document.getElementById("floating-total").textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
  } else {
    floatingCart.classList.add("hidden");
  }
}

// 3. ROLAGEM SUAVE ATÉ O CHECKOUT
function rolarParaCheckout() {
  document.getElementById("checkout-area").scrollIntoView({ behavior: "smooth" });
}

// 4. API DO VIACEP (BUSCA CEP AUTOMÁTICA)
async function consultarCEP() {
  const cepInput = document.getElementById("cep").value.replace(/\D/g, "");
  const statusTxt = document.getElementById("cep-status");

  if (cepInput.length === 8) {
    statusTxt.textContent = "Buscando endereço...";
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepInput}/json/`);
      const data = await res.json();

      if (!data.erro) {
        document.getElementById("endereco").value = `${data.logradouro}, - Bairro: ${data.bairro}`;
        statusTxt.textContent = `📍 Endereço localizado em ${data.localidade}!`;
        
        // Exemplo de regra simples de taxa pelo CEP
        taxaEntregaAtual = 6.00; // Taxa padrão para a cidade
        atualizarResumo();
      } else {
        statusTxt.textContent = "⚠️ CEP não encontrado! Digite seu endereço manualmente.";
      }
    } catch (err) {
      statusTxt.textContent = "Erro ao buscar CEP.";
    }
  }
}

// 5. MUDAR FORMA DE PAGAMENTO
function mudarPagamento() {
  const val = document.getElementById("pagamento").value;
  document.getElementById("pix-box").classList.toggle("hidden", val !== "PIX");
}

// 6. BUSCA DE PRODUTOS
function filtrarProdutos() {
  const termo = document.getElementById("search-input").value.toLowerCase();
  const cards = document.querySelectorAll(".food-card");

  cards.forEach(card => {
    const nome = card.getAttribute("data-nome");
    card.style.display = nome.includes(termo) ? "flex" : "none";
  });
}

// 7. ENVIO DO FORMULÁRIO
document.getElementById("form-pedido").addEventListener("submit", function(e) {
  e.preventDefault();

  const totalItens = Object.values(carrinho).reduce((a, b) => a + b, 0);
  if (totalItens === 0) {
    alert("Adicione pelo menos 1 item antes de enviar!");
    return;
  }

  const nome = document.getElementById("nome").value;
  const tel = document.getElementById("telefone").value;
  const end = document.getElementById("endereco").value;
  const comp = document.getElementById("complemento").value || "-";
  const obs = document.getElementById("obs").value || "Nenhuma";
  const pag = document.getElementById("pagamento").value;
  const total = document.getElementById("total-txt").textContent;

  let listaItens = [];
  if (carrinho.feijoada > 0) listaItens.push(`${carrinho.feijoada}x Feijoada G`);
  if (carrinho.bife > 0) listaItens.push(`${carrinho.bife}x Bife Acebolado M`);
  if (carrinho.xtudo > 0) listaItens.push(`${carrinho.xtudo}x X-Tudo`);
  if (carrinho.refri > 0) listaItens.push(`${carrinho.refri}x Refri Lata`);

  const textoItens = listaItens.join(", ");

  // Envio pra planilha
  if (SCRIPT_URL && SCRIPT_URL !== "SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI") {
    fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: new Date().toLocaleString("pt-BR"),
        nome, tel, endereco: `${end} (${comp})`,
        itens: textoItens, obs, pagamento: pag, total
      })
    });
  }

  // Gera texto bonito no WhatsApp
  const msg = `*NOVO PEDIDO NO SITE!*%0A%0A` +
    `👤 *Cliente:* ${nome}%0A` +
    `📍 *Endereço:* ${end}%0A` +
    `🏠 *Comp:* ${comp}%0A` +
    `🛒 *Itens:* ${textoItens}%0A` +
    `💳 *Pagamento:* ${pag}%0A` +
    `📝 *Obs:* ${obs}%0A` +
    `💰 *TOTAL:* ${total}`;

  window.location.href = `https://wa.me/${SEU_WHATSAPP}?text=${msg}`;
});

window.onload = checarHorario;
