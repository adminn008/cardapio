const SCRIPT_URL = "SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI"; // Deixe vazio ou cole sua URL se quiser o Google Sheets opcional
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

// Canal para comunicar o painel KDS em tempo real na mesma máquina
const canalPedidos = new BroadcastChannel('canal_kds');

// 1. MÁSCARA AUTOMÁTICA DE TELEFONE (XX) XXXXX-XXXX / (XX) XXXX-XXXX
function mascaraTelefone(input) {
  let v = input.value.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  } else if (v.length > 6) {
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
  } else {
    v = v.replace(/^(\d*)$/, "($1");
  }
  
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
    const floatingCart = document.getElementById("floating-cart");
    if (floatingCart) floatingCart.classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// 3. ALTERAR QUANTIDADE E SALVAR NO LOCALSTORAGE
function alterarQtd(item, valor) {
  if (carrinho[item] + valor >= 0) {
    carrinho[item] += valor;
    const el = document.getElementById(`qty-${item}`);
    if (el) el.textContent = carrinho[item];
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

  const subtotalTxt = document.getElementById("subtotal-txt");
  if (subtotalTxt) subtotalTxt.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  
  const taxaTxt = document.getElementById("taxa-txt");
  if (taxaTxt) {
    if (taxaEntregaCalculada !== null) {
      taxaTxt.textContent = `R$ ${taxaFinal.toFixed(2).replace('.', ',')}`;
      taxaTxt.className = "";
    } else {
      taxaTxt.textContent = "A calcular pelo CEP";
      taxaTxt.className = "taxa-highlight";
    }
  }

  const totalTxt = document.getElementById("total-txt");
  if (totalTxt) totalTxt.textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;

  // Atualiza Barra Flutuante
  const floatingCart = document.getElementById("floating-cart");
  if (floatingCart) {
    if (totalItens > 0) {
      floatingCart.classList.remove("hidden");
      const cartCountBadge = document.getElementById("cart-count-badge");
      const floatingTotal = document.getElementById("floating-total");
      if (cartCountBadge) cartCountBadge.textContent = totalItens;
      if (floatingTotal) floatingTotal.textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
    } else {
      floatingCart.classList.add("hidden");
    }
  }
}

// 4. TAXA DINÂMICA REAL BASEADA NO CEP
async function consultarCEP() {
  const cepInput = document.getElementById("cep").value.replace(/\D/g, "");
  const statusTxt = document.getElementById("cep-status");

  if (cepInput.length === 8) {
    if (statusTxt) statusTxt.textContent = "🔍 Buscando endereço e calculando taxa...";
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepInput}/json/`);
      const data = await res.json();

      if (!data.erro) {
        document.getElementById("endereco").value = `${data.logradouro}, Bairro: ${data.bairro}`;
        if (statusTxt) statusTxt.textContent = `📍 Localizado em ${data.localidade} - ${data.uf}`;

        const digitoRegiao = parseInt(cepInput.charAt(5));
        taxaEntregaCalculada = 5.00 + (digitoRegiao % 4) * 2.50;

        salvarEstado();
        atualizarResumo();
      } else {
        if (statusTxt) statusTxt.textContent = "⚠️ CEP não encontrado! Preencha o endereço manualmente.";
      }
    } catch (err) {
      if (statusTxt) statusTxt.textContent = "Erro ao buscar CEP. Verifique sua conexão.";
    }
  }
}

// 5. FILTRAGEM POR CATEGORIA E BUSCA
function filtrarCategoria(cat, elemento) {
  document.querySelectorAll(".cat-btn").forEach(btn => btn.classList.remove("active"));
  if (elemento) {
    elemento.classList.add("active");
  } else if (window.event && window.event.target) {
    window.event.target.classList.add("active");
  }

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
    const nome = card.getAttribute("data-nome") || "";
    card.style.display = nome.toLowerCase().includes(termo) ? "flex" : "none";
  });
}

function mudarPagamento() {
  const val = document.getElementById("pagamento").value;
  const pixBox = document.getElementById("pix-box");
  if (pixBox) pixBox.classList.toggle("hidden", val !== "PIX");
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
      const pagEl = document.getElementById("pagamento");
      if (pagEl) {
        pagEl.value = dados.pagamento;
        mudarPagamento();
      }
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

  const form = document.getElementById("form-pedido");
  if (form) form.reset();
  
  mudarPagamento();
  atualizarResumo();
  irParaEtapa("menu");
}

// 8. PROCESSAR ENVIO E INTEGRAR COM O PAINEL KDS LOCAL
function processarEnvioPedido(e) {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const tel = document.getElementById("telefone").value;
  const end = document.getElementById("endereco").value;
  const comp = document.getElementById("complemento")?.value || "-";
  const obs = document.getElementById("obs")?.value || "Nenhuma";
  const pag = document.getElementById("pagamento").value;

  let subtotal = 0;
  let listaItens = [];

  if (carrinho.feijoada > 0) { listaItens.push(`${carrinho.feijoada}x Feijoada G`); subtotal += carrinho.feijoada * PRECOS.feijoada; }
  if (carrinho.bife > 0) { listaItens.push(`${carrinho.bife}x Bife Acebolado M`); subtotal += carrinho.bife * PRECOS.bife; }
  if (carrinho.xtudo > 0) { listaItens.push(`${carrinho.xtudo}x X-Tudo`); subtotal += carrinho.xtudo * PRECOS.xtudo; }
  if (carrinho.smash > 0) { listaItens.push(`${carrinho.smash}x Smash Duplo`); subtotal += carrinho.smash * PRECOS.smash; }
  if (carrinho.refri > 0) { listaItens.push(`${carrinho.refri}x Refri Lata`); subtotal += carrinho.refri * PRECOS.refri; }
  if (carrinho.pudim > 0) { listaItens.push(`${carrinho.pudim}x Pudim`); subtotal += carrinho.pudim * PRECOS.pudim; }

  const taxa = taxaEntregaCalculada !== null ? taxaEntregaCalculada : 0;
  const totalNum = subtotal + taxa;
  const totalFormatado = `R$ ${totalNum.toFixed(2).replace('.', ',')}`;
  const textoItens = listaItens.join(", ");
  const agora = new Date();
  const horaFormatada = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // --- GRAVAÇÃO LOCAL PARA O PAINEL KDS FUNCIONAR SEM ERROS ---
  const novoPedido = {
    id: Math.floor(100 + Math.random() * 900),
    hora: horaFormatada,
    cliente: nome,
    endereco: comp !== "-" ? `${end} (${comp})` : end,
    taxa: taxa,
    pagamento: pag,
    itens: textoItens,
    obs: obs,
    total: totalNum,
    status: "ativo"
  };

  let listaPedidos = JSON.parse(localStorage.getItem('pedidos_kds')) || [];
  listaPedidos.push(novoPedido);
  localStorage.setItem('pedidos_kds', JSON.stringify(listaPedidos));

  // Avisa a aba do painel aberto instantaneamente
  canalPedidos.postMessage({ acao: 'novo_pedido' });

  // Opcional: Envio para a planilha se a URL estiver configurada
  if (SCRIPT_URL && SCRIPT_URL !== "SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI") {
    fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "novo_pedido",
        id: novoPedido.id,
        cliente: nome,
        endereco: novoPedido.endereco,
        itens: textoItens,
        total: totalNum,
        pagamento: pag,
        taxa: taxa,
        obs: obs,
        hora: horaFormatada
      })
    }).catch(err => console.log("Aviso de sincronização da planilha:", err));
  }

  // Gera mensagem para o WhatsApp
  const msg = `*NOVO PEDIDO NO SITE!*%0A%0A` +
    `👤 *Cliente:* ${nome}%0A` +
    `📞 *Telefone:* ${tel}%0A` +
    `📍 *Endereço:* ${end}%0A` +
    `🏠 *Comp:* ${comp}%0A` +
    `🛒 *Itens:* ${textoItens}%0A` +
    `💳 *Pagamento:* ${pag}%0A` +
    `📝 *Obs:* ${obs}%0A` +
    `💰 *TOTAL:* ${totalFormatado}`;

  window.open(`https://wa.me/${SEU_WHATSAPP}?text=${msg}`, '_blank');
  
  irParaEtapa("success");
}

function inicializar() {
  const form = document.getElementById("form-pedido");
  if (form) {
    form.removeEventListener("submit", processarEnvioPedido);
    form.addEventListener("submit", processarEnvioPedido);
  }
  carregarEstadoSalvo();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializar);
} else {
  inicializar();
}
