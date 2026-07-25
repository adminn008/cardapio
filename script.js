// CONFIGURAÇÕES DO SISTEMA
const SCRIPT_URL = "SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI"; // Cole aqui o link da planilha se já tiver configurado
const SEU_WHATSAPP = "5541999682836"; // Substitua pelo seu WhatsApp comercial com DDD
const CHAVE_PIX = "00.000.000/0001-00";

const PRECOS = {
  esfirra_frango: 6.00,
  esfirra_carne: 6.00,
  esfirra_presunto: 6.50,
  esfirra_catupiry: 7.00,
  risole_frango: 6.00,
  risole_carne: 6.00,
  risole_presunto: 6.50,
  risole_catupiry: 7.00,
  feijoada: 26.90,
  bife: 21.90,
  refri: 6.00
};

let carrinho = {
  esfirra_frango: 0,
  esfirra_carne: 0,
  esfirra_presunto: 0,
  esfirra_catupiry: 0,
  risole_frango: 0,
  risole_carne: 0,
  risole_presunto: 0,
  risole_catupiry: 0,
  feijoada: 0,
  bife: 0,
  refri: 0
};

let taxaEntregaCalculada = null;
let slideAtual = 0;

// CARROSSEL AUTOMÁTICO
function mudarSlide(index) {
  const slides = document.getElementById("carousel-slides");
  const dots = document.querySelectorAll(".dot");
  slideAtual = index;
  slides.style.transform = `translateX(-${slideAtual * 100}%)`;
  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === slideAtual);
  });
}

setInterval(() => {
  slideAtual = (slideAtual + 1) % 3;
  mudarSlide(slideAtual);
}, 4500);

// FUNÇÃO PARA LIDAR COM O CAMPO S/N
function toggleSemNumero() {
  const check = document.getElementById("check-sn");
  const inputNum = document.getElementById("numero");

  if (event && event.target !== check) {
    check.checked = !check.checked;
  }

  if (check.checked) {
    inputNum.value = "S/N";
    inputNum.disabled = true;
  } else {
    inputNum.value = "";
    inputNum.disabled = false;
  }
  salvarFormulario();
}

// COPIAR CHAVE PIX COM MENSAGEM BONITA NA TELA (SEM ALERT DO NAVEGADOR)
function copiarChavePix() {
  navigator.clipboard.writeText(CHAVE_PIX).then(() => {
    const btn = document.getElementById("btn-copiar-pix");
    
    // Guarda o texto original do botão
    const textoOriginal = btn.innerHTML;
    
    // Muda o botão para uma mensagem chamativa e bonita
    btn.innerHTML = "✨ Chave Pix Copiada com Sucesso!";
    btn.style.background = "var(--accent)";
    btn.style.color = "#fff";
    
    // Depois de 2.5 segundos, o botão volta ao normal sozinho
    setTimeout(() => {
      btn.innerHTML = textoOriginal;
      btn.style.background = "";
      btn.style.color = "";
    }, 2500);
    
  }).catch(() => {
    alert("Erro ao copiar chave.");
  });
}


// MÁSCARA AUTOMÁTICA DE TELEFONE
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

// NAVEGAÇÃO DE ETAPAS
function irParaEtapa(etapa) {
  document.getElementById("step-menu").classList.add("hidden");
  document.getElementById("step-checkout").classList.add("hidden");

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
  }
}

// ALTERAR QUANTIDADE E ATUALIZAR RESUMO
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

  document.getElementById("subtotal-txt").textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  
  const taxaTxt = document.getElementById("taxa-txt");
  if (taxaEntregaCalculada !== null) {
    taxaTxt.textContent = `R$ ${taxaFinal.toFixed(2).replace('.', ',')}`;
  } else {
    taxaTxt.textContent = "A calcular pelo CEP";
  }

  document.getElementById("total-txt").textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;

  const floatingCart = document.getElementById("floating-cart");
  if (floatingCart) {
    if (totalItens > 0) {
      floatingCart.classList.remove("hidden");
      document.getElementById("cart-count-badge").textContent = totalItens;
      document.getElementById("floating-total").textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
    } else {
      floatingCart.classList.add("hidden");
    }
  }
}

