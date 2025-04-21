import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#00C49F', '#FF8042'];

export default function GraficoGastos({ dados }) {
  const resumo = dados.reduce(
    (acc, t) => {
      const valor = parseFloat(t.valor);
      if (t.tipo === 'receita') acc.receita += valor;
      else acc.despesa += valor;
      return acc;
    },
    { receita: 0, despesa: 0 }
  );

  const data = [
    { name: 'Receitas', value: resumo.receita },
    { name: 'Despesas', value: resumo.despesa }
  ];

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            dataKey="value"
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
