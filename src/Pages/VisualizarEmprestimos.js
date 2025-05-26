// imports
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import DashboardAvancado from '../components/DashboardAvancado';
import { deleteDoc } from 'firebase/firestore';

export default function VisualizarEmprestimos() {
  
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [emprestimos, setEmprestimos] = useState([]);
  const [filtro, setFiltro] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [hoverPularIndex, setHoverPularIndex] = useState(null);
  const testarMensagemWhatsapp = (cliente, parcela) => {
    const mensagem = `Olá ${cliente.nome},\n\nLembrete: Sua parcela número ${parcela.numero} no valor de R$ ${parcela.valor.toFixed(2)} vence em ${parcela.vencimento || 'breve'}.\n\nQualquer dúvida, estou à disposição!`;
    alert(mensagem);
  };
  
  

  useEffect(() => {
    async function carregarClientes() {
      const snapshot = await getDocs(collection(db, 'clientes'));
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClientes(lista);
      setClientesFiltrados(lista);
    }
    carregarClientes();
  }, []);

  const filtrarClientes = useCallback(() => {
    const filtroStatus = filtro.toLowerCase();
    const lista = clientes.filter(cliente => {
      const texto = (cliente.nome + cliente.cpf).toLowerCase();
      if (!texto.includes(busca.toLowerCase())) return false;
      if (filtroStatus === "todos") return true;
      return cliente.emprestimos?.some(e => (e.status || "ativo").toLowerCase() === filtroStatus);
    });
    setClientesFiltrados(lista);
  }, [busca, filtro, clientes]);

  useEffect(() => {
    filtrarClientes();
  }, [filtrarClientes]);

  const selecionarCliente = async (id) => {
    const clienteRef = doc(db, 'clientes', id);
    const clienteSnap = await getDoc(clienteRef);
    const dados = clienteSnap.data();
    setClienteSelecionado({ id, ...dados });
    setEmprestimos(dados.emprestimos || []);
  };

  const atualizarFirebase = async (novaLista) => {
    const clienteRef = doc(db, 'clientes', clienteSelecionado.id);
    await updateDoc(clienteRef, { emprestimos: novaLista });
    await selecionarCliente(clienteSelecionado.id);
  
    // ADICIONE ISSO:
    const snapshot = await getDocs(collection(db, 'clientes'));
    const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setClientes(lista);
    setClientesFiltrados(lista); // Atualiza também os filtrados
    
  };

  const registrarHistorico = (emprestimo, acao) => {
    if (!emprestimo.historico) emprestimo.historico = [];
    emprestimo.historico.push({ acao, data: new Date().toISOString() });
  };

  const recalcularLucroTotal = (emprestimo) => {
    const totalReceber = emprestimo.parcelas.reduce((acc, p) => acc + p.valor, 0);
    const lucro = totalReceber - emprestimo.valorEmprestado;
    emprestimo.lucroTotal = lucro < 0 ? 0 : lucro;
  };
  
  

  const pagarParcela = async (i, j) => {
    const novaLista = [...emprestimos];
    const parcela = novaLista[i].parcelas[j];

    if (parcela.status === 'pendente') {
      parcela.status = 'paga';
      novaLista[i].pulosDisponiveis += 1;
      novaLista[i].ultimaAcao = 'paga';
      registrarHistorico(novaLista[i], `Parcela ${parcela.numero} paga.`);
    } else if (parcela.status === 'paga') {
      const confirmar = window.confirm("Deseja voltar o pagamento dessa parcela?");
      if (!confirmar) return;
      parcela.status = 'pendente';
      novaLista[i].pulosDisponiveis = Math.max(0, novaLista[i].pulosDisponiveis - 1);
      novaLista[i].ultimaAcao = '';
      if (novaLista[i].historico) {
        novaLista[i].historico = novaLista[i].historico.filter(h => !h.acao.includes(`Parcela ${parcela.numero} paga.`));
      }
    }

    await atualizarFirebase(novaLista);
  };

  const pularParcela = async (i, j) => {
    const novaLista = [...emprestimos];
    const emprestimo = novaLista[i];
    const parcela = emprestimo.parcelas[j];
  
    if (parcela.status === 'pendente') {
      let liberadoViaSenha = false;
      if (emprestimo.ultimaAcao === 'pulado') {
        const senha = prompt("Pulo consecutivo detectado. Digite a senha:");
        if (senha !== "1234") return alert("Senha incorreta.");
        liberadoViaSenha = true;
      }
  
      if (emprestimo.pulosDisponiveis < 1 && !liberadoViaSenha) return alert("Sem pulos disponíveis.");
  
      parcela.status = 'pulado';
      parcela.valor = Math.ceil(emprestimo.valorParcela * 0.4);
      emprestimo.ultimaAcao = 'pulado';
      if (!liberadoViaSenha) emprestimo.pulosDisponiveis -= 1;
  
      const ultimaParcela = emprestimo.parcelas[emprestimo.parcelas.length - 1];
      const dias = emprestimo.tipoContrato === 'mensal' ? 30 : 7;
      const novaData = new Date(ultimaParcela.vencimento || new Date());
      novaData.setDate(novaData.getDate() + dias);
  
      emprestimo.parcelas.push({
        numero: emprestimo.parcelas.length + 1,
        valor: emprestimo.valorParcela,
        status: 'pendente',
        vencimento: novaData.toISOString().split('T')[0],
      });
  
      emprestimo.parcelasTotais += 1;
      registrarHistorico(emprestimo, `Parcela ${parcela.numero} pulada.`);
      recalcularLucroTotal(emprestimo); // <-- atualiza o lucro
    } else if (parcela.status === 'pulado') {
      const confirmar = window.confirm("Deseja desfazer o pulo desta parcela?");
      if (!confirmar) return;
  
      parcela.status = 'pendente';
      parcela.valor = emprestimo.valorParcela;
      emprestimo.ultimaAcao = '';
      emprestimo.pulosDisponiveis += 1;
      emprestimo.parcelas.pop();
      emprestimo.parcelasTotais -= 1;
      if (emprestimo.historico) {
        emprestimo.historico = emprestimo.historico.filter(h => !h.acao.includes(`Parcela ${parcela.numero} pulada.`));
      }
      recalcularLucroTotal(emprestimo); // <-- atualiza o lucro também ao desfazer
    }
  
    await atualizarFirebase(novaLista);
  };
  

  const refinanciarEmprestimo = async (i) => {
    const senha = prompt("Digite a senha para refinanciar:");
    if (senha !== "1234") return alert("Senha incorreta.");

    const antiga = emprestimos[i];
    const valorAtual = antiga.parcelas.filter(p => p.status !== 'paga').reduce((acc, p) => acc + p.valor, 0);
    const valorExtra = parseInt(prompt("Quanto deseja adicionar no refinanciamento?"));
    if (isNaN(valorExtra) || valorExtra < 0) return alert("Valor inválido");

    const tipo = prompt("Tipo de contrato (semanal ou mensal):", antiga.tipoContrato);
    if (!['semanal', 'mensal'].includes(tipo)) return alert("Tipo inválido");

    let parcelas = tipo === 'mensal' ? parseInt(prompt("Parcelas (ex: 6):", "6")) : parseInt(prompt("Parcelas (4/6/8/10):", "4"));
    let juros = tipo === 'mensal' ? 30 : { 4: 30, 6: 50, 8: 75, 10: 100 }[parcelas];

    if (tipo === 'mensal' && window.confirm("Deseja alterar o juros mensal padrão de 30%?")) {
      const novoJuros = parseFloat(prompt("Novo juros (%):", "30"));
      if (!isNaN(novoJuros)) juros = novoJuros;
    }

    const novoValor = valorAtual + valorExtra;
    const total = Math.ceil(novoValor * (1 + juros / 100));
    const valorParcela = Math.ceil(total / parcelas);
    const lucro = total - novoValor;

    const hoje = new Date();
    const intervalo = tipo === 'mensal' ? 30 : 7;
    const dataCriacao = hoje.toISOString().split('T')[0];

    const novasParcelas = Array.from({ length: parcelas }, (_, j) => {
      const venc = new Date(hoje);
      venc.setDate(venc.getDate() + intervalo * (j + 1));
      return {
        numero: j + 1,
        valor: valorParcela,
        status: 'pendente',
        vencimento: venc.toISOString().split('T')[0]
      };
    });

    const novoEmprestimo = {
      dataCriacao,
      tipoContrato: tipo,
      juros,
      valorEmprestado: novoValor,
      valorParcela,
      parcelasTotais: parcelas,
      parcelas: novasParcelas,
      pulosDisponiveis: 2,
      lucroTotal: lucro,
      status: "Ativo",
      ultimaAcao: "",
      backupAnterior: antiga,
      historico: [{ acao: `Refinanciado com +R$ ${valorExtra} sobre dívida de R$ ${valorAtual}`, data: new Date().toISOString() }]
    };
    recalcularLucroTotal(novoEmprestimo);


    const novaLista = [...emprestimos];
    novaLista[i] = novoEmprestimo;
    await atualizarFirebase(novaLista);
  };

  const desfazerRefinanciamento = async (i) => {
    const novaLista = [...emprestimos];
    const atual = novaLista[i];
    if (!atual.backupAnterior) return alert("Nenhum backup encontrado para desfazer.");
    const confirmar = window.confirm("Deseja realmente desfazer o refinanciamento?");
    if (!confirmar) return;
    novaLista[i] = atual.backupAnterior;
    await atualizarFirebase(novaLista);
  };
  const editarDataContrato = async (i) => {
    const senha = prompt("Senha para editar data de contratação:");
    if (senha !== "1234") return alert("Senha incorreta.");
  
    const novaData = prompt("Nova data de contratação (YYYY-MM-DD):");
    if (!novaData) return;
  
    const novaLista = [...emprestimos];
    novaLista[i].dataCriacao = novaData;
    registrarHistorico(novaLista[i], `Data de contratação alterada para ${novaData}`);
    await atualizarFirebase(novaLista);
  };
  
  const editarVencimentoParcela = async (i, j) => {
    const senha = prompt("Senha para editar vencimento da parcela:");
    if (senha !== "1234") return alert("Senha incorreta.");
  
    const novaData = prompt("Nova data de vencimento (YYYY-MM-DD):");
    if (!novaData) return;
  
    const novaLista = [...emprestimos];
    novaLista[i].parcelas[j].vencimento = novaData;
    registrarHistorico(novaLista[i], `Vencimento da parcela ${j + 1} alterado para ${novaData}`);
    await atualizarFirebase(novaLista);
  };
  
  const quitarEmprestimo = async (i) => {
    if (!window.confirm("Deseja realmente quitar este empréstimo?")) return;
    const senha = prompt("Digite a senha para confirmar a quitação:");
    if (senha !== "1234") return alert("Senha incorreta.");
  
    const novaLista = [...emprestimos];
    const emp = novaLista[i];
    emp.parcelas = emp.parcelas.map(p => ({ ...p, status: 'paga' }));
    emp.ultimaAcao = 'paga';
    emp.status = "Quitado";
    registrarHistorico(emp, "Empréstimo quitado.");
    await atualizarFirebase(novaLista);
  };
  
  const cancelarEmprestimo = async (i) => {
    const senha = prompt("Senha para cancelar:");
    if (senha !== "1234") return alert("Senha incorreta.");
    const novaLista = [...emprestimos];
    novaLista[i].status = "Cancelado";
    registrarHistorico(novaLista[i], "Empréstimo cancelado.");
    await atualizarFirebase(novaLista);
  };
  
  const excluirEmprestimo = async (i) => {
    const senha = prompt("Senha para excluir:");
    if (senha !== "1234") return alert("Senha incorreta.");
    if (!window.confirm("Excluir permanentemente?")) return;
    const novaLista = [...emprestimos];
    novaLista.splice(i, 1);
    await atualizarFirebase(novaLista);
  };

  
  
  const gerarPDF = (emp, i) => {
    const doc = new jsPDF();
    doc.text("Comprovante de Empréstimo", 20, 20);
    doc.text(`Cliente: ${clienteSelecionado.nome}`, 20, 30);
    doc.text(`Valor emprestado: R$ ${emp.valorEmprestado}`, 20, 40);
    doc.text(`Parcelas: ${emp.parcelasTotais}x de R$ ${emp.valorParcela}`, 20, 50);
    doc.text(`Lucro: R$ ${emp.lucroTotal}`, 20, 60);
    doc.text(`Status: ${emp.status}`, 20, 70);
    doc.save(`Emprestimo_${i + 1}.pdf`);
  };
  
 const excluirCliente = async () => {
  const confirmar = window.confirm(`Deseja excluir permanentemente o cliente ${clienteSelecionado.nome}?`);
  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, 'clientes', clienteSelecionado.id));
    alert("Cliente excluído com sucesso.");
    setClienteSelecionado(null);

    const snapshot = await getDocs(collection(db, 'clientes'));
    const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setClientes(lista);
    setClientesFiltrados(lista);
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    alert("Erro ao excluir cliente.");
  }
};

