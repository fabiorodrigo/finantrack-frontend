import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Pencil, Trash2 } from 'lucide-react';
import { NumericFormat } from 'react-number-format';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';

const API_URL = ""; // usar proxy no package.json
const CURRENCY_API = "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL";

const bandeiras = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  BTC: '₿'
};

function App() {
  const [cotacoes, setCotacoes] = useState({});
  const [historico, setHistorico] = useState([]);
  const [valor, setValor] = useState(0);
  const [moeda, setMoeda] = useState('USD');
  const [simulacoes, setSimulacoes] = useState([]);
  const [editando, setEditando] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [horaCotacao, setHoraCotacao] = useState('');
  const [aba, setAba] = useState('simulacoes');

  useEffect(() => {
    buscarSimulacoes();
    buscarCotacoes();
    buscarHistorico();
  }, []);

  const buscarCotacoes = async () => {
    const { data } = await axios.get(CURRENCY_API);
    setCotacoes({
      USD: parseFloat(data.USDBRL.high),
      EUR: parseFloat(data.EURBRL.high),
      BTC: parseFloat(data.BTCBRL.high),
    });
    const agora = new Date();
    setHoraCotacao(agora.toLocaleString('pt-BR'));
  };

  const buscarHistorico = async () => {
    const urls = [
      'https://economia.awesomeapi.com.br/json/daily/USD-BRL/7',
      'https://economia.awesomeapi.com.br/json/daily/EUR-BRL/7',
      'https://economia.awesomeapi.com.br/json/daily/BTC-BRL/7',
    ];
    const [usd, eur, btc] = await Promise.all(urls.map(url => axios.get(url)));
    const formatar = (arr, moeda) => arr.data.map(i => ({
      date: new Date(i.timestamp * 1000).toLocaleDateString('pt-BR'),
      [moeda]: parseFloat(i.high)
    }));
    const combinados = {};
    formatar(usd, 'USD').forEach(i => combinados[i.date] = { ...combinados[i.date], ...i });
    formatar(eur, 'EUR').forEach(i => combinados[i.date] = { ...combinados[i.date], ...i });
    formatar(btc, 'BTC').forEach(i => combinados[i.date] = { ...combinados[i.date], ...i });
    setHistorico(Object.values(combinados));
  };

  const buscarSimulacoes = async () => {
    const { data } = await axios.get(`${API_URL}/simulacoes`);
    setSimulacoes(data);
  };

  const salvarSimulacao = async () => {
    if (!valor || valor <= 0) {
      toast.error('Informe um valor válido maior que zero');
      return;
    }
    const cotacao = cotacoes[moeda];
    const convertido = valor / cotacao;
    try {
      if (editando) {
        await axios.put(`${API_URL}/simulacao/${editando}`, {
          moeda, valor_brl: valor, valor_convertido: convertido, cotacao
        });
        toast.success('Simulação atualizada com sucesso');
      } else {
        await axios.post(`${API_URL}/simulacao`, {
          moeda, valor_brl: valor, valor_convertido: convertido, cotacao
        });
        toast.success('Simulação criada com sucesso');
      }
      setValor(0);
      setEditando(null);
      buscarSimulacoes();
    } catch (e) {
      toast.error('Erro ao salvar a simulação');
    }
  };

  const deletarSimulacao = async (id) => {
    await axios.delete(`${API_URL}/simulacao/${id}`);
    toast.info('Simulação excluída');
    buscarSimulacoes();
  };

  const editarSimulacao = (s) => {
    setValor(s.valor_brl);
    setMoeda(s.moeda);
    setEditando(s.id);
  };

  const formatarMoeda = (valor, tipo) => {
    if (tipo === 'BRL') return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (tipo === 'USD') return `US$ ${valor.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (tipo === 'EUR') return `€ ${valor.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`;
    if (tipo === 'BTC') return `₿ ${valor.toFixed(6)}`;
    return valor;
  };

  const simulacoesFiltradas = simulacoes.filter(s => !filtro || s.moeda === filtro);

  return (
    <div className="app-container">
      <ToastContainer />
      <h1>💱 FinanTrack</h1>

      <nav className="menu-horizontal">
        <button className={aba === 'simulacoes' ? 'active-tab' : ''} onClick={() => setAba('simulacoes')}>
          💱 Simulações
        </button>
        <button className={aba === 'grafico' ? 'active-tab' : ''} onClick={() => setAba('grafico')}>
          📊 Histórico de Cotações
        </button>
      </nav>

      {aba === 'grafico' ? (
        <div style={{ height: 300, marginBottom: 30 }}>
          <h2 style={{ textAlign: 'center' }}>Histórico de Cotações (últimos 7 dias)</h2>
          <ResponsiveContainer>
            <LineChart data={historico} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="USD" stroke="#0088FE" name="USD" />
              <Line type="monotone" dataKey="EUR" stroke="#00C49F" name="EUR" />
              <Line type="monotone" dataKey="BTC" stroke="#FFBB28" name="BTC" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <NumericFormat
              thousandSeparator="."
              decimalSeparator=","
              prefix="R$ "
              allowNegative={false}
              decimalScale={2}
              fixedDecimalScale
              value={valor}
              onValueChange={({ floatValue }) => setValor(floatValue || 0)}
              placeholder="Valor em BRL"
              className="input-formatado"
            />

            <select value={moeda} onChange={(e) => setMoeda(e.target.value)}>
              <option value="USD">Dólar</option>
              <option value="EUR">Euro</option>
              <option value="BTC">Bitcoin</option>
            </select>

            <button onClick={salvarSimulacao}>
              {editando ? "Atualizar" : "Simular"}
            </button>

            {editando && (
              <button className="cancel" onClick={() => { setEditando(null); setValor(0); }}>
                Cancelar
              </button>
            )}
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ marginRight: 10 }}>Filtrar por moeda:</label>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todas</option>
              <option value="USD">Dólar</option>
              <option value="EUR">Euro</option>
              <option value="BTC">Bitcoin</option>
            </select>
          </div>


          <h2>Simulações</h2>

          {simulacoesFiltradas.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#888' }}>Nenhuma simulação cadastrada.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Valor em BRL</th>
                  <th>Moeda</th>
                  <th>Cotação</th>
                  <th>Convertido</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {simulacoesFiltradas.map((s) => (
                  <tr key={s.id}>
                    <td>{formatarMoeda(s.valor_brl, 'BRL')}</td>
                    <td>{bandeiras[s.moeda]} {s.moeda}</td>
                    <td>{formatarMoeda(s.cotacao, 'BRL')}</td>
                    <td>{formatarMoeda(s.valor_convertido, s.moeda)}</td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => editarSimulacao(s)} title="Editar">
                        <Pencil size={18} color="#1976d2" />
                      </button>
                      <button onClick={() => deletarSimulacao(s.id)} title="Excluir">
                        <Trash2 size={18} color="#d32f2f" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default App;
