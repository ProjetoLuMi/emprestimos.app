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

const ParcelaQuadradinhos = ({ parcelas }) => {
  const [visiveis, setVisiveis] = useState([]);

  useEffect(() => {
    // Animação de entrada em cascata
    const interval = setInterval(() => {
      setVisiveis(prev => {
        if (prev.length < parcelas.length) {
          return [...prev, parcelas[prev.length]];
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 40);
    return () => clearInterval(interval);
  }, [parcelas]);

  const corStatus = (status) => {
    switch (status) {
      case 'paga': return '#28a745';     // Verde
      case 'vencida': return '#dc3545';  // Vermelho
      case 'pendente': return '#ffc107'; // Amarelo
      default: return '#ccc';
    }
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
      {visiveis.map(p => (
        <div
          key={p.numero}
          title={`Parcela ${p.numero} - ${p.status}`}
          style={{
            width: 42,
            height: 42,
            backgroundColor: corStatus(p.status),
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease-in-out',
            cursor: 'default'
          }}
        >
          {p.numero}
        </div>
      ))}
    </div>
  );
};



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

  const gerarParcelas = (c) => {
    const lista = [];
    const dataCriacao = new Date(c.criadoEm);
    const pagos = c.pagamentos || [];
    for (let i = 0; i < c.meses; i++) {
      const vencimento = new Date(dataCriacao);
      vencimento.setMonth(vencimento.getMonth() + i);
      const hoje = new Date();
      const isPaga = pagos.includes(i + 1);
      const isVencida = !isPaga && vencimento < hoje;
      const status = isPaga ? 'paga' : isVencida ? 'vencida' : 'pendente';
      lista.push({ numero: i + 1, status });
    }
    return lista;
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
      {investidor.contratos?.map((c, i) => (
        <div key={i} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 20 }}>
          <p><strong>Contrato #{i + 1}</strong> — R$ {c.valor} • {c.meses} meses • {c.juros}% juros • Total R$ {c.valor/c.juros * c.meses+c.valor}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <ParcelaQuadradinhos parcelas={gerarParcelas(c)} />

          </div>
        </div>
      ))}
    </div>
  );
}
