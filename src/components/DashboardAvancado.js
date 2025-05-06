// DashboardAvancado.js
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function DashboardAvancado({ clientes }) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tokenAtual, setTokenAtual] = useState('');

  const cores = ['#D4AF37', '#235D3A', '#7D4F14'];

  useEffect(() => {
    carregarTokenAtual();
  }, []);

  const carregarTokenAtual = async () => {
    const ref = doc(db, 'config', 'tokenAtual');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setTokenAtual(snap.data().valor);
    } else {
      gerarNovoToken();
    }
  };

  const gerarNovoToken = async () => {
    const novo = Math.floor(100000 + Math.random() * 900000).toString();
    await setDoc(doc(db, 'config', 'tokenAtual'), { valor: novo });
    setTokenAtual(novo);
  };

  const calcularResumo = () => {
    let totalEmprestado = 0;
    let totalRecebido = 0;
    let totalPendente = 0;

    const inicio = dataInicio ? new Date(dataInicio) : null;
    const fim = dataFim ? new Date(dataFim) : null;

    clientes?.forEach(cliente => {
      cliente.emprestimos?.forEach(emp => {
        const dataEmprestimo = new Date(emp.dataCriacao);
        if (inicio && dataEmprestimo < inicio) return;
        if (fim && dataEmprestimo > fim) return;

        totalEmprestado += parseFloat(emp.valorEmprestado || 0);

        emp.parcelas.forEach(p => {
          if (p.status === 'paga' || p.status === 'pulado') {
            totalRecebido += parseFloat(p.valor || 0);
          } else if (p.status === 'pendente') {
            totalPendente += parseFloat(p.valor || 0);
          }
        });
      });
    });

    return { totalEmprestado, totalRecebido, totalPendente };
  };

  const resumo = calcularResumo();

  const dadosGrafico = [
    { nome: 'Emprestado', valor: resumo.totalEmprestado },
    { nome: 'Recebido', valor: resumo.totalRecebido },
    { nome: 'Pendente', valor: resumo.totalPendente },
  ];

  const mostrarVencimentosHoje = () => {
    const hojeFormatado = new Date().toISOString().split('T')[0];
    const mensagensHoje = [];

    clientes?.forEach(cliente => {
      cliente.emprestimos?.forEach(emp => {
        emp.parcelas?.forEach(p => {
          const vencimentoFormatado = new Date(p.vencimento).toISOString().split('T')[0];
          if (vencimentoFormatado === hojeFormatado && p.status === 'pendente') {
            mensagensHoje.push({
              nome: cliente.nome,
              numero: p.numero,
              valor: p.valor,
              mensagem: `Olá ${cliente.nome}, lembrando que sua parcela #${p.numero} no valor de R$ ${p.valor} vence hoje.`
            });
          }
        });
      });
    });

    if (mensagensHoje.length === 0) return alert("✅ Nenhuma parcela pendente vence hoje.");

    const popup = window.open('', '', 'width=500,height=600');
    popup.document.write('<html><body style="background:#111;color:#D4AF37;padding:20px;">');
    popup.document.write('<h2>📅 Vencimentos de Hoje</h2>');
    mensagensHoje.forEach(m => {
      popup.document.write(`<p><strong>${m.nome}</strong> • Parcela #${m.numero} • R$ ${m.valor}<br/>💬 ${m.mensagem}</p><hr/>`);
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
          const venc = new Date(p.vencimento);
          const vencFormatado = venc.toISOString().split('T')[0];
          const hojeFormatado = hoje.toISOString().split('T')[0];

          if (p.status === 'pendente' && vencFormatado < hojeFormatado) {
            mensagensAtraso.push({
              nome: cliente.nome,
              numero: p.numero,
              valor: p.valor,
              vencimento: p.vencimento,
              mensagem: `Olá ${cliente.nome}, sua parcela #${p.numero} no valor de R$ ${p.valor} venceu em ${p.vencimento}. Favor regularizar.`
            });
          }
        });
      });
    });

    if (mensagensAtraso.length === 0) return alert("✅ Nenhuma parcela vencida.");

    const popup = window.open('', '', 'width=500,height=600');
    popup.document.write('<html><body style="background:#111;color:#D4AF37;padding:20px;">');
    popup.document.write('<h2>⚠️ Parcelas Atrasadas</h2>');
    mensagensAtraso.forEach(m => {
      popup.document.write(`<p><strong>${m.nome}</strong> • Parcela #${m.numero} • R$ ${m.valor} • Venc: ${m.vencimento}<br/>💬 ${m.mensagem}</p><hr/>`);
    });
    popup.document.write('</body></html>');
    popup.document.close();
  };

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
          {`${payload[0].name}: R$ ${payload[0].value.toFixed(2)}`}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', background: '#000', padding: '2rem', borderRadius: '12px', border: '1px solid #D4AF37' }}>
      <h2 style={{ color: '#D4AF37' }}>📊 Dashboard Avançado</h2>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ flex: 1 }}>
          <PieChart width={300} height={300}>
            <Pie
              data={dadosGrafico}
              dataKey="valor"
              nameKey="nome"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                const RADIAN = Math.PI / 180;
                const radius = 25 + innerRadius + (outerRadius - innerRadius);
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text
                    x={x}
                    y={y}
                    fill="#D4AF37"
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                    fontSize={12}
                  >
                    {(percent * 100).toFixed(0)}%
                  </text>
                );
              }}
            >
              {dadosGrafico.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={cores[index % cores.length]} />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
          </PieChart>
        </div>

        <div style={{ flex: 2 }}>
          <button onClick={mostrarVencimentosHoje} style={btnStyle}>📅 Ver vencimentos de hoje</button>
          <button onClick={mostrarParcelasVencidas} style={{ ...btnStyle, background: '#7D4F14', marginLeft: '1rem' }}>🔴 Ver Parcelas Atrasadas</button>

          <div style={{ marginTop: '1rem' }}>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inputStyle} />
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ color: '#F6F1DE', fontSize: '16px', lineHeight: '1.8', marginTop: '1rem' }}>
            <p><strong>Total Emprestado:</strong> R$ {resumo.totalEmprestado.toFixed(2)}</p>
            <p><strong>Total Recebido:</strong> R$ {resumo.totalRecebido.toFixed(2)}</p>
            <p><strong>Total Pendente:</strong> R$ {resumo.totalPendente.toFixed(2)}</p>
            <p><strong>Total Esperado:</strong> R$ {(resumo.totalPendente + resumo.totalRecebido).toFixed(2)}</p>
          </div>

          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#111', border: '1px dashed #D4AF37', borderRadius: '8px', width: 'fit-content' }}>
            <h4 style={{ color: '#D4AF37' }}>🔐 Token Atual</h4>
            <p style={{ fontSize: '1rem', color: '#fff' }}>{tokenAtual}</p>
            <p style={{ fontSize: '0.9rem', color: '#888' }}>Use esse código para assinatura de contrato</p>
          </div>
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
  cursor: 'pointer',
  marginBottom: '1rem'
};

const inputStyle = {
  marginRight: '1rem',
  padding: '0.5rem',
  background: '#111',
  color: '#D4AF37',
  border: '1px solid #D4AF37'
};
