import React, { useState } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function CadastroCliente() {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [email, setEmail] = useState('');
  const [contatoEmergencia, setContatoEmergencia] = useState('');

  const salvarCliente = async () => {
    try {
      await addDoc(collection(db, 'clientes'), {
        nome,
        telefone,
        cpf,
        endereco,
        email,
        contatoEmergencia
      });
      alert("Cliente salvo com sucesso!");
      setNome('');
      setTelefone('');
      setCpf('');
      setEndereco('');
      setEmail('');
      setContatoEmergencia('');
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      alert("Erro ao salvar cliente");
    }
  };

  return (
    <div style={container}>
      <h2>📝 Cadastrar Cliente</h2>

      <div style={formGroup}>
        <label>Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} style={input} placeholder="Nome completo" />
      </div>

      <div style={formGroup}>
        <label>Telefone</label>
        <input value={telefone} onChange={(e) => setTelefone(e.target.value)} style={input} placeholder="(99) 99999-9999" />
      </div>

      <div style={formGroup}>
        <label>CPF</label>
        <input value={cpf} onChange={(e) => setCpf(e.target.value)} style={input} placeholder="000.000.000-00" />
      </div>

      <div style={formGroup}>
        <label>Endereço</label>
        <input value={endereco} onChange={(e) => setEndereco(e.target.value)} style={input} placeholder="Rua, Número, Bairro" />
      </div>

      <div style={formGroup}>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={input} placeholder="email@email.com" />
      </div>

      <div style={formGroup}>
        <label>Contato de Emergência</label>
        <input value={contatoEmergencia} onChange={(e) => setContatoEmergencia(e.target.value)} style={input} placeholder="Nome e telefone do contato" />
      </div>

      <button onClick={salvarCliente} style={botao}>Salvar Cliente</button>
    </div>
  );
}

const container = {
  padding: '2rem',
  background: '#111',
  minHeight: '100vh',
  color: '#fff'
};

const formGroup = {
  marginBottom: '1rem',
  display: 'flex',
  flexDirection: 'column'
};

const input = {
  padding: '0.5rem',
  border: '1px solid #D4AF37',
  borderRadius: '8px',
  background: '#1C1C1C',
  color: '#fff',
  marginTop: '0.5rem'
};

const botao = {
  background: '#D4AF37',
  color: '#111',
  border: 'none',
  padding: '0.75rem 2rem',
  fontSize: '1rem',
  borderRadius: '10px',
  cursor: 'pointer',
  marginTop: '1rem'
};