const editarCliente = async () => {
  const novoNome = prompt("Novo nome do cliente:", clienteSelecionado.nome);
  const novoCPF = prompt("Novo CPF do cliente:", clienteSelecionado.cpf);

  if (!novoNome || !novoCPF) return alert("Nome e CPF são obrigatórios.");

  try {
    await updateDoc(doc(db, 'clientes', clienteSelecionado.id), {
      nome: novoNome,
      cpf: novoCPF
    });
    alert("Dados do cliente atualizados.");
    await selecionarCliente(clienteSelecionado.id); // recarrega
    const snapshot = await getDocs(collection(db, 'clientes'));
    const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setClientes(lista);
    setClientesFiltrados(lista);
  } catch (error) {
    console.error("Erro ao editar cliente:", error);
    alert("Erro ao editar cliente.");
  }
};
const gerarParcelaExtra = async (i) => {
  const novaLista = [...emprestimos];
  const emp = novaLista[i];
  const ultimaParcela = emp.parcelas[emp.parcelas.length - 1];
  
  const novaData = new Date(ultimaParcela.vencimento || new Date());
  const dias = emp.tipoContrato === 'mensal' ? 30 : 7;
  novaData.setDate(novaData.getDate() + dias);

  emp.parcelas.push({
    numero: emp.parcelas.length + 1,
    valor: emp.valorParcela,
    status: 'pendente',
    vencimento: novaData.toISOString().split('T')[0]
  });

  emp.parcelasTotais += 1;
  registrarHistorico(emp, `Parcela extra gerada como número ${emp.parcelas.length}`);
  recalcularLucroTotal(emp);

  await atualizarFirebase(novaLista);
  
};
const excluirParcela = async (i, j) => {
  if (!window.confirm(`Deseja excluir a parcela #${j + 1}?`)) return;

  const novaLista = [...emprestimos];
  novaLista[i].parcelas.splice(j, 1);
  novaLista[i].parcelasTotais -= 1;

  // Reajustar números das parcelas
  novaLista[i].parcelas = novaLista[i].parcelas.map((p, index) => ({
    ...p,
    numero: index + 1
  }));

  recalcularLucroTotal(novaLista[i]);
  registrarHistorico(novaLista[i], `Parcela #${j + 1} excluída.`);

  await atualizarFirebase(novaLista);
};


  // continua com os métodos de quitar, cancelar, excluir, editar e renderização JSX normalmente


  // ... o restante do código JSX permanece o mesmo
