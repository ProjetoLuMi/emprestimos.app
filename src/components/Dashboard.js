import React from 'react';

export default function Dashboard({ clientes }) {
  let totalEmprestado = 0;
  let totalRecebido = 0;
  let lucroTotal = 0;
  let qtdEmprestimos = 0;

  clientes.forEach(cliente => {
    if (cliente.emprestimos && cliente.emprestimos.length) {
      cliente.emprestimos.forEach(emprestimo => {
        totalEmprestado += emprestimo.valorEmprestado || 0;
        lucroTotal += emprestimo.lucroTotal || 0;
        qtdEmprestimos += 1;

        emprestimo.parcelas?.forEach(p => {
          if (p.status === 'paga') totalRecebido += p.valor;
        });
      });
    }
  });

  return (
    <div style={{
      background: '#111',
      border: '1px solid #D4AF37',
      borderRadius: '10px',
      padding: '1.5rem',
      boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)',
      marginBottom: '2rem'
    }}>
      <h3 style={{ marginBottom: '1rem', color: '#F6F1DE' }}>📊 Dashboard Geral</h3>
      <p>👥 Clientes: <strong>{clientes.length}</strong></p>
      <p>📄 Empréstimos Ativos: <strong>{qtdEmprestimos}</strong></p>
      <p>💰 Total Emprestado: <strong>R$ {totalEmprestado.toFixed(2)}</strong></p>
      <p>💸 Total Recebido: <strong>R$ {totalRecebido.toFixed(2)}</strong></p>
      <p>📈 Lucro Estimado: <strong>R$ {lucroTotal.toFixed(2)}</strong></p>
    </div>
  );
}