// CEP FIXO DA SUA LOJA (Coloque o CEP exato da sua loja aqui)
const CEP_DA_LOJA = "83005000"; // Exemplo: Substitua pelo CEP real da sua loja

// CÁLCULO DE TAXA BASEADO NA DISTÂNCIA REAL DA LOJA ATÉ O CLIENTE
async function consultarCEP() {
  const cepInput = document.getElementById("cep").value.replace(/\D/g, "");
  const statusTxt = document.getElementById("cep-status");

  if (cepInput.length === 8) {
    statusTxt.textContent = "🔍 Calculando distância exata da loja até você...";
    try {
      // 1. Busca o endereço do cliente
      const resCliente = await fetch(`https://viacep.com.br/ws/${cepInput}/json/`);
      const dataCliente = await resCliente.json();

      if (dataCliente.erro) {
        statusTxt.textContent = "⚠️ CEP não encontrado! Preencha o endereço manualmente.";
        return;
      }

      // 2. Busca o endereço da loja para garantir referência
      const resLoja = await fetch(`https://viacep.com.br/ws/${CEP_DA_LOJA}/json/`);
      const dataLoja = await resLoja.json();

      document.getElementById("endereco").value = `${dataCliente.logradouro}, Bairro: ${dataCliente.bairro}`;
      
      // Se for o mesmo bairro da loja, taxa fixa menor
      if (dataCliente.bairro.toLowerCase() === dataLoja.bairro.toLowerCase()) {
        taxaEntregaCalculada = 6.00; // Taxa fixa para o mesmo bairro
        statusTxt.textContent = `📍 Mesmo bairro (${dataCliente.bairro}) - Taxa local!`;
      } else {
        // Se for outro bairro, calcula uma taxa progressiva baseada na diferença numérica dos CEPs 
        // (quanto mais distante a faixa de CEP, maior a taxa)
        let diferencaCep = Math.abs(parseInt(cepInput) - parseInt(CEP_DA_LOJA));
        
        // Regra de cálculo proporcional: base de R$ 8 + acréscimo por faixa de distância
        let taxaCalculada = 8.00 + (Math.floor(diferencaCep / 1000) * 2.00);
        
        // Trava um teto máximo para não ficar absurdo (ex: máximo R$ 25,00)
        taxaEntregaCalculada = Math.min(taxaCalculada, 25.00);

        statusTxt.textContent = `📍 Bairro: ${dataCliente.bairro} (Calculado a partir da loja)`;
      }

      salvarEstado();
      atualizarResumo();

    } catch (err) {
      statusTxt.textContent = "Erro ao calcular rota. Verifique sua conexão.";
    }
  }
}


// FILTRAGEM
function filtrarCategoria(cat, elemento) {
  document.querySelectorAll(".cat-btn").forEach(btn => btn.classList.remove("active"));
  if (elemento) elemento.classList.add("active");

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
  document.getElementById("pix-box").classList.toggle("hidden", val !== "PIX");
}

// PERSISTÊNCIA
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
    numero: document.getElementById("numero").value,
    snChecked: document.getElementById("check-sn").checked,
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

  if (taxaSalva !== null) taxaEntregaCalculada = JSON.parse(taxaSalva);

  if (formSalvo) {
    const dados = JSON.parse(formSalvo);
    if (dados.nome) document.getElementById("nome").value = dados.nome;
    if (dados.telefone) document.getElementById("telefone").value = dados.telefone;
    if (dados.cep) document.getElementById("cep").value = dados.cep;
    if (dados.endereco) document.getElementById("endereco").value = dados.endereco;
    
    if (dados.snChecked) {
      document.getElementById("check-sn").checked = true;
      document.getElementById("numero").value = "S/N";
      document.getElementById("numero").disabled = true;
    } else if (dados.numero) {
      document.getElementById("numero").value = dados.numero;
    }

    if (dados.complemento) document.getElementById("complemento").value = dados.complemento;
    if (dados.obs) document.getElementById("obs").value = dados.obs;
    if (dados.pagamento) {
      document.getElementById("pagamento").value = dados.pagamento;
      mudarPagamento();
    }
  }

  atualizarResumo();
}

