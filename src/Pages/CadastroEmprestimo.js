import { doc, updateDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { db } from '../services/firebase';

export default function CadastrarEmprestimo() {
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [valorEmprestado, setValorEmprestado] = useState('');
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('');
  const [juros, setJuros] = useState(30);
  const [tipoContrato, setTipoContrato] = useState('semanal');
  const [desbloquearJuros, setDesbloquearJuros] = useState(false);

  const opcoesSemanais = [
    { parcelas: 4, juros: 30 },
    { parcelas: 6, juros: 50 },
    { parcelas: 8, juros: 75 },
    { parcelas: 10, juros: 100 },
  ];

  useEffect(() => {
    async function carregarClientes() {
      const snap = await getDocs(collection(db, 'clientes'));
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClientes(lista);
    }
    carregarClientes();
  }, []);

  const handleTipoContratoChange = (e) => {
    const tipo = e.target.value;
    setTipoContrato(tipo);
    setQuantidadeParcelas('');
    if (tipo === 'semanal') {
      setJuros(30);
      setDesbloquearJuros(false);
    } else {
      setJuros('');
    }
  };

  const tentarDesbloquearJuros = () => {
    const senha = prompt("Digite a senha para alterar os juros fixos:");
    if (senha === "1234") {
      setDesbloquearJuros(true);
    } else {
      alert("Senha incorreta.");
    }
  };

  const calcularSimulacao = (valor, parcelas, taxaMensal, tipo) => {
    if (!valor || !parcelas || !taxaMensal) return null;
    const taxaAplicada = tipo === 'mensal' ? taxaMensal * parcelas : taxaMensal;
    const total = Math.ceil(valor * (1 + taxaAplicada / 100));
    const valorParcela = Math.ceil(total / parcelas);
    const lucro = total - valor;
    return { total, valorParcela, lucro };
  };

  const cadastrarEmprestimo = async () => {
    if (!clienteId || !valorEmprestado || !quantidadeParcelas || !juros) {
      alert("Preencha todos os campos e selecione o cliente");
      return;
    }
    const hoje = new Date();
    const dataCriacao = hoje.toISOString().split('T')[0];
    const intervaloDias = tipoContrato === 'semanal' ? 7 : 30;
    const simulacao = calcularSimulacao(parseInt(valorEmprestado), parseInt(quantidadeParcelas), parseFloat(juros), tipoContrato);
    if (!simulacao) return alert("Erro na simulação");

    const parcelas = Array.from({ length: parseInt(quantidadeParcelas) }, (_, i) => {
      const venc = new Date(hoje);
      venc.setDate(venc.getDate() + intervaloDias * (i + 1));
      return {
        numero: i + 1,
        valor: simulacao.valorParcela,
        status: 'pendente',
        vencimento: venc.toISOString().split('T')[0]
      };
    });

    const novoEmprestimo = {
      dataCriacao,
      tipoContrato,
      juros: parseInt(juros),
      valorEmprestado: parseInt(valorEmprestado),
      valorParcela: simulacao.valorParcela,
      parcelasTotais: parseInt(quantidadeParcelas),
      parcelas,
      pulosDisponiveis: 2,
      lucroTotal: simulacao.lucro,
      status: "Ativo",
      ultimaAcao: ""
    };

    try {
      const clienteRef = doc(db, 'clientes', clienteId);
      const snap = await getDoc(clienteRef);
      const clienteData = snap.data();
      const emprestimos = clienteData.emprestimos || [];
      emprestimos.push(novoEmprestimo);
      await updateDoc(clienteRef, { emprestimos });
      alert("Empréstimo cadastrado com sucesso!");
    } catch (err) {
      console.error("Erro:", err);
      alert("Erro ao cadastrar empréstimo.");
    }
  };

  const valor = parseInt(valorEmprestado);
  const parcelas = parseInt(quantidadeParcelas);
  const taxa = parseFloat(juros);

  const simulacaoMensal = tipoContrato === 'mensal' && valor && parcelas && taxa
    ? calcularSimulacao(valor, parcelas, taxa, 'mensal')
    : null;

  return (
    <div style={{ padding: '2rem', background: '#111', color: '#fff', border: '1px solid #D4AF37', borderRadius: '10px' }}>
      <h2>➕ Cadastrar Novo Empréstimo</h2>

      <label>Cliente:</label><br />
      <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={{ padding: '0.5rem', marginBottom: '1rem' }}>
        <option value="">Selecione um cliente</option>
        {clientes.map(cliente => (
          <option key={cliente.id} value={cliente.id}>{cliente.nome} - {cliente.cpf}</option>
        ))}
      </select><br />

      <label>Tipo de Contrato:</label><br />
      <select value={tipoContrato} onChange={handleTipoContratoChange} style={{ padding: '0.5rem', marginBottom: '1rem' }}>
        <option value="semanal">Semanal</option>
        <option value="mensal">Mensal</option>
      </select><br />

      <label>Valor Emprestado:</label><br />
      <input type="number" value={valorEmprestado} onChange={e => setValorEmprestado(e.target.value)} /><br />

      {tipoContrato === 'semanal' ? (
        <>
          <label>Parcelas fixas:</label><br />
          <select
            value={quantidadeParcelas}
            onChange={(e) => {
              setQuantidadeParcelas(e.target.value);
              const jurosFixado = opcoesSemanais.find(o => o.parcelas === parseInt(e.target.value))?.juros;
              setJuros(jurosFixado || 0);
            }}>
            <option value="">Selecione</option>
            {opcoesSemanais.map(op => (
              <option key={op.parcelas} value={op.parcelas}>{op.parcelas} parcelas ({op.juros}% juros)</option>
            ))}
          </select><br />

          {desbloquearJuros ? (
            <>
              <label>Juros (%):</label><br />
              <input type="number" value={juros} onChange={e => setJuros(e.target.value)} /><br />
            </>
          ) : (
            <button onClick={tentarDesbloquearJuros} style={{ marginTop: '0.5rem' }}>✏️ Alterar Juros</button>
          )}

          {valorEmprestado && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid #555', paddingTop: '1rem' }}>
              <h3>📊 Tabela de Simulação</h3>
              {opcoesSemanais.map(op => {
                const sim = calcularSimulacao(valor, op.parcelas, op.juros, 'semanal');
                return (
                  <p key={op.parcelas}>
                    {op.parcelas}x de R$ {sim.valorParcela} → Total: R$ {sim.total} | Lucro: R$ {sim.lucro}
                  </p>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <label>Quantidade de Parcelas:</label><br />
          <input type="number" value={quantidadeParcelas} onChange={e => setQuantidadeParcelas(e.target.value)} /><br />

          <label>Juros (% por mês):</label><br />
          <input type="number" value={juros} onChange={e => setJuros(e.target.value)} /><br />

          {simulacaoMensal && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid #555', paddingTop: '1rem' }}>
              <h3>📊 Simulação</h3>
              <p>{quantidadeParcelas}x de R$ {simulacaoMensal.valorParcela} → Total: R$ {simulacaoMensal.total} | Lucro: R$ {simulacaoMensal.lucro}</p>
            </div>
          )}
        </>
      )}

      <br />
      <button onClick={cadastrarEmprestimo} disabled={!clienteId} style={{ padding: '1rem', background: clienteId ? '#D4AF37' : '#999', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '6px' }}>
        💾 Confirmar Empréstimo
      </button>
    </div>
  );
}