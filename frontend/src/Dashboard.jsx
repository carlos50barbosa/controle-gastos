import React, { useState, useEffect } from 'react';
import {
  format,
  parseISO,
  isSameDay,
  isSameWeek,
  isSameMonth
} from 'date-fns';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GraficoGastos from './components/GraficoGastos';
import { API } from './api';

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({
    descricao: '',
    tipo: 'receita',
    categoria: '',
    valor: '',
    data: '',
    id: null
  });
  const [modoEdicao, setModoEdicao] = useState(false);
  const [idParaExcluir, setIdParaExcluir] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalLogout, setModalLogout] = useState(false);
  const [selecionadas, setSelecionadas] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes');
  const token = localStorage.getItem('token');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarBotoes, setMostrarBotoes] = useState(false);  

  useEffect(() => {
    carregarTransacoes();
  }, []);

  const carregarTransacoes = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/transacoes`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    setTransactions(data);
  };

  const hoje = new Date();
  const transacoesFiltradas = transactions.filter(t => {
    const data = parseISO(t.data);
  
    const periodoValido =
      (filtroPeriodo === 'dia' && isSameDay(data, hoje)) ||
      (filtroPeriodo === 'semana' && isSameWeek(data, hoje)) ||
      (filtroPeriodo === 'mes' && isSameMonth(data, hoje)) ||
      (!filtroPeriodo && true);
  
    const tipoValido = filtroTipo === 'todos' || t.tipo === filtroTipo;
  
    const inicioValido = filtroDataInicio ? data >= parseISO(filtroDataInicio) : true;
    const fimValido = filtroDataFim ? data <= parseISO(filtroDataFim) : true;
  
    const categoriaValida = filtroCategoria ? t.categoria === filtroCategoria : true;
  
    return periodoValido && tipoValido && inicioValido && fimValido && categoriaValida;
  });
  

  const resumo = transacoesFiltradas.reduce(
    (acc, t) => {
      const valor = parseFloat(t.valor);
      if (t.tipo === 'receita') acc.receita += valor;
      else acc.despesa += valor;
      return acc;
    },
    { receita: 0, despesa: 0 }
  );
  const saldo = resumo.receita - resumo.despesa;

  const salvar = async () => {
    const { descricao, valor, data, categoria } = form;
    if (!descricao || !valor || !data || !categoria) {
      toast.error('Preencha todos os campos antes de salvar!');
      return;
    }

    const metodo = form.id ? 'PUT' : 'POST';
    const url = form.id
      ? `${API}/transacoes/${form.id}`
      : `${API}/transacoes`;

    const res = await fetch(url, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      toast.success(metodo === 'POST' ? 'Transação adicionada!' : 'Transação atualizada!');
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
    const res = await fetch(`${API}/transacoes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token }
    });

    if (res.ok) {
      toast.success('Transação excluída!');
      carregarTransacoes();
    } else {
      toast.error('Erro ao excluir transação.');
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

  const toggleSelecionarTodas = () => {
    if (selecionadas.length === transacoesFiltradas.length) {
      setSelecionadas([]);
    } else {
      setSelecionadas(transacoesFiltradas.map(t => t.id));
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

    const selectedIds = suasTransacoesSelecionadas.map(tx => tx.id);
    console.log('IDs a excluir:', selectedIds);

    const res = await fetch(`${import.meta.env.VITE_API_URL}/transacoes`, {
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
      ...transacoesFiltradas.map(t => [t.data, t.descricao, t.tipo, t.categoria, t.valor])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transacoes.csv';
    a.click();
  };

  const exportarJSON = () => {
    const blob = new Blob([JSON.stringify(transacoesFiltradas, null, 2)], { type: 'application/json' });
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
      try {
        const res = await fetch(`${API}/transacoes`, {
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
        toast.error('Erro inesperado ao importar');
      }
    }

    toast.success('Importação concluída!');
    carregarTransacoes();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-50 bg-white shadow-md p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <span role="img" aria-label="logo">📊</span> Controle de Gastos
          </h1>
          <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded">Sair</button>
        </div>

        <div className={`flex flex-wrap gap-2 justify-center sm:justify-start' ${!mostrarBotoes ? 'hidden' : ''} sm:flex`}>
          <button onClick={excluirSelecionadas} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">Excluir selecionadas</button>
          <button onClick={exportarCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Exportar CSV</button>
          <button onClick={exportarJSON} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Exportar JSON</button>
          <label className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded cursor-pointer">
            Importar JSON
            <input type="file" accept=".json" onChange={importarJSON} className="hidden" />
          </label>
        </div>

        <div className="sm:hidden flex justify-center mb-2">
        <button
          onClick={() => setMostrarBotoes(!mostrarBotoes)}
          className="bg-gray-700 text-white px-4 py-2 rounded"
        >
          {mostrarBotoes ? '✖' : '☰ Botões'}
        </button>
        </div>

        <div className="sm:hidden flex justify-center mb-2">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="bg-gray-700 text-white px-4 py-2 rounded"
          >
            {mostrarFiltros ? '✖' : '☰ Filtros'}
          </button>
        </div>

        <div className="sm:hidden flex justify-center mb-2">
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-gray-700 text-white px-4 py-2 rounded"
        >
          {mostrarFormulario ? '✖' : '☰ Formulário'}
        </button>
      </div>

      


        <div className={`flex flex-wrap gap-4 justify-center sm:justify-start ${!mostrarFiltros ? 'hidden' : ''} sm:flex`}>
          <div className={`flex flex-wrap gap-4 justify-center sm:justify-start'hidden' : ''} sm:flex`}>
            <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} className="border p-2 rounded">
              <option value="dia">Hoje</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mês</option>
            </select>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="border p-2 rounded">
              <option value="todos">Todos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>
          </div>
          

          <div className="flex flex-wrap gap-4 justify-center sm:justify-start mt-2">
            <input
              type="date"
              value={filtroDataInicio}
              onChange={e => setFiltroDataInicio(e.target.value)}
              className="border p-2 rounded"
              placeholder="De"
            />
            <input
              type="date"
              value={filtroDataFim}
              onChange={e => setFiltroDataFim(e.target.value)}
              className="border p-2 rounded"
              placeholder="Até"
            />
            <input
              type="text"
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              placeholder="Filtrar por categoria"
              className="border p-2 rounded"
            />
          

          <button
            onClick={() => {
              setFiltroDataInicio('');
              setFiltroDataFim('');
              setFiltroCategoria('');
              setFiltroPeriodo('mes');
              setFiltroTipo('todos');
            }}
            className="text-blue-600 underline mt-1 text-sm"
          >
            Limpar filtros personalizados
          </button>
          </div>
        </div>

        {modoEdicao && (
          <div className="text-sm text-yellow-700 bg-yellow-100 border border-yellow-300 px-4 py-2 rounded">
            ✏️ Editando: <strong>{form.descricao}</strong>
          </div>
        )}

        <div className={`grid gap-4 grid-cols-1 sm:grid-cols-6 ${!mostrarFormulario ? 'hidden' : ''} sm:grid`}>
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
      </header>

      <main className="p-4 sm:p-6 pt-8 space-y-6">
        <div className="bg-white rounded shadow p-4 text-center">
          <h2 className="text-lg font-semibold mb-2">Saldo</h2>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {saldo.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4 text-center">Resumo Financeiro</h2>
          <GraficoGastos dados={transacoesFiltradas} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border">
            <thead>
              <tr className="bg-gray-200">
                <th><input type="checkbox" onChange={toggleSelecionarTodas} checked={selecionadas.length === transacoesFiltradas.length && transacoesFiltradas.length > 0} /></th>
                <th className="p-2">Data</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transacoesFiltradas.map(t => (
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
                    <button onClick={() => {editar(t); setMostrarFormulario(true);}} className="text-blue-500 hover:underline mr-2">Editar</button>
                  </td>
                </tr>
              ))}
              {transacoesFiltradas.length === 0 && (
                <tr><td colSpan="7" className="text-center text-gray-500 p-4">Nenhuma transação encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
}
