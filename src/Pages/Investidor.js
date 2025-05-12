// src/Pages/Investidor.js
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  getDoc
} from 'firebase/firestore';

export default function InvestidorPage() {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [logado, setLogado] = useState(false);
  const [investidor, setInvestidor] = useState(null);
  const [token, setToken] = useState('');
  const [tokenAtual, setTokenAtual] = useState('');
  const [valor, setValor] = useState();
  const [meses, setMeses] = useState();
  const [juros, setJuros] = useState();

  const buscarInvestidor = async () => {
    const q = query(
      collection(db, 'investidores'),
      where('username', '==', username),
      where('senha', '==', senha)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const dados = querySnapshot.docs[0];
      setInvestidor({ ...dados.data(), id: dados.id });
      setLogado(true);
    } else {
      alert('Usuário ou senha incorretos.');
    }
  };

  const buscarTokenAtual = async () => {
    const docRef = doc(db, 'config', 'tokenAtual');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      setTokenAtual(snapshot.data().valor);
    }
  };

  useEffect(() => {
    if (logado) buscarTokenAtual();
  }, [logado]);

  const salvarContrato = async () => {
    if (token !== tokenAtual) {
      alert('Token inválido');
      return;
    }

    const novoContrato = {
      valor,
      meses,
      juros,
      pagamentos: [],
      criadoEm: new Date().toISOString()
    };

    const ref = doc(db, 'investidores', investidor.id);
    const atualizados = [...(investidor.contratos || []), novoContrato];
    await updateDoc(ref, { contratos: atualizados });

    const novoToken = Math.floor(100000 + Math.random() * 900000).toString();
    await updateDoc(doc(db, 'config', 'tokenAtual'), { valor: novoToken });

    setInvestidor({ ...investidor, contratos: atualizados });
    setToken('');
    await buscarTokenAtual();
    alert('Contrato assinado com sucesso!');
  };

  const atualizarContato = async (novoEmail, novoTelefone, senhaDigitada) => {
    if (senhaDigitada !== investidor.senha) return alert('Senha incorreta');
    const ref = doc(db, 'investidores', investidor.id);
    await updateDoc(ref, { email: novoEmail, telefone: novoTelefone });
    setInvestidor({ ...investidor, email: novoEmail, telefone: novoTelefone });
    alert('Contato atualizado.');
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

  const thStyle = {
    padding: '8px',
    borderBottom: '1px solid #D4AF37',
    background: '#222',
    textAlign: 'left'
  };

  const tdStyle = {
    padding: '8px',
    borderBottom: '1px solid #333'
  };

  if (!logado) {
    return (
      <div style={{ padding: 20 }}>
        <h2>🔐 Acesso Investidor</h2>
        <input placeholder="Username" onChange={e => setUsername(e.target.value)} /><br />
        <input placeholder="Senha" type="password" onChange={e => setSenha(e.target.value)} /><br />
        <button onClick={buscarInvestidor}>Entrar</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>📄 Dados do Investidor</h2>
      <p><strong>Nome:</strong> {investidor.nome}</p>
      <p><strong>Email:</strong> {investidor.email}</p>
      <p><strong>Telefone:</strong> {investidor.telefone}</p>
      <button onClick={() => {
        const email = prompt('Novo email:');
        const tel = prompt('Novo telefone:');
        const senhaConfirmar = prompt('Confirme sua senha:');
        atualizarContato(email, tel, senhaConfirmar);
      }}>✏️ Atualizar Contato</button>

      <h3 style={{ marginTop: 30 }}>💸 Nova Simulação</h3>
      <p><input placeholder="Valor (R$)" value={valor} onChange={e => setValor(Number(e.target.value))} /></p>
      <p><input placeholder="Meses (1 a 12)" value={meses} onChange={e => setMeses(Number(e.target.value))} /></p>
      <p><input placeholder="Juros (%)" value={juros} onChange={e => setJuros(Number(e.target.value))} /></p>
      <p><strong>Token necessário:</strong> </p>
      <input placeholder="Insira o token para assinar" value={token} onChange={e => setToken(e.target.value)} /><br />
      <button onClick={salvarContrato}>📝 Assinar Contrato</button>

      <h3 style={{ marginTop: 30 }}>📊 Tabela de Projeção de Ganhos</h3>
      <table style={{ width: '100%', background: '#111', color: '#D4AF37', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Mês</th>
            <th style={thStyle}>Lucro no mês</th>
            <th style={thStyle}>Lucro acumulado</th>
            <th style={thStyle}>Total previsto</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: meses }, (_, i) => {
            const lucroMes = (valor * juros) / 100;
            const acumulado = lucroMes * (i + 1);
            const total = valor + lucroMes * meses;

            return (
              <tr key={i}>
                <td style={tdStyle}>{`${i + 1}º`}</td>
                <td style={tdStyle}>R$ {lucroMes.toFixed(2)}</td>
                <td style={tdStyle}>R$ {acumulado.toFixed(2)}</td>
                <td style={tdStyle}>R$ {total.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3 style={{ marginTop: 40 }}>📚 Contratos</h3>
      {investidor.contratos?.map((c, i) => {
        const parcelas = c.parcelasEditadas || calcularParcelas(c.valor, c.meses, c.juros, c.dataInicio);
        const pagamentos = c.pagamentos || Array.from({ length: c.meses }, () => 'pendente');

        return (
          <div key={i} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 20 }}>
            <p><strong>Contrato #{i + 1}</strong> — R$ {c.valor} • {c.meses} meses • {c.juros}% juros</p>
            <h4>📅 Parcelas:</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#000', color: '#fff' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {parcelas.map((p, j) => (
                  <tr key={j} style={{ backgroundColor: pagamentos[j] === 'pago' ? '#14532d' : '#7f1d1d' }}>
                    <td>{p.numero}</td>
                    <td>{p.vencimento}</td>
                    <td>R$ {p.valor.toFixed(2)}</td>
                    <td>{pagamentos[j]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}