const alterarValorEmprestado = async (i) => {
  const novoValor = parseFloat(prompt("Novo valor emprestado:"));
  if (isNaN(novoValor) || novoValor <= 0) return alert("Valor inválido.");

  const novaLista = [...emprestimos];
  novaLista[i].valorEmprestado = novoValor;
  recalcularLucroTotal(novaLista[i]);
  registrarHistorico(novaLista[i], `Valor emprestado alterado para R$ ${novoValor}`);

  await atualizarFirebase(novaLista);
  
};


  return (
    
    
    <div style={{ padding: '2rem', background: '#000', minHeight: '100vh', color: '#fff' }}>
      <h2>📋 Visualizar Empréstimos</h2>

      <DashboardAvancado clientes={clientes} />

      <input
        type="text"
        placeholder="🔍 Buscar por nome ou CPF"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ padding: '0.5rem', maxWidth: '300px', border: '1px solid #D4AF37', background: '#111', color: '#fff' }}
      />

      <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ padding: '0.5rem', marginLeft: '1rem', background: '#111', color: '#fff', border: '1px solid #D4AF37' }}>
        <option>Todos</option>
        <option>Ativo</option>
        <option>Quitado</option>
        <option>Cancelado</option>
      </select>

      <br /><br />
      {clientesFiltrados.map(cliente => (
        <button key={cliente.id} onClick={() => selecionarCliente(cliente.id)} style={{ margin: '0.25rem', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #D4AF37' }}>
          {cliente.nome} - {cliente.cpf}
        </button>
      ))}

      {clienteSelecionado && (
        <div style={{ marginTop: '2rem' }}>
          <h3>📂 Cliente: {clienteSelecionado.nome}</h3>

          <div style={{ marginBottom: '1rem' }}>
  <button onClick={editarCliente} style={{ marginRight: '1rem', background: '#2d2', color: '#000', padding: '0.5rem', border: 'none', borderRadius: '6px' }}>✏️ Editar Cliente</button>
  <button onClick={excluirCliente} style={{ background: '#d22', color: '#fff', padding: '0.5rem', border: 'none', borderRadius: '6px' }}>🗑️ Excluir Cliente</button>
</div>

          {emprestimos.map((emp, i) => (
            
            <div key={i} style={{ background: '#111', padding: '1rem', borderRadius: '10px', border: '1px solid #D4AF37', marginBottom: '2rem' }}>
              <h4 style={{ color: '#F6F1DE' }}>Empréstimo #{i + 1} - {emp.status || "Ativo"}</h4>
              <p>📅 Data de contratação: {emp.dataCriacao || '---'} <button onClick={() => editarDataContrato(i)}>✏️</button></p>
              <p>📦 Tipo: {emp.tipoContrato?.toUpperCase() || '---'} | Juros: {emp.juros || '---'}%</p>
              <p> 💵 Valor: R$ {emp.valorEmprestado}
                <button onClick={() => alterarValorEmprestado(i)}>✏️</button>
  |               {emp.parcelasTotais}x de R$ {emp.valorParcela}
              </p>

              <p>📈 Lucro: R$ {emp.lucroTotal} | ⏭️ Pulos disponíveis: {emp.pulosDisponiveis}</p>
              <button onClick={() => gerarParcelaExtra(i)}> ➕ Nova Parcela</button>
              <button onClick={() => gerarPDF(emp, i)}>📄 PDF</button>
              <button onClick={() => quitarEmprestimo(i)}>✅ Quitar</button>
              <button onClick={() => cancelarEmprestimo(i)}>🟠 Cancelar</button>
              <button onClick={() => excluirEmprestimo(i)}>❌ Excluir</button>
              <button onClick={() => refinanciarEmprestimo(i)}>💸 Refinanciar</button>
              {emp.backupAnterior && (
  <button onClick={() => desfazerRefinanciamento(i)}>↩️ Desfazer Refinanciamento</button>
  

)}






              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
                {emp.parcelas.map((p, j) => (
                  <div key={j} style={{ border: '1px solid #999', padding: '0.75rem', borderRadius: '6px', background: p.status === 'paga' ? '#235D3A' : p.status === 'pulado' ? '#7D4F14' : '#222', color: '#fff', position: 'relative' }}>
                    <p>#{p.numero} • R$ {p.valor}</p>
                    <p>Status: {p.status}</p>
                    <p>📅 Vencimento: {p.vencimento || '---'} <button onClick={() => editarVencimentoParcela(i, j)}>✏️</button></p>

                    <button onClick={() => pagarParcela(i, j)}>
  {p.status === 'paga' ? '↩️ Voltar Pagamento' : '✅ Pagar'}
</button>

<button
  onClick={() => pularParcela(i, j)}
  disabled={p.status !== 'pendente' && p.status !== 'pulado'}
  onMouseEnter={() => setHoverPularIndex(`${i}-${j}`)}
  onMouseLeave={() => setHoverPularIndex(null)}
>
  {p.status === 'pulado' ? '↩️ Desfazer Pulo' : '⏭️ Pular'}
  {hoverPularIndex === `${i}-${j}` && p.status !== 'pulado' && (
    <div style={{ position: 'absolute', bottom: '125%', left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#D4AF37', padding: '6px 10px', borderRadius: '6px', whiteSpace: 'nowrap', fontSize: '12px', border: '1px solid #D4AF37', pointerEvents: 'none', zIndex: '10' }}>
      Valor do pulo: R$ {Math.ceil(emp.valorParcela * 0.4)}
      
    </div>
    
  )}
</button>
<button
  onClick={() => testarMensagemWhatsapp(clienteSelecionado, p)}
  style={{
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    marginLeft: '4px',
    display: 'flex',
    alignItems: 'center'
  }}
  title="Enviar cobrança via WhatsApp"
>
  <img
    src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
    alt="WhatsApp"
    style={{ width: '20px', height: '20px' }}
  />
</button><button onClick={() => excluirParcela(i, j)} style={{ background: 'transparent', border: 'none', color: '#d22', marginLeft: '200px', cursor: 'pointer',fontSize: '10px'}}title="Excluir Parcela">❌</button>

                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}