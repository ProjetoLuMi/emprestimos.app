import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from '../components/Navbar'; // ajuste se o caminho da sua navbar for diferente
import VisualizarEmprestimos from '../Pages/VisualizarEmprestimos';
import CadastroEmprestimo from '../Pages/CadastroEmprestimo';
import CadastroCliente from '../Pages/CadastroCliente';
import CadastroInvestidor from '../Pages/CadastroInvestidor'; // ✅ este é o caminho correto



export default function AdminLayout() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="visualizar-emprestimos" element={<VisualizarEmprestimos />} />
        <Route path="cadastro-emprestimo" element={<CadastroEmprestimo />} />
        <Route path="cadastro-cliente" element={<CadastroCliente />} />
        <Route path="Cadastro-Investidor" element={<CadastroInvestidor />} />
      </Routes>
    </div>
  );
}
