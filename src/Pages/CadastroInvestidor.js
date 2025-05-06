import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function CadastroInvestidor() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [contatoEmergencia, setContatoEmergencia] = useState('');
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');

  const [valor, setValor] = useState(0);
  const [meses, setMeses] = useState(1);
  const [juros, setJuros] = useState(2);
  const [dadosGrafico, setDadosGrafico] = useState([]);

  useEffect(() => {
    const v = parseFloat(valor);
    const j = parseFloat(juros) / 100;

    const novoGrafico = Array.from({ length: meses }, (_, i) => {
      const acumulado = v * Math.pow(1 + j, i + 1);
      const lucro = acumulado - v;
      return {
        mes: `M${i + 1}`,
        investimento: v,
        lucro: lucro < 0 ? 0 : lucro,
      };
    });

    setDadosGrafico(novoGrafico);
  }, [valor, meses, juros]);

  const salvarInvestidor = async () => {
    if (!nome || !cpf || !telefone || !email || !endereco || !contatoEmergencia || !username || !senha) {
      alert('Preencha todos os dados.');
      return;
    }

    try {
      await addDoc(collection(db, 'investidores'), {
        nome,
        cpf,
        telefone,
        email,
        endereco,
        contatoEmergencia,
        username,
        senha,
        valorInvestido: parseFloat(valor),
        meses,
        juros,
        dataCadastro: new Date().toISOString()
      });
      alert('Investidor cadastrado com sucesso!');
      setNome('');
      setCpf('');
      setTelefone('');
      setEmail('');
      setEndereco('');
      setContatoEmergencia('');
      setUsername('');
      setSenha('');
      setValor(0);
      setMeses(1);
      setJuros(2);
    } catch (error) {
      console.error('Erro ao cadastrar investidor:', error);
      alert('Erro ao salvar.');
    }
  };

  return (
    <div style={{ padding: '2rem', color: '#fff' }}>
      <h2>📈 Cadastro de Investidor</h2>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input type="text" placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
          <input type="text" placeholder="CPF" value={cpf} onChange={e => setCpf(e.target.value)} />
          <input type="text" placeholder="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} />
          <input type="text" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input type="text" placeholder="Endereço" value={endereco} onChange={e => setEndereco(e.target.value)} />
          <input type="text" placeholder="Contato de Emergência" value={contatoEmergencia} onChange={e => setContatoEmergencia(e.target.value)} />
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} />
        </div>
      </div>

      <hr style={{ margin: '2rem 0', borderColor: '#444' }} />

      <h3>💸 Simulação de Investimento</h3>
      <input type="number" placeholder="Valor a investir (R$)" value={valor} onChange={e => setValor(e.target.value)} />

      <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {[...Array(12)].map((_, i) => (
          <button
            key={i}
            onClick={() => setMeses(i + 1)}
            style={{
              padding: '0.5rem',
              background: meses === i + 1 ? '#D4AF37' : '#222',
              color: meses === i + 1 ? '#000' : '#fff',
              border: '1px solid #D4AF37',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {i + 1} mês
          </button>
        ))}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {[...Array(15)].map((_, i) => (
          <button
            key={i}
            onClick={() => setJuros(i + 1)}
            style={{
              padding: '0.5rem',
              background: juros === i + 1 ? '#235D3A' : '#222',
              color: juros === i + 1 ? '#fff' : '#D4AF37',
              border: '1px solid #235D3A',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {i + 1}%
          </button>
        ))}
      </div>

      <button onClick={salvarInvestidor} style={{ background: '#D4AF37', color: '#000', padding: '0.75rem', border: 'none', borderRadius: '6px', marginTop: '1rem' }}>
        Salvar Investidor
      </button>

      {/* Gráfico abaixo do botão */}
      <div style={{ marginTop: '2rem', background: '#111', padding: '1rem', borderRadius: '10px' }}>
        <h4 style={{ color: '#D4AF37' }}>📊 Projeção de Rendimento</h4>
        <ResponsiveContainer width="75%" height={300}>
          <BarChart data={dadosGrafico} layout="vertical" margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <XAxis type="number" />
            <YAxis dataKey="mes" type="category" />
            <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
            <Bar dataKey="investimento" stackId="a" fill="#7D4F14" />
            <Bar dataKey="lucro" stackId="a" fill="#4CAF50">
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
