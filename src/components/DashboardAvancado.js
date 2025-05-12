import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, XAxis, YAxis, Bar } from 'recharts';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function DashboardAvancado({ clientes }) {
  const [dataInicio] = useState('');
  const [dataFim ] = useState('');
  const [tokenAtual, setTokenAtual] = useState('');
  const [dadosFinanceiros, setDadosFinanceiros] = useState({});
  const cores = ['#D4AF37', '#235D3A', '#7D4F14'];

  useEffect(() => {
    carregarTokenAtual();
    calcularDadosInvestidores();
  });

  const carregarTokenAtual = async () => {
    const ref = doc(db, 'config', 'tokenAtual');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setTokenAtual(snap.data().valor);
    }
  };

  const calcularParcelas = (valor, meses, juros, dataInicio = new Date()) => {
    const parcelas = [];
    const inicio = new Date(dataInicio);
    const valorBase = valor / meses;
    const valorFinal = valor + (valor * (juros / 100));

    for (let i = 0; i < meses; i++) {
      const venc = new Date(inicio);
      venc.setMonth(inicio.getMonth() + i);
      const vencimento = venc.toISOString().split('T')[0];
      const valorParcela = i === meses - 1 ? valorFinal : valorBase;

      parcelas.push({
        numero: i + 1,
        valor: Number(valorParcela.toFixed(2)),
        vencimento,
        status: 'pendente'
      });
    }

    return parcelas;
  };

  const calcularDadosInvestidores = async () => {
    const snapshot = await getDocs(collection(db, 'investidores'));
    let capitalInvestido = 0;
    let totalPagoInvestidores = 0;
    let totalAPagarInvestidores = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      (data.contratos || []).forEach(contrato => {
        capitalInvestido += contrato.valor || 0;
        const parcelas = contrato.parcelasEditadas || calcularParcelas(
          contrato.valor, contrato.meses, contrato.juros, contrato.dataInicio
        );
        totalAPagarInvestidores += parcelas.reduce((sum, p) => sum + (p.valor || 0), 0);
        const pagamentos = contrato.pagamentos || [];
        pagamentos.forEach((status, index) => {
          if (status === 'pago') {
            totalPagoInvestidores += parcelas[index]?.valor || 0;
          }
        });
      });
    });

    setDadosFinanceiros({ capitalInvestido, totalPagoInvestidores, totalAPagarInvestidores });
  };


  const calcularResumo = () => {
    let totalEmprestado = 0;
    let totalRecebido = 0;
    let totalPendente = 0;
    let lucroTotal = 0;
    let statusContagem = { Ativo: 0, Quitado: 0, Cancelado: 0 };
    let vencidos = 0;
    const hoje = new Date().toISOString().split('T')[0];
    const clientesResumo = [];

    clientes?.forEach(cliente => {
      let totalCliente = 0;
      cliente.emprestimos?.forEach(emp => {
        const dataEmprestimo = new Date(emp.dataCriacao);
        if (dataInicio && dataEmprestimo < new Date(dataInicio)) return;
        if (dataFim && dataEmprestimo > new Date(dataFim)) return;

        totalEmprestado += emp.valorEmprestado || 0;
        lucroTotal += emp.lucroTotal || 0;

        statusContagem[emp.status] = (statusContagem[emp.status] || 0) + 1;
        totalCliente += emp.valorEmprestado || 0;

        emp.parcelas.forEach(p => {
          const valor = p.valor || 0;
          if (p.status === 'paga' || p.status === 'pulado') totalRecebido += valor;
          if (p.status === 'pendente') totalPendente += valor;
          if (p.status === 'pendente' && p.vencimento < hoje) vencidos++;
        });
      });
      if (totalCliente > 0) {
        clientesResumo.push({ nome: cliente.nome, valor: totalCliente });
      }
    });

    clientesResumo.sort((a, b) => b.valor - a.valor);

    return {
      totalEmprestado,
      totalRecebido,
      totalPendente,
      lucroTotal,
      statusContagem,
      vencidos,
      topClientes: clientesResumo.slice(0, 3),
      totalClientes: clientes.length
    };
  };

  const mostrarVencimentosHoje = () => {
    const hoje = new Date();
    const hojeFormatado = hoje.toISOString().split('T')[0];
    const mensagensHoje = [];

    clientes?.forEach(cliente => {
      cliente.emprestimos?.forEach(emp => {
        emp.parcelas?.forEach(p => {
          if (!p.vencimento) return;
          const venc = new Date(p.vencimento);
          if (isNaN(venc.getTime())) return;
          const vencFormatado = venc.toISOString().split('T')[0];

          if (vencFormatado === hojeFormatado && p.status === 'pendente') {
            mensagensHoje.push(`📌 ${cliente.nome} - Parcela #${p.numero} • R$ ${p.valor}`);
          }
        });
      });
    });

    if (mensagensHoje.length === 0) return alert("✅ Nenhuma parcela pendente vence hoje.");
    alert(mensagensHoje.join('\n'));
  };

  const mostrarParcelasVencidas = () => {
    const hoje = new Date().toISOString().split('T')[0];
    const mensagensAtraso = [];

    clientes?.forEach(cliente => {
      cliente.emprestimos?.forEach(emp => {
        emp.parcelas?.forEach(p => {
          if (!p.vencimento || p.status !== 'pendente') return;
          if (p.vencimento < hoje) {
            mensagensAtraso.push(`⚠️ ${cliente.nome} - Parcela #${p.numero} • R$ ${p.valor} • Venc: ${p.vencimento}`);
          }
        });
      });
    });

    if (mensagensAtraso.length === 0) return alert("✅ Nenhuma parcela vencida.");
    alert(mensagensAtraso.join('\n'));
  };

  const resumo = calcularResumo();
  const dadosGrafico = [
    { nome: 'Emprestado', valor: resumo.totalEmprestado },
    { nome: 'Recebido', valor: resumo.totalRecebido },
    { nome: 'Pendente', valor: resumo.totalPendente },
  ];

  const dadosBarra = Object.entries(resumo.statusContagem).map(([status, count]) => ({ status, count }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#111',
          padding: '6px 10px',
          borderRadius: '6px',
          color: '#D4AF37',
          fontSize: '12px',
          border: '1px solid #D4AF37'
        }}>
          {`${payload[0].name || payload[0].payload.status}: ${payload[0].value}`}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ background: '#000', padding: '2rem', borderRadius: '12px', border: '1px solid #D4AF37' }}>
      <h2 style={{ color: '#D4AF37' }}>📊 Dashboard Avançado</h2>

      <div style={{ marginBottom: '1rem' }}>
        <button onClick={mostrarVencimentosHoje} style={btnStyle}>📅 Vencimentos de Hoje</button>
        <button onClick={mostrarParcelasVencidas} style={{ ...btnStyle, background: '#7D4F14', marginLeft: '1rem' }}>🔴 Parcelas Atrasadas</button>
      </div>

      <div style={{ display: 'flex', gap: '10rem', flexWrap: 'wrap' }}>
        <PieChart width={300} height={300}>
          <Pie
            data={dadosGrafico}
            dataKey="valor"
            nameKey="nome"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
          >
            {dadosGrafico.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={cores[index % cores.length]} />
            ))}
          </Pie>
          <RechartsTooltip content={<CustomTooltip />} />
        </PieChart>

        <BarChart width={300} height={300} data={dadosBarra}>
          <XAxis dataKey="status" stroke="#D4AF37" />
          <YAxis stroke="#D4AF37" />
          <Bar dataKey="count" fill="#D4AF37" />
          <RechartsTooltip content={<CustomTooltip />} />
        </BarChart>

       <p> <div style={{ flex: 1 }}>
          
          <p style={textStyle}>💰 Total Emprestado: <strong>R$ {resumo.totalEmprestado.toFixed(2)}</strong></p>
          <p style={textStyle}>📥 Total Recebido: <strong>R$ {resumo.totalRecebido.toFixed(2)}</strong></p>
          <p style={textStyle}>⏳ Total Pendente: <strong>R$ {resumo.totalPendente.toFixed(2)}</strong></p>
          <p style={textStyle}>🔄 Total Esperado: <strong>R$ {(resumo.totalRecebido + resumo.totalPendente).toFixed(2)}</strong></p>
          <p><h4 style={{ color: '#D4AF37', marginTop: '1rem' }}>📘 Legenda Financeira Geral</h4></p>
          <p style={textStyle}>💼 Capital Investido: <strong>R$ {dadosFinanceiros.capitalInvestido?.toFixed(2)}</strong></p>
          <p style={textStyle}>📤 Pagos aos Investidores: <strong>R$ {dadosFinanceiros.totalPagoInvestidores?.toFixed(2)}</strong></p>
          <p style={textStyle}>📈 Total a Pagar (Investidores): <strong>R$ {dadosFinanceiros.totalAPagarInvestidores?.toFixed(2)}</strong></p>
          <p style={textStyle}>⏳ Falta Pagar aos Investidores: <strong>R$ {(dadosFinanceiros.totalAPagarInvestidores - dadosFinanceiros.totalPagoInvestidores).toFixed(2)}</strong></p>
        
        </div></p>

       <p> <div style={{ flex: 1 }}>
          <h4 style={{ color: '#D4AF37' }}>🔐 Token Atual</h4>
          <p style={{ fontSize: '1.5rem', color: '#fff' }}>{tokenAtual}</p>
          <p style={{ fontSize: '0.9rem', color: '#888' }}>Use esse código para assinatura de contrato</p>
        </div></p>
      </div>
    </div>
  );
}

const btnStyle = {
  background: '#235D3A',
  color: '#fff',
  border: 'none',
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  cursor: 'pointer'
};

const textStyle = {
  color: '#F6F1DE',
  margin: '0.5rem 0'
};
