import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [showSenha, setShowSenha] = useState(false);
  const [senha, setSenha] = useState('');

  const acessarUsuario = () => {
    navigate('/usuario/investidor');
  };

  const verificarSenhaAdmin = () => {
    if (senha === 'AGPCBV2025$') {
      navigate('/admin/visualizar-emprestimos');
    } else {
      alert('Senha incorreta');
    }
  };

  return (
    <div style={{ padding: '2rem', color: '#fff', textAlign: 'center' }}>
      <h2>🔐 Acesso ao Sistema</h2>
      <button onClick={acessarUsuario} style={{ margin: '1rem', padding: '1rem' }}>
        👤 Acessar como Usuário
      </button>

      {!showSenha ? (
        <button onClick={() => setShowSenha(true)} style={{ margin: '1rem', padding: '1rem' }}>
          🛠️ Acesso Admin
        </button>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <input
            type="password"
            placeholder="Digite a senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ padding: '0.5rem', marginRight: '1rem' }}
          />
          <button onClick={verificarSenhaAdmin}>Entrar</button>
        </div>
      )}
    </div>
  );
}
