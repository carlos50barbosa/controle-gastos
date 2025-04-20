
// App.jsx
import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { format, parseISO, isSameMonth } from 'date-fns';
import './index.css';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ tipo: 'receita', valor: '', data: '', id: null });
  const [filtro, setFiltro] = useState({ tipo: 'todos', dataInicio: '', dataFim: '' });
  const [modoEdicao, setModoEdicao] = useState(false);

  useEffect(() => {
    const armazenadas = localStorage.getItem('transacoes');
    if (armazenadas) setTransactions(JSON.parse(armazenadas));
  }, []);

  useEffect(() => {
    localStorage.setItem('transacoes', JSON.stringify(transactions));
  }, [transactions]);

  const salvarTransacao = () => {
    if (!form.valor || !form.data) return;
    const nova = {
      ...form,
      id: form.id ?? Date.now()
    };
    const atualizadas = modoEdicao
      ? transactions.map(t => (t.id === form.id ? nova : t))
      : [...transactions, nova];
    setTransactions(atualizadas);
    setForm({ tipo: 'receita', valor: '', data: '', id: null });
    setModoEdicao(false);
  };

  const editar = (transacao) => {
    setForm(transacao);
    setModoEdicao(true);
  };

  const excluir = (id) => {
    const confirm = window.confirm('Tem certeza que deseja excluir?');
    if (confirm) setTransactions(transactions.filter(t => t.id !== id));
  };

  const totalMesAtual = transactions.filter(t => isSameMonth(parseISO(t.data), new Date())).reduce((acc, t) => {
    return t.tipo === 'receita' ? acc + parseFloat(t.valor) : acc - parseFloat(t.valor);
  }, 0);

  const transacoesFiltradas = transactions.filter(t => {
    const dataT = parseISO(t.data);
    const dataInicio = filtro.dataInicio ? parseISO(filtro.dataInicio) : null;
    const dataFim = filtro.dataFim ? parseISO(filtro.dataFim) : null;
    const tipoCond = filtro.tipo === 'todos' || t.tipo === filtro.tipo;
    const dataCond = (!dataInicio || dataT >= dataInicio) && (!dataFim || dataT <= dataFim);
    return tipoCond && dataCond;
  });

  const exportarCSV = () => {
    const csv = [
      ['Tipo', 'Valor', 'Data'],
      ...transacoesFiltradas.map(t => [t.tipo, t.valor, t.data])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'relatorio.csv');
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6">📊 Controle de Gastos</h1>

        <div className="text-xl text-center mb-6">
          Total do mês atual: <span className="font-bold text-green-600">R$ {totalMesAtual.toFixed(2)}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="border rounded p-2" />
          <input type="number" value={form.valor} placeholder="Valor" onChange={e => setForm({ ...form, valor: e.target.value })} className="border rounded p-2" />
          <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="border rounded p-2">
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
          <button onClick={salvarTransacao} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold p-2 rounded">
            {modoEdicao ? 'Atualizar' : 'Adicionar'}
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <input type="date" value={filtro.dataInicio} onChange={e => setFiltro({ ...filtro, dataInicio: e.target.value })} className="border rounded p-2" />
          <input type="date" value={filtro.dataFim} onChange={e => setFiltro({ ...filtro, dataFim: e.target.value })} className="border rounded p-2" />
          <select value={filtro.tipo} onChange={e => setFiltro({ ...filtro, tipo: e.target.value })} className="border rounded p-2">
            <option value="todos">Todos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
          <button onClick={exportarCSV} className="bg-green-600 hover:bg-green-700 text-white font-semibold p-2 rounded">
            Exportar CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2">Data</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transacoesFiltradas.map(t => (
                <tr key={t.id} className="text-center border-t">
                  <td>{format(parseISO(t.data), 'dd/MM/yyyy')}</td>
                  <td>{t.tipo}</td>
                  <td className={t.tipo === 'despesa' ? 'text-red-500' : 'text-green-600'}>
                    R$ {parseFloat(t.valor).toFixed(2)}
                  </td>
                  <td>
                    <button onClick={() => editar(t)} className="text-blue-500 hover:underline mr-2">Editar</button>
                    <button onClick={() => excluir(t.id)} className="text-red-500 hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
