// src/components/ParcelasVisual.js
import { useState, useEffect } from 'react';

const ParcelasVisual = ({ parcelas }) => {
  const [visiveis, setVisiveis] = useState([]);
  const [valorPendente, setValorPendente] = useState(0);

  useEffect(() => {
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

  useEffect(() => {
    const total = parcelas
      .filter(p => p.status === 'pendente' || p.status === 'vencida')
      .reduce((acc, p) => acc + Number(p.valor || 0), 0);
    setValorPendente(total);
  }, [parcelas]);

  const corStatus = (status) => {
    switch (status) {
      case 'paga': return '#28a745';     // Verde
      case 'vencida': return '#dc3545';  // Vermelho
      case 'pendente': return '#ffc107'; // Amarelo
      default: return '#ccc';
    }
  };

  const formatarData = (dataStr) => {
    const d = new Date(dataStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div style={{ marginTop: 15 }}>
      <p><strong>💰 Valor pendente a receber:</strong> R$ {valorPendente.toFixed(2)}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {visiveis.map((p, idx) => (
          <div
            key={idx}
            title={`Parcela ${p.numero}\nVenc: ${formatarData(p.vencimento)}\nStatus: ${p.status}\nValor: R$ ${p.valor}`}
            style={{
              width: 90,
              height: 90,
              backgroundColor: corStatus(p.status),
              color: '#fff',
              fontWeight: 'bold',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              transition: 'all 0.2s ease-in-out',
              padding: 5,
              textAlign: 'center',
              fontSize: '12px',
              lineHeight: '1.2',
              cursor: 'default'
            }}
          >
            <div>#{p.numero}</div>
            <div>{formatarData(p.vencimento)}</div>
            <div>R$ {p.valor}</div>
            <div style={{ fontSize: 10 }}>{p.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParcelasVisual;
