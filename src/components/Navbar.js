import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  

  return (
    <div style={navStyle}>
      <button onClick={() => navigate('/Home')} style={navBtn}>🏠 Home</button>
      <button onClick={() => navigate('/admin/visualizar-emprestimos')} style={navBtn}>📋 Visualizar</button>
      <button onClick={() => navigate('/admin/cadastro-emprestimo')} style={navBtn}>💸 Empréstimo</button>
      <button onClick={() => navigate('/admin/cadastro-cliente')} style={navBtn}>➕ Cliente</button>
      <button onClick={() => navigate('/admin/cadastro-investidor')} style={navBtn}>🏦 Quero ser Investidor</button>
      <button onClick={() => navigate('/admin/admin-investidor')} style={navBtn}> Admin Investidor</button>
    </div>
  );
}

const navStyle = {
  background: 'linear-gradient(to right, #D4AF37, #F6F1DE)',
  color: '#000',
  padding: '1rem',
  display: 'flex',
  justifyContent: 'center',
  gap: '2rem',
  position: 'sticky',
  top: 0,
  zIndex: 999,
  boxShadow: '0 2px 10px rgba(212, 175, 55, 0.4)'
};

const navBtn = {
  background: '#000',
  color: '#F6F1DE',
  border: '1px solid #F6F1DE',
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 'bold'
};
