import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ descricao: '', tipo: 'receita', categoria: '', valor: '', data: '', id: null });
  const [modoEdicao, setModoEdicao] = useState(false);
  const [idParaExcluir, setIdParaExcluir] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalLogout, setModalLogout] = useState(false);
  const [selecionadas, setSelecionadas] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    carregarTransacoes();
  }, []);

  const carregarTransacoes = async () => {
    const res = await fetch('http://localhost:3001/api/transacoes', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    setTransactions(data);
  };

  const salvar = async () => {
    const { descricao, valor, data, categoria } = form;
    if (!descricao || !valor || !data || !categoria) {
      toast.error('Preencha todos os campos antes de salvar!');
      return;
    }

    const metodo = form.id ? 'PUT' : 'POST';
    const url = form.id
      ? `http://localhost:3001/api/transacoes/${form.id}`
      : `http://localhost:3001/api/transacoes`;

    const res = await fetch(url, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      toast.success(metodo === 'POST' ? 'Transação adicionada com sucesso!' : 'Transação atualizada com sucesso!');
    } else {
      toast.error('Erro ao salvar transação!');
      return;
    }

    carregarTransacoes();
    setForm({ descricao: '', tipo: 'receita', categoria: '', valor: '', data: '', id: null });
    setModoEdicao(false);
  };

  const editar = (t) => {
    setForm({
      id: t.id,
      descricao: t.descricao,
      tipo: t.tipo,
      categoria: t.categoria,
      valor: t.valor,
      data: t.data.split('T')[0]
    });
    setModoEdicao(true);
  };

  const confirmarExclusao = (id) => {
    setIdParaExcluir(id);
    setModalAberto(true);
  };

  const excluir = async (id) => {
    try {
      const res = await fetch(`http://localhost:3001/api/transacoes/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + token
        }
      });

      if (!res.ok) {
        toast.error('Erro ao excluir transação');
        return;
      }

      toast.success('Transação excluída!');
      carregarTransacoes();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      toast.error('Erro ao excluir');
    }
  };

  const confirmar = () => {
    excluir(idParaExcluir);
    setModalAberto(false);
  };

  const cancelar = () => {
    setIdParaExcluir(null);
    setModalAberto(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const confirmarLogout = () => setModalLogout(true);
  const cancelarLogout = () => setModalLogout(false);
  const executarLogout = () => {
    logout();
    setModalLogout(false);
  };

  const toggleSelecionarTodas = () => {
    if (selecionadas.length === transactions.length) {
      setSelecionadas([]);
    } else {
      setSelecionadas(transactions.map(t => t.id));
    }
  };

  const toggleSelecionada = (id) => {
    setSelecionadas(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const excluirSelecionadas = async () => {
    if (selecionadas.length === 0) {
      toast.error('Nenhuma transação selecionada.');
      return;
    }

    const confirmar = window.confirm(`Excluir ${selecionadas.length} transações?`);
    if (!confirmar) return;

    const res = await fetch('http://localhost:3001/api/transacoes', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({ ids: selecionadas })
    });

    if (res.ok) {
      toast.success('Transações excluídas!');
      carregarTransacoes();
      setSelecionadas([]);
    } else {
      toast.error('Erro ao excluir selecionadas.');
    }
  };

  const exportarCSV = () => {
    const csv = [
      ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor'],
      ...transactions.map(t => [t.data, t.descricao, t.tipo, t.categoria, t.valor])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transacoes.csv';
    a.click();
  };

  const exportarJSON = () => {
    const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-transacoes.json';
    a.click();
  };

  const importarJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      toast.error('Arquivo inválido!');
      return;
    }

    for (const t of json) {
      if (!t.descricao || !t.valor || !t.data || !t.tipo || !t.categoria) {
        toast.error(`Transação inválida ignorada: ${t.descricao || 'sem descrição'}`);
        continue;
      }

      try {
        const res = await fetch('http://localhost:3001/api/transacoes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify(t)
        });

        if (!res.ok) {
          const erro = await res.json();
          toast.error(`Erro ao importar: ${erro?.error || 'Erro desconhecido'}`);
        }
      } catch (err) {
        console.error('Erro inesperado:', err);
        toast.error('Erro inesperado ao importar');
      }
    }

    toast.success('Importação concluída!');
    carregarTransacoes();
  };

  return (
    <div className="p-4 sm:p-6 overflow-hidden">
      <header className="flex justify-between items-center mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full mb-4 gap-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={excluirSelecionadas} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">Excluir selecionadas</button>
            <button onClick={exportarCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Exportar CSV</button>
            <button onClick={exportarJSON} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Exportar JSON</button>
            <label className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded cursor-pointer">
              Importar JSON
              <input type="file" accept=".json" onChange={importarJSON} className="hidden" />
            </label>
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <span role="img" aria-label="logo">📊</span> Controle de Gastos
        </h1>
        <button onClick={confirmarLogout} className="bg-red-500 text-white px-4 py-2 rounded">Sair</button>
      </header>

      {modoEdicao && (
        <div className="mb-2 text-sm text-yellow-700 bg-yellow-100 border border-yellow-300 px-4 py-2 rounded">
          ✏️ Editando: <strong>{form.descricao}</strong>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-6 mb-6">
        <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="border rounded p-2" />
        <input type="text" value={form.descricao} placeholder="Descrição" onChange={e => setForm({ ...form, descricao: e.target.value })} className="border rounded p-2" />
        <input type="number" value={form.valor} placeholder="Valor" onChange={e => setForm({ ...form, valor: e.target.value })} className="border rounded p-2" />
        <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="border rounded p-2">
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
        <input type="text" value={form.categoria} placeholder="Categoria" onChange={e => setForm({ ...form, categoria: e.target.value })} className="border rounded p-2" />
        <div className="flex gap-2">
          <button onClick={salvar} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold p-2 rounded">
            {modoEdicao ? 'Atualizar' : 'Adicionar'}
          </button>
          {modoEdicao && (
            <button onClick={() => {
              setForm({ descricao: '', tipo: 'receita', categoria: '', valor: '', data: '', id: null });
              setModoEdicao(false);
            }} className="bg-gray-400 hover:bg-gray-500 text-white font-semibold p-2 rounded">
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto border">
          <thead>
            <tr className="bg-gray-200">
              <th><input type="checkbox" onChange={toggleSelecionarTodas} checked={selecionadas.length === transactions.length && transactions.length > 0} /></th>
              <th className="p-2">Data</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} className="text-center border-t">
                <td><input type="checkbox" onChange={() => toggleSelecionada(t.id)} checked={selecionadas.includes(t.id)} /></td>
                <td>{format(parseISO(t.data), 'dd/MM/yyyy')}</td>
                <td>{t.descricao}</td>
                <td>{t.tipo}</td>
                <td>{t.categoria}</td>
                <td className={t.tipo === 'despesa' ? 'text-red-500' : 'text-green-600'}>
                  R$ {parseFloat(t.valor).toFixed(2)}
                </td>
                <td>
                  <button onClick={() => editar(t)} className="text-blue-500 hover:underline mr-2">Editar</button>
                  <button onClick={() => confirmarExclusao(t.id)} className="text-red-500 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-gray-500 p-4">
                  Nenhuma transação encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full text-center">
            <h2 className="text-lg font-semibold mb-4">Tem certeza que deseja excluir?</h2>
            <div className="flex justify-center gap-4">
              <button onClick={confirmar} className="bg-red-600 text-white px-4 py-2 rounded">Sim</button>
              <button onClick={cancelar} className="bg-gray-300 px-4 py-2 rounded">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalLogout && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full text-center">
            <h2 className="text-lg font-semibold mb-4">Tem certeza que deseja sair?</h2>
            <div className="flex justify-center gap-4">
              <button onClick={executarLogout} className="bg-red-600 text-white px-4 py-2 rounded">Sim</button>
              <button onClick={cancelarLogout} className="bg-gray-300 px-4 py-2 rounded">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
}
