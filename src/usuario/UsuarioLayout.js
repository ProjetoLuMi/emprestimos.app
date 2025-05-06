import { Route, Routes } from 'react-router-dom';
import Investidor from '../Pages/Investidor'; // ajuste o caminho conforme necessário

export default function UsuarioLayout() {
  return (
    <Routes>
      <Route path="/investidor" element={<Investidor />} />
      {/* outras rotas de usuário, se houver */}
    </Routes>
  );
}
