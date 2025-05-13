// DashboardAvancado.js FINALIZADO
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, XAxis, YAxis, Bar } from 'recharts';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function DashboardAvancado({ clientes }) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tokenAtual, setTokenAtual] = useState('');
  const [dadosFinanceiros, setDadosFinanceiros] = useState({});
  const cores = ['#D4AF37', '#235D3A', '#7D4F14'];

  useEffect(() => {
    carregarTokenAtual();
    calcularDadosInvestidores();
  }, []);

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

  const gerarLinkWhatsapp = (mensagem) => {
    return `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
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
            const mensagem = `Olá ${cliente.nome}, lembrando que sua parcela #${p.numero} no valor de R$ ${p.valor} vence hoje.`;
            mensagensHoje.push({ texto: `📌 ${cliente.nome} - Parcela #${p.numero} • R$ ${p.valor}`, mensagem });
          }
        });
      });
    });

    if (mensagensHoje.length === 0) return alert("✅ Nenhuma parcela pendente vence hoje.");

    const popup = window.open('', 'VencimentosHoje', 'width=500,height=600');
    popup.document.write('<html><head><title>Vencimentos de Hoje</title></head><body style="font-family:sans-serif;background:#111;color:#D4AF37;padding:20px;">');
    popup.document.write('<h2>📅 Vencimentos de Hoje</h2>');

    mensagensHoje.forEach(m => {
      popup.document.write(`
        <div style="margin-bottom: 1.5rem; border-bottom: 1px solid #D4AF37; padding-bottom: 10px;">
          <p>${m.texto}</p>
          <a href='${gerarLinkWhatsapp(m.mensagem)}' target='_blank' style="color:#25D366;text-decoration:none;font-weight:bold;">📲 Enviar WhatsApp</a>
        </div>
      `);
    });

    popup.document.write('</body></html>');
    popup.document.close();
  };

  const mostrarParcelasVencidas = () => {
    const hoje = new Date();
    const mensagensAtraso = [];

    clientes?.forEach(cliente => {
      cliente.emprestimos?.forEach(emp => {
        emp.parcelas?.forEach(p => {
          if (!p.vencimento || p.status !== 'pendente') return;
          const venc = new Date(p.vencimento);
          if (isNaN(venc.getTime())) return;

          if (venc < hoje) {
            const mensagem = `Olá ${cliente.nome}, sua parcela #${p.numero} no valor de R$ ${p.valor} venceu em ${p.vencimento}. Favor regularizar.`;
            mensagensAtraso.push({ texto: `⚠️ ${cliente.nome} - Parcela #${p.numero} • R$ ${p.valor} • Venc: ${p.vencimento}`, mensagem });
          }
        });
      });
    });

    if (mensagensAtraso.length === 0) return alert("✅ Nenhuma parcela vencida.");

    const popup = window.open('', 'ParcelasVencidas', 'width=500,height=600');
    popup.document.write('<html><head><title>Parcelas Vencidas</title></head><body style="font-family:sans-serif;background:#111;color:#D4AF37;padding:20px;">');
    popup.document.write('<h2>⚠️ Parcelas em Atraso</h2>');

    mensagensAtraso.forEach(m => {
      popup.document.write(`
        <div style="margin-bottom: 1.5rem; border-bottom: 1px solid #D4AF37; padding-bottom: 10px;">
          <p>${m.texto}</p>
          <a href='${gerarLinkWhatsapp(m.mensagem)}' target='_blank' style="color:#25D366;text-decoration:none;font-weight:bold;">📲 Enviar WhatsApp</a>
        </div>
      `);
    });

    popup.document.write('</body></html>');
    popup.document.close();
  };

  const resumo = {
    totalEmprestado: 0,
    totalRecebido: 0,
    totalPendente: 0,
    statusContagem: {},
    ...clientes.reduce(
      (acc, cliente) => {
        cliente.emprestimos?.forEach(emp => {
          acc.totalEmprestado += emp.valorEmprestado || 0;
          emp.parcelas.forEach(p => {
            const valor = p.valor || 0;
            if (p.status === 'paga' || p.status === 'pulado') acc.totalRecebido += valor;
            if (p.status === 'pendente') acc.totalPendente += valor;
          });
          acc.statusContagem[emp.status] = (acc.statusContagem[emp.status] || 0) + 1;
        });
        return acc;
      },
      { totalEmprestado: 0, totalRecebido: 0, totalPendente: 0, statusContagem: {} }
    ),
  };

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

        <div style={{ flex: 1 }}>
          <p style={textStyle}>💰 Total Emprestado: <strong>R$ {resumo.totalEmprestado.toFixed(2)}</strong></p>
          <p style={textStyle}>📥 Total Recebido: <strong>R$ {resumo.totalRecebido.toFixed(2)}</strong></p>
          <p style={textStyle}>⏳ Total Pendente: <strong>R$ {resumo.totalPendente.toFixed(2)}</strong></p>
          <p style={textStyle}>🔄 Total Esperado: <strong>R$ {(resumo.totalRecebido + resumo.totalPendente).toFixed(2)}</strong></p>
          <h4 style={{ color: '#D4AF37', marginTop: '1rem' }}>📘 Legenda Financeira Geral</h4>
          <p style={textStyle}>💼 Capital Investido: <strong>R$ {dadosFinanceiros.capitalInvestido?.toFixed(2)}</strong></p>
          <p style={textStyle}>📤 Pagos aos Investidores: <strong>R$ {dadosFinanceiros.totalPagoInvestidores?.toFixed(2)}</strong></p>
          <p style={textStyle}>📈 Total a Pagar (Investidores): <strong>R$ {dadosFinanceiros.totalAPagarInvestidores?.toFixed(2)}</strong></p>
          <p style={textStyle}>⏳ Falta Pagar aos Investidores: <strong>R$ {(dadosFinanceiros.totalAPagarInvestidores - dadosFinanceiros.totalPagoInvestidores).toFixed(2)}</strong></p>
        </div>

        <div style={{ flex: 1 }}>
          <h4 style={{ color: '#D4AF37' }}>🔐 Token Atual</h4>
          <p style={{ fontSize: '1.5rem', color: '#fff' }}>{tokenAtual}</p>
          <p style={{ fontSize: '0.9rem', color: '#888' }}>Use esse código para assinatura de contrato</p>
        </div>
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

