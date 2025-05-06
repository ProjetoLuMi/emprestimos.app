// src/Pages/AdminInvestidor.js
import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function AdminInvestidor() {
  const [investidores, setInvestidores] = useState([]);
  const [senhaAdmin, setSenhaAdmin] = useState('');
  const [colapsados, setColapsados] = useState([]);

  const buscarInvestidores = async () => {
    const snapshot = await getDocs(collection(db, 'investidores'));
    const lista = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    setInvestidores(lista);
  };

  useEffect(() => {
    buscarInvestidores();
  }, []);

  const calcularParcelas = (valor, meses, juros) => {
    const parcelas = [];
    const parcelaBase = valor * Math.pow(1 + juros / 100, meses) / meses;
    const hoje = new Date();

    for (let i = 0; i < meses; i++) {
      const venc = new Date(hoje);
      venc.setMonth(hoje.getMonth() + i);
      parcelas.push({
        numero: i + 1,
        valor: Number(parcelaBase.toFixed(2)),
        vencimento: venc.toISOString().split('T')[0],
        status: 'pendente'
      });
    }
    return parcelas;
  };

  const marcarParcela = async (investidorId, contratoIndex, parcelaIndex, senha) => {
    if (senha !== 'admin123') return alert('Senha incorreta');
    const ref = doc(db, 'investidores', investidorId);
    const investidor = investidores.find(i => i.id === investidorId);
    const contratos = [...investidor.contratos];
    contratos[contratoIndex].pagamentos[parcelaIndex] = 'pago';
    await updateDoc(ref, { contratos });
    buscarInvestidores();
  };

  const desfazerParcela = async (investidorId, contratoIndex, parcelaIndex, senha) => {
    if (senha !== 'admin123') return alert('Senha incorreta');
    const ref = doc(db, 'investidores', investidorId);
    const investidor = investidores.find(i => i.id === investidorId);
    const contratos = [...investidor.contratos];
    contratos[contratoIndex].pagamentos[parcelaIndex] = 'pendente';
    await updateDoc(ref, { contratos });
    buscarInvestidores();
  };

  const toggleColapso = (id) => {
    setColapsados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const gerarGrafico = (valor, meses, juros) => {
    const data = [];
    let montante = valor;
    for (let i = 1; i <= meses; i++) {
      montante *= 1 + juros / 100;
      data.push({ mes: `${i}º`, lucro: montante - valor, total: montante });
    }
    return data;
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🔐 Admin Investidores</h2>
      {investidores.map((inv, idx) => (
        <div key={idx} style={{ marginBottom: 30, border: '1px solid #ccc', padding: 10 }}>
          <h3>{inv.nome}</h3>
          {inv.contratos?.map((c, i) => {
            const parcelas = c.pagamentos?.length === c.meses
              ? c.pagamentos
              : calcularParcelas(c.valor, c.meses, c.juros).map(p => p.status);
            return (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Contrato #{i + 1}</strong>
                  <button onClick={() => toggleColapso(`${idx}-${i}`)}>
                    {colapsados.includes(`${idx}-${i}`) ? '🔽 Recolher' : '▶️ Expandir'}
                  </button>
                </div>
                {colapsados.includes(`${idx}-${i}`) && (
                  <>
                    <p>R$ {c.valor} • {c.meses} meses • {c.juros}% juros</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={gerarGrafico(c.valor, c.meses, c.juros)} layout="vertical">
                        <XAxis type="number" />
                        <YAxis dataKey="mes" type="category" />
                        <Tooltip />
                        <Bar dataKey="total" stackId="a" fill="#8884d8" />
                        <Bar dataKey="lucro" stackId="a" fill="green" />
                      </BarChart>
                    </ResponsiveContainer>
                    <h4>📅 Parcelas:</h4>
                    {calcularParcelas(c.valor, c.meses, c.juros).map((p, j) => (
                      <div key={j}>
                        <p>
                          #{j + 1} • Venc: {p.vencimento} • R$ {p.valor} • Status: {c.pagamentos?.[j] || 'pendente'}
                          <button
                            onClick={() => {
                              const senha = prompt('Senha admin:');
                              marcarParcela(inv.id, i, j, senha);
                            }}
                            style={{ marginLeft: 10 }}>
                            ✅ Pagar
                          </button>
                          <button
                            onClick={() => {
                              const senha = prompt('Senha admin:');
                              desfazerParcela(inv.id, i, j, senha);
                            }}
                            style={{ marginLeft: 10 }}>
                            🔄 Desfazer
                          </button>
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
