// src/Pages/AdminInvestidor.js
import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from 'firebase/firestore';

export default function AdminInvestidor() {
  const [investidores, setInvestidores] = useState([]);
  const [colapsados, setColapsados] = useState([]);

  const buscarInvestidores = async () => {
    const snapshot = await getDocs(collection(db, 'investidores'));
    const lista = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    setInvestidores(lista);
  };

  useEffect(() => {
    buscarInvestidores();
  }, []);

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

  const editarParcela = async (investidorId, contratoIndex, parcelaIndex) => {
    const novoValor = prompt('Novo valor da parcela:');
    if (!novoValor || isNaN(novoValor)) return alert('Valor inválido.');

    const ref = doc(db, 'investidores', investidorId);
    const investidor = investidores.find(i => i.id === investidorId);
    const contratos = [...investidor.contratos];

    if (!contratos[contratoIndex].parcelasEditadas) {
      contratos[contratoIndex].parcelasEditadas = calcularParcelas(
        contratos[contratoIndex].valor,
        contratos[contratoIndex].meses,
        contratos[contratoIndex].juros,
        contratos[contratoIndex].dataInicio
      );
    }

    contratos[contratoIndex].parcelasEditadas[parcelaIndex].valor = Number(novoValor);
    await updateDoc(ref, { contratos });
    buscarInvestidores();
  };

  const editarTodasParcelas = async (investidorId, contratoIndex) => {
    const novoValor = prompt('Novo valor para todas as parcelas:');
    if (!novoValor || isNaN(novoValor)) return alert('Valor inválido.');

    const ref = doc(db, 'investidores', investidorId);
    const investidor = investidores.find(i => i.id === investidorId);
    const contratos = [...investidor.contratos];

    const parcelas = calcularParcelas(
      contratos[contratoIndex].valor,
      contratos[contratoIndex].meses,
      contratos[contratoIndex].juros,
      contratos[contratoIndex].dataInicio
    ).map((p) => ({ ...p, valor: Number(novoValor) }));

    contratos[contratoIndex].parcelasEditadas = parcelas;
    await updateDoc(ref, { contratos });
    buscarInvestidores();
  };

  const editarDataInicio = async (investidorId, contratoIndex) => {
    const novaData = prompt('Nova data de início (YYYY-MM-DD):');
    if (!novaData || isNaN(Date.parse(novaData))) return alert('Data inválida.');

    const ref = doc(db, 'investidores', investidorId);
    const investidor = investidores.find(i => i.id === investidorId);
    const contratos = [...investidor.contratos];
    contratos[contratoIndex].dataInicio = novaData;
    contratos[contratoIndex].parcelasEditadas = calcularParcelas(
      contratos[contratoIndex].valor,
      contratos[contratoIndex].meses,
      contratos[contratoIndex].juros,
      novaData
    );

    await updateDoc(ref, { contratos });
    buscarInvestidores();
  };

  const toggleColapso = (id) => {
    setColapsados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🔐 Admin Investidores</h2>
      {investidores.map((inv, idx) => (
        <div key={idx} style={{ marginBottom: 30, border: '1px solid #ccc', padding: 10 }}>
          <h3>{inv.nome}</h3>
          {inv.contratos?.map((c, i) => {
            const parcelas = c.parcelasEditadas || calcularParcelas(c.valor, c.meses, c.juros, c.dataInicio);
            const pagamentos = c.pagamentos || Array.from({ length: c.meses }, () => 'pendente');

            return (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Contrato #{i + 1}</strong>
                  <div>
                    <button onClick={() => toggleColapso(`${idx}-${i}`)}>
                      {colapsados.includes(`${idx}-${i}`) ? '🔽 Recolher' : '▶️ Expandir'}
                    </button>
                    <button onClick={() => editarTodasParcelas(inv.id, i)} style={{ marginLeft: 10 }}>✏️ Todas</button>
                    <button onClick={() => editarDataInicio(inv.id, i)} style={{ marginLeft: 10 }}>📆 Início</button>
                  </div>
                </div>
                {colapsados.includes(`${idx}-${i}`) && (
                  <>
                    <p>R$ {c.valor} • {c.meses} meses • {c.juros}% juros</p>
                    <h4>📅 Parcelas:</h4>
                    <table style={{ width: '60%', borderCollapse: 'collapse', backgroundColor: '#000', color: '#fff' }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Vencimento</th>
                          <th>Valor</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parcelas.map((p, j) => (
                          <tr key={j} style={{ backgroundColor: pagamentos[j] === 'pago' ? '#14532d' : '#000' }}>
                            <td>{p.numero}</td>
                            <td>{p.vencimento}</td>
                            <td>R$ {p.valor.toFixed(2)}</td>
                            <td>{pagamentos[j]}</td>
                            <td>
                              <button onClick={() => {
                                const senha = prompt('Senha admin:');
                                marcarParcela(inv.id, i, j, senha);
                              }}>✅</button>
                              <button onClick={() => {
                                const senha = prompt('Senha admin:');
                                desfazerParcela(inv.id, i, j, senha);
                              }} style={{ marginLeft: 10 }}>🔄</button>
                              <button onClick={() => editarParcela(inv.id, i, j)} style={{ marginLeft: 10 }}>✏️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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