// ENVIO PARA WHATSAPP
function processarEnvioPedido(e) {
  e.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const tel = document.getElementById("telefone").value.trim();
  const end = document.getElementById("endereco").value.trim();
  const num = document.getElementById("numero").value.trim();
  const comp = document.getElementById("complemento")?.value.trim() || "Nenhum";
  const obs = document.getElementById("obs")?.value.trim() || "Nenhuma";
  const pag = document.getElementById("pagamento").value;

  if (!nome || !tel || !end || !num) {
    alert("Por favor, preencha seu Nome, Telefone, Endereço e Número/S/N antes de enviar!");
    return;
  }

  let subtotal = 0;
  let listaItensDescritiva = [];

  const nomesProdutosDescricao = {
    esfirra_frango: "Esfirra de Frango",
    esfirra_carne: "Esfirra de Carne",
    esfirra_presunto: "Esfirra Presunto & Mussarela",
    esfirra_catupiry: "Esfirra Frango c/ Catupiry",
    risole_frango: "Risole de Frango",
    risole_carne: "Risole de Carne",
    risole_presunto: "Risole Presunto & Mussarela",
    risole_catupiry: "Risole Frango c/ Catupiry",
    feijoada: "Feijoada Completa G",
    bife: "Bife Acebolado M",
    refri: "Refri Lata 350ml"
  };

  for (let item in carrinho) {
    if (carrinho[item] > 0) {
      let val = carrinho[item] * PRECOS[item];
      listaItensDescritiva.push(`${carrinho[item]}x ${nomesProdutosDescricao[item]} (R$ ${val.toFixed(2).replace('.', ',')})`);
      subtotal += val;
    }
  }

  const taxaFinal = taxaEntregaCalculada !== null ? taxaEntregaCalculada : 0;
  const taxaFormatada = taxaEntregaCalculada !== null ? `R$ ${taxaFinal.toFixed(2).replace('.', ',')}` : "A calcular / Retirada";
  const totalNum = subtotal + taxaFinal;
  const totalFormatado = `R$ ${totalNum.toFixed(2).replace('.', ',')}`;

  let itensTexto = "";
  listaItensDescritiva.forEach(item => {
    itensTexto += `▪️ ${item}\n`;
  });

  const agora = new Date();

  if (SCRIPT_URL && SCRIPT_URL !== "SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI") {
    fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: agora.toLocaleString("pt-BR"),
        nome, tel, endereco: `${end}, Nº ${num} (${comp})`,
        itens: listaItensDescritiva.join(", "), obs, pagamento: pag, total: totalFormatado
      })
    }).catch(() => {});
  }

  const msg = `🍔 *NOVO PEDIDO - SABOR & CIA* 🍟\n\n` +
    `👤 *Cliente:* ${nome}\n` +
    `📞 *Telefone:* ${tel}\n` +
    `📍 *Endereço:* ${end}, *Nº ${num}*\n` +
    `🏠 *Complemento:* ${comp}\n\n` +
    `🛒 *ITENS DO PEDIDO:*\n` +
    itensTexto + `\n` +
    `📦 *Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n` +
    `🛵 *Taxa de Entrega:* ${taxaFormatada}\n` +
    `💰 *TOTAL GERAL:* *${totalFormatado}*\n\n` +
    `💳 *Forma de Pagamento:* ${pag}\n` +
    `📝 *Observações:* ${obs}\n\n` +
    `_Pedido gerado via cardápio online_`;

  const url = `https://wa.me/${SEU_WHATSAPP}?text=` + encodeURIComponent(msg);
  window.open(url, '_blank');
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

// MÁSCARA AUTOMÁTICA DE CEP (xxxxx-xxx)
function mascaraCEP(input) {
  let v = input.value.replace(/\D/g, ""); // Remove tudo que não for número
  if (v.length > 8) v = v.slice(0, 8);    // Limita a 8 números
  
  // Aplica o traço após os 5 primeiros dígitos
  if (v.length > 5) {
    v = v.replace(/^(\d{5})(\d{0,3})$/, "$1-$2");
  }
  
  input.value = v;
}
