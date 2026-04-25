import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import { LayoutGrid, Sliders, Zap, MessageCircle, RefreshCcw, Cake, Star, Clock, Send, X, ExternalLink, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const SCRIPTS = [
  { id: 1, label: '1. BOAS VINDAS', texto: 'Olá {nome}! 🚀 Pedido #{pedido} recebido. Previsão de entrega: {data}.' },
  { id: 2, label: '2. STATUS', texto: 'Oi {nome}, o pedido #{pedido} segue no cronograma para o dia {data}!' },
  { id: 3, label: '3. QUASE LÁ', texto: 'Oi {nome}! Pedido #{pedido} em fase final. Quase aí!' },
  { id: 4, label: 'NIVER', texto: 'Parabéns {nome}! 🎂 Hoje o dia é seu. Use o cupom CRM10 e comemore!' },
  { id: 5, label: 'FEEDBACK', texto: 'Oi {nome}! O que achou da sua compra #{pedido}? 😍 Use o cupom VOLTEI10!' }
]

export default function App() {
  const [session, setSession] = useState(null)
  const [aba, setAba] = useState('pedidos')
  const [loading, setLoading] = useState(false)
  const [dados, setDados] = useState({ pedidos: [], feedbacks: [], aniversarios: [] })
  const [config, setConfig] = useState({ client_id: '', client_secret: '', access_token: '' })
  const [modal, setModal] = useState({ aberto: false, texto: '', fone: '' })
  const [auth, setAuth] = useState({ email: '', password: '', isReg: false })
  
  const processedCode = useRef(false); // TRAVA DE SEGURANÇA CONTRA LOOPS

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_e, session) => setSession(session))
  }, [])

  const loadConfig = useCallback(async () => {
    if (!session) return
    const { data } = await supabase.from('lojistas').select('*').maybeSingle()
    if (data) setConfig(data)
  }, [session])

  useEffect(() => { loadConfig() }, [loadConfig])

  // LÓGICA DE CONEXÃO BLING (BLOQUEADA CONTRA LOOPS)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code && session && config.client_id && !processedCode.current) {
      processedCode.current = true; // TRAVA ATIVADA
      const exchange = async () => {
        setLoading(true)
        try {
          const res = await fetch('/.netlify/functions/api-bling', {
            method: 'POST',
            body: JSON.stringify({ code, client_id: config.client_id, client_secret: config.client_secret })
          })
          const r = await res.json()
          if (r.access_token) {
            await supabase.from('lojistas').upsert({ id: session.user.id, access_token: r.access_token })
            window.history.replaceState({}, '', '/')
            loadConfig()
          }
        } catch (e) { alert("Erro de conexão") }
        setLoading(false)
      }
      exchange()
    }
  }, [session, config, loadConfig])

  const sincronizar = async () => {
    if (!config.access_token) return alert("Autorize o Bling no SET")
    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/api-bling', {
        method: 'POST',
        body: JSON.stringify({ access_token: config.access_token })
      })
      const result = await res.json()
      setDados(result)
    } catch (e) { alert("Falha ao sincronizar") }
    setLoading(false)
  }

  const prepararMsg = (p, base) => {
    const dataFmt = p.previsao ? new Date(p.previsao).toLocaleDateString() : 'A DEFINIR'
    const msg = base.replace('{nome}', (p.nome || '').split(' ')[0]).replace('{pedido}', p.numero || '').replace('{data}', dataFmt)
    setModal({ aberto: true, texto: msg, fone: (p.celular || '').replace(/\D/g, '') })
  }

  if (!session) return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center p-8 font-sans uppercase">
      <Zap size={50} className="text-orange-500 fill-orange-500 mb-4" />
      <h1 className="text-white font-black italic text-4xl mb-10 tracking-tighter uppercase text-center leading-none">Auto<br/><span className="text-orange-500">CRM</span></h1>
      <form onSubmit={async (e) => {
        e.preventDefault(); setLoading(true)
        const { error } = auth.isReg ? await supabase.auth.signUp({ email: auth.email, password: auth.password }) : await supabase.auth.signInWithPassword({ email: auth.email, password: auth.password })
        if (error) alert(error.message); setLoading(false)
      }} className="bg-[#111] p-10 rounded-[3rem] w-full max-w-sm space-y-4 border border-white/5">
        <input type="email" placeholder="E-MAIL" value={auth.email} onChange={e => setAuth({...auth, email: e.target.value})} className="w-full p-5 bg-black border border-white/10 rounded-3xl text-white outline-none focus:border-orange-500" />
        <input type="password" placeholder="SENHA" value={auth.password} onChange={e => setAuth({...auth, password: e.target.value})} className="w-full p-5 bg-black border border-white/10 rounded-3xl text-white outline-none focus:border-orange-500" />
        <button className="w-full bg-orange-600 text-black font-black py-5 rounded-[2rem] active:scale-95 transition-all">{loading ? '...' : auth.isReg ? 'CADASTRAR' : 'ENTRAR'}</button>
        <button type="button" onClick={() => setAuth({...auth, isReg: !auth.isReg})} className="w-full text-[10px] text-gray-600 font-bold tracking-widest">{auth.isReg ? 'LOGAR' : 'CRIAR CONTA'}</button>
      </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white p-5 pb-40 font-sans uppercase tracking-tighter">
      <header className="flex justify-between items-center mb-10 max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-orange-500 fill-orange-500" />
          <h1 className="text-xl font-black italic">Auto<span className="text-orange-500">CRM</span></h1>
        </div>
        <button onClick={sincronizar} className="bg-[#111] p-4 rounded-2xl border border-white/10">
          <RefreshCcw size={20} className={loading ? 'animate-spin text-orange-500' : ''} />
        </button>
      </header>

      <main className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {aba === 'pedidos' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-orange-600 p-8 rounded-[2.5rem] text-black">
                <h2 className="text-4xl font-black italic uppercase leading-none tracking-tighter">FLUXO DE<br/>ENVIOS</h2>
              </div>
              {dados.pedidos.map(p => (
                <div key={p.id} className="bg-[#111] p-6 rounded-[3rem] border border-white/5 space-y-4">
                  <div className="flex justify-between">
                    <div><p className="text-orange-500 text-[10px] font-black italic">#{p.numero}</p><h4 className="text-xl font-black">{p.nome}</h4></div>
                    <div className="text-right"><p className="text-[11px] font-black">{new Date(p.previsao).toLocaleDateString()}</p></div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl flex items-center gap-2 border border-white/5 font-black text-[9px]">
                    <Clock size={14} className="text-orange-500" /> CONTATO {p.contatoAtual}/5 • {new Date(p.proxima).toLocaleDateString()}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SCRIPTS.slice(0, 3).map(s => (
                      <button key={s.id} onClick={() => prepararMsg(p, s.texto)} className="py-4 bg-white/5 rounded-2xl text-[9px] font-black border border-white/10 hover:bg-orange-600 transition-all italic">{s.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {aba === 'niver' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-pink-600 p-8 rounded-[2.5rem] text-black"><h2 className="text-4xl font-black italic">NIVERS</h2></div>
              {dados.aniversarios.map(a => (
                <div key={a.id} className="bg-[#111] p-6 rounded-[2.5rem] flex justify-between items-center">
                  <h4 className="text-lg font-black">{a.nome}</h4>
                  <button onClick={() => prepararMsg(a, SCRIPTS[3].texto)} className="bg-pink-600 p-4 rounded-2xl text-black shadow-lg shadow-pink-600/20"><Cake size={22} /></button>
                </div>
              ))}
            </motion.div>
          )}

          {aba === 'feedback' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-yellow-500 p-8 rounded-[2.5rem] text-black"><h2 className="text-4xl font-black italic">FEEDBACK</h2></div>
              {dados.feedbacks.map(f => (
                <div key={f.id} className="bg-[#111] p-6 rounded-[2.5rem] flex justify-between items-center">
                  <h4 className="text-lg font-black">{f.nome}</h4>
                  <button onClick={() => prepararMsg(f, SCRIPTS[4].texto)} className="bg-yellow-500 p-4 rounded-2xl text-black shadow-lg shadow-yellow-500/20"><Star size={22} /></button>
                </div>
              ))}
            </motion.div>
          )}

          {aba === 'config' && (
            <div className="bg-[#111] p-10 rounded-[3rem] border border-white/5 space-y-6">
              <input placeholder="CLIENT ID" value={config.client_id} onChange={e => setConfig({...config, client_id: e.target.value})} className="w-full p-5 bg-black border border-white/10 rounded-3xl text-orange-500 font-mono text-xs outline-none" />
              <input type="password" placeholder="CLIENT SECRET" value={config.client_secret} onChange={e => setConfig({...config, client_secret: e.target.value})} className="w-full p-5 bg-black border border-white/10 rounded-3xl text-orange-500 font-mono text-xs outline-none" />
              <button onClick={async () => { await supabase.from('lojistas').upsert({ id: session.user.id, client_id: config.client_id, client_secret: config.client_secret }); alert("Salvo!") }} className="w-full bg-white text-black font-black py-5 rounded-3xl text-[10px]">GUARDAR CHAVES</button>
              <a href={`https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${config.client_id}&state=123`} className="flex items-center justify-center gap-3 w-full bg-orange-600 text-black font-black py-5 rounded-3xl text-[10px]">AUTORIZAR <ExternalLink size={14} /></a>
              <button onClick={() => supabase.auth.signOut()} className="w-full text-gray-700 font-black text-[9px] pt-4 flex items-center justify-center gap-2 underline uppercase italic">Encerrar Sessão</button>
            </div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-white/5 backdrop-blur-3xl border border-white/10 p-2 rounded-full flex justify-between z-50">
        {[
          { id: 'pedidos', icon: LayoutGrid, label: 'FLUXO', color: 'bg-orange-600' },
          { id: 'niver', icon: Cake, label: 'NIVER', color: 'bg-pink-600' },
          { id: 'feedback', icon: Star, label: 'VENDA', color: 'bg-yellow-500' },
          { id: 'config', icon: Sliders, label: 'SET', color: 'bg-white' }
        ].map(item => (
          <button key={item.id} onClick={() => setAba(item.id)} className={`flex-1 py-4 rounded-full flex flex-col items-center gap-1 transition-all ${aba === item.id ? `${item.color} text-black scale-105` : 'text-gray-500'}`}><item.icon size={18} /><span className="text-[7px] font-black italic">{item.label}</span></button>
        ))}
      </nav>

      <AnimatePresence>
        {modal.aberto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[100] p-6 flex items-center justify-center uppercase">
            <div className="bg-[#111] w-full max-w-sm p-8 rounded-[3.5rem] border border-white/10 space-y-6">
              <div className="flex justify-between items-center text-orange-500 font-black italic text-xs tracking-widest"><span>REVISAR SCRIPT</span><button onClick={() => setModal({ aberto: false })}><X size={24}/></button></div>
              <textarea value={modal.texto} onChange={e => setModal({...modal, texto: e.target.value})} className="w-full h-56 bg-black border border-white/10 rounded-[2rem] p-6 text-sm text-gray-300 outline-none focus:border-orange-500 font-bold uppercase tracking-tighter" />
              <button onClick={() => { window.open(`https://wa.me/${modal.fone}?text=${encodeURIComponent(modal.texto)}`); setModal({ aberto: false }) }} className="w-full bg-green-500 text-black py-6 rounded-[2rem] font-black flex items-center justify-center gap-3 text-sm shadow-lg shadow-green-500/20 active:scale-95 transition-all uppercase">DISPARAR WHATSAPP <MessageCircle size={20} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}