const SCRIPT_URL = "SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI";
const SEU_WHATSAPP = "5541999999999"; // Coloque seu WhatsApp com DDD

const PRECOS = {
  feijoada: 26.90,
  bife: 21.90,
  xtudo: 24.00,
  smash: 22.50,
  refri: 6.00,
  pudim: 8.50
};

let carrinho = { feijoada: 0, bife: 0, xtudo: 0, smash: 0, refri: 0, pudim: 0 };
let taxaEntregaCalculada = null;

// 1. MÁSCARA AUTOMÁTICA DE TELEFONE (XX) XXXXX-XXXX
function mascaraTelefone(input) {
  let v = input.value.replace(/\D/g, "");
  v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  v = v.replace(/(\d)(\d{4})$/, "$1-$2");
  input.value = v;
}

// 2. CONTROLE DE NAVEGAÇÃO DE ETAPAS
function irParaEtapa(etapa) {
  document.getElementById("step-menu").classList.add("hidden");
  document.getElementById("step-checkout").classList.add("hidden");
  document.getElementById("step-success").classList.add("hidden");

  if (etapa === "menu") {
    document.getElementById("step-menu").classList.remove("hidden");
  } else if (etapa === "checkout") {
    const totalItens = Object.values(carrinho).reduce((a, b) => a + b, 0);
    if (totalItens === 0) {
      alert("Selecione pelo menos um item no cardápio antes de prosseguir!");
      document.getElementById("step-menu").classList.remove("hidden");
      return;
    }
    document.getElementById("step-checkout").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (etapa === "success") {
    document.getElementById("step-success").classList.remove("hidden");
    document.getElementById("floating-cart").classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// 3. ALTERAR QUANTIDADE E SALVAR NO LOCALSTORAGE
function alterarQtd(item, valor) {
  if (carrinho[item] + valor >= 0) {
    carrinho[item] += valor;
    document.getElementById(`qty-${item}`).textContent = carrinho[item];
    salvarEstado();
    atualizarResumo();
  }
}

function atualizarResumo() {
  let subtotal = 0;
  let totalItens = 0;

  for (let item in carrinho) {
    subtotal += carrinho[item] * PRECOS[item];
    totalItens += carrinho[item];
  }

  const taxaFinal = taxaEntregaCalculada !== null ? taxaEntregaCalculada : 0;
  const totalGeral = subtotal + taxaFinal;

  document.getElementById("subtotal-txt").textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  
  if (taxaEntregaCalculada !== null) {
    document.getElementById("taxa-txt").textContent = `R$ ${taxaFinal.toFixed(2).replace('.', ',')}`;
    document.getElementById("taxa-txt").className = "";
  } else {
    document.getElementById("taxa-txt").textContent = "A calcular pelo CEP";
    document.getElementById("taxa-txt").className = "taxa-highlight";
  }

  document.getElementById("total-txt").textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;

  // Atualiza Barra Flutuante
  const floatingCart = document.getElementById("floating-cart");
  if (totalItens > 0) {
    floatingCart.classList.remove("hidden");
    document.getElementById("cart-count-badge").textContent = totalItens;
    document.getElementById("floating-total").textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
  } else {
    floatingCart.classList.add("hidden");
  }
}

// 4. TAXA DINÂMICA REAL BASEADA NO CEP
async function consultarCEP() {
  const cepInput = document.getElementById("cep").value.replace(/\D/g, "");
  const statusTxt = document.getElementById("cep-status");

  if (cepInput.length === 8) {
    statusTxt.textContent = "🔍 Buscando endereço e calculando taxa...";
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepInput}/json/`);
      const data = await res.json();

      if (!data.erro) {
        document.getElementById("endereco").value = `${data.logradouro}, Bairro: ${data.bairro}`;
        statusTxt.textContent = `📍 Localizado em ${data.localidade} - ${data.uf}`;

        // Cálculo dinâmico baseado na regra de regiões pelo CEP
        const digitoRegiao = parseInt(cepInput.charAt(5));
        taxaEntregaCalculada = 5.00 + (digitoRegiao % 4) * 2.50; // Varia dinamicamente entre R$ 5,00 e R$ 12,50

        salvarEstado();
        atualizarResumo();
      } else {
        statusTxt.textContent = "⚠️ CEP não encontrado! Preencha o endereço manualmente.";
      }
    } catch (err) {
      statusTxt.textContent = "Erro ao buscar CEP. Verifique sua conexão.";
    }
  }
}

// 5. FILTRAGEM POR CATEGORIA E BUSCA
function filtrarCategoria(cat) {
  document.querySelectorAll(".cat-btn").forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");

  const cards = document.querySelectorAll(".food-card");
  cards.forEach(card => {
    if (cat === "todas" || card.getAttribute("data-cat") === cat) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

function filtrarProdutos() {
  const termo = document.getElementById("search-input").value.toLowerCase();
  const cards = document.querySelectorAll(".food-card");

  cards.forEach(card => {
    const nome = card.getAttribute("data-nome");
    card.style.display = nome.includes(termo) ? "flex" : "none";
  });
}

function mudarPagamento() {
  const val = document.getElementById("pagamento").value;
  document.getElementById("pix-box").classList.toggle("hidden", val !== "PIX");
}

// 6. PERSISTÊNCIA EM LOCALSTORAGE
function salvarEstado() {
  localStorage.setItem("carrinho_sabor_cia", JSON.stringify(carrinho));
  localStorage.setItem("taxa_sabor_cia", JSON.stringify(taxaEntregaCalculada));
}

function salvarFormulario() {
  const dados = {
    nome: document.getElementById("nome").value,
    telefone: document.getElementById("telefone").value,
    cep: document.getElementById("cep").value,
    endereco: document.getElementById("endereco").value,
    complemento: document.getElementById("complemento").value,
    obs: document.getElementById("obs").value,
    pagamento: document.getElementById("pagamento").value
  };
  localStorage.setItem("form_sabor_cia", JSON.stringify(dados));
}

function carregarEstadoSalvo() {
  const carrinhoSalvo = localStorage.getItem("carrinho_sabor_cia");
  const taxaSalva = localStorage.getItem("taxa_sabor_cia");
  const formSalvo = localStorage.getItem("form_sabor_cia");

  if (carrinhoSalvo) {
    carrinho = JSON.parse(carrinhoSalvo);
    for (let item in carrinho) {
      const el = document.getElementById(`qty-${item}`);
      if (el) el.textContent = carrinho[item];
    }
  }

  if (taxaSalva !== null) {
    taxaEntregaCalculada = JSON.parse(taxaSalva);
  }

  if (formSalvo) {
    const dados = JSON.parse(formSalvo);
    if (dados.nome) document.getElementById("nome").value = dados.nome;
    if (dados.telefone) document.getElementById("telefone").value = dados.telefone;
    if (dados.cep) document.getElementById("cep").value = dados.cep;
    if (dados.endereco) document.getElementById("endereco").value = dados.endereco;
    if (dados.complemento) document.getElementById("complemento").value = dados.complemento;
    if (dados.obs) document.getElementById("obs").value = dados.obs;
    if (dados.pagamento) {
      document.getElementById("pagamento").value = dados.pagamento;
      mudarPagamento();
    }
  }

  atualizarResumo();
}

// 7. VOLTAR AO INÍCIO / ZERAR TUDO
function reiniciarPedido() {
  localStorage.removeItem("carrinho_sabor_cia");
  localStorage.removeItem("taxa_sabor_cia");
  localStorage.removeItem("form_sabor_cia");

  carrinho = { feijoada: 0, bife: 0, xtudo: 0, smash: 0, refri: 0, pudim: 0 };
  taxaEntregaCalculada = null;

  for (let item in carrinho) {
    const el = document.getElementById(`qty-${item}`);
    if (el) el.textContent = "0";
  }

  document.getElementById("form-pedido").reset();
  mudarPagamento();
  atualizarResumo();
  irParaEtapa("menu");
}

// 8. ENVIO DO FORMULÁRIO
document.getElementById("form-pedido").addEventListener("submit", function(e) {
  e.preventDefault();

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
  if (carrinho.smash > 0) listaItens.push(`${carrinho.smash}x Smash Duplo`);
  if (carrinho.refri > 0) listaItens.push(`${carrinho.refri}x Refri Lata`);
  if (carrinho.pudim > 0) listaItens.push(`${carrinho.pudim}x Pudim`);

  const textoItens = listaItens.join(", ");

  // Envio pra planilha do Google
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

  // Gera texto no WhatsApp
  const msg = `*NOVO PEDIDO NO SITE!*%0A%0A` +
    `👤 *Cliente:* ${nome}%0A` +
    `📞 *Telefone:* ${tel}%0A` +
    `📍 *Endereço:* ${end}%0A` +
    `🏠 *Comp:* ${comp}%0A` +
    `🛒 *Itens:* ${textoItens}%0A` +
    `💳 *Pagamento:* ${pag}%0A` +
    `📝 *Obs:* ${obs}%0A` +
    `💰 *TOTAL:* ${total}`;

  window.open(`https://wa.me/${SEU_WHATSAPP}?text=${msg}`, '_blank');
  
  irParaEtapa("success");
});

window.onload = function() {
  carregarEstadoSalvo();
};
