import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { LayoutGrid, Sliders, Zap, MessageCircle, RefreshCcw, Cake, Star, Clock, Send, X, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const SCRIPTS_BARBA = [
  { id: 1, titulo: '1. BOAS VINDAS', texto: 'Olá {nome}! 🚀 Recebemos seu pedido #{pedido}. Ele já está em preparação e a previsão de entrega é dia {data}. Qualquer dúvida, estou aqui!' },
  { id: 2, titulo: '2. ATUALIZAÇÃO', texto: 'Oi {nome}, tudo bem? Passando para te atualizar que seu pedido #{pedido} está seguindo o cronograma e deve chegar até o dia {data}!' },
  { id: 3, titulo: '3. QUASE LÁ', texto: 'Falta pouco {nome}! Seu pedido #{pedido} já está na fase final de entrega e logo estará com você.' },
  { id: 4, titulo: 'NIVER', texto: 'Parabéns {nome}! 🎂 Hoje o dia é seu, mas o presente é nosso: use o cupom NIVER10 e comemore com a gente!' },
  { id: 5, titulo: 'FEEDBACK', texto: 'Oi {nome}, o que achou da sua compra? 😍 Sua opinião é muito importante! Use o cupom VOLTEI10 para sua próxima visita.' }
]

export default function App() {
  const [session, setSession] = useState(null)
  const [aba, setAba] = useState('pedidos')
  const [loading, setLoading] = useState(false)
  const [dados, setDados] = useState({ pedidos: [], feedbacks: [], aniversarios: [] })
  const [config, setConfig] = useState({ client_id: '', client_secret: '', access_token: '' })
  const [modal, setModal] = useState({ aberto: false, texto: '', fone: '' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modoRegistro, setModoRegistro] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    const carregarConfig = async () => {
      const { data } = await supabase.from('lojistas').select('*').maybeSingle()
      if (data) setConfig(data)
    }
    if (session) carregarConfig()
    return () => subscription.unsubscribe()
  }, [session])

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code && config.client_id && config.client_secret) {
      handleExchangeCode(code)
    }
  }, [config.client_id, config.client_secret])

  const handleExchangeCode = async (code) => {
    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/api-bling', {
        method: 'POST',
        body: JSON.stringify({ code, client_id: config.client_id.trim(), client_secret: config.client_secret.trim() })
      })
      const data = await res.json()
      if (data.access_token) {
        await supabase.from('lojistas').upsert({ id: session.user.id, access_token: data.access_token, client_id: config.client_id, client_secret: config.client_secret })
        alert("Bling Autorizado!")
        window.location.search = '' 
      }
    } catch (e) { alert("Erro no Bling") }
    setLoading(false)
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (modoRegistro) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert("Conta criada! Já pode fazer login.")
        setModoRegistro(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) { alert(err.message) }
    setLoading(false)
  }

  const sincronizar = async () => {
    if (!config.access_token) return alert("Autorize o Bling na aba SET")
    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/api-bling', {
        method: 'POST',
        body: JSON.stringify({ access_token: config.access_token })
      })
      const result = await res.json()
      setDados(result)
    } catch (e) { alert("Erro ao sincronizar") }
    setLoading(false)
  }

  const prepararMensagem = (p, script) => {
    const dataFmt = p.previsao ? new Date(p.previsao).toLocaleDateString() : 'A DEFINIR'
    const texto = script.replace('{nome}', (p.nome || p.contato?.nome || 'CLIENTE').split(' ')[0]).replace('{pedido}', p.numero || '').replace('{data}', dataFmt)
    setModal({ aberto: true, texto, fone: (p.celular || p.contato?.celular || '').replace(/\D/g,'') })
  }

  if (!session) {
    return (
      <div className="bg-black min-h-screen flex flex-col items-center justify-center p-6 font-sans uppercase">
        <div className="w-full max-w-sm space-y-10">
          <div className="text-center space-y-2">
            <Zap className="text-orange-500 fill-orange-500 w-12 h-12 mx-auto" />
            <h1 className="text-4xl font-black italic tracking-tighter text-white">AUTO<span className="text-orange-500">CRM</span></h1>
            <p className="text-[10px] text-gray-600 font-black tracking-[0.4em] italic uppercase">Barba Negra System</p>
          </div>
          <form onSubmit={handleAuth} className="bg-[#111] p-8 rounded-[3rem] border border-white/5 space-y-4">
            <input type="email" placeholder="E-MAIL" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-3xl text-xs text-white outline-none focus:border-orange-500 font-bold" required />
            <input type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 bg-black border border-white/10 rounded-3xl text-xs text-white outline-none focus:border-orange-500 font-bold" required />
            <button type="submit" disabled={loading} className="w-full bg-orange-600 text-black font-black py-5 rounded-[2rem] text-[10px] tracking-widest shadow-lg shadow-orange-600/20 active:scale-95 transition-all">
              {loading ? 'AGUARDE...' : modoRegistro ? 'CADASTRAR' : 'ENTRAR'}
            </button>
            <button type="button" onClick={() => setModoRegistro(!modoRegistro)} className="w-full text-[9px] text-gray-500 font-black tracking-widest uppercase">
              {modoRegistro ? 'VOLTAR' : 'CRIAR CONTA'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-5 pb-32 font-sans uppercase">
      <header className="flex justify-between items-center mb-8 max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <Zap className="text-orange-500 fill-orange-500 w-5 h-5" />
          <h1 className="text-xl font-black italic">BARBA<span className="text-orange-500 font-black">NEGRA</span></h1>
        </div>
        <button onClick={sincronizar} className="bg-white/5 p-4 rounded-2xl border border-white/10">
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <main className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {aba === 'pedidos' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="fluxo" className="space-y-4">
              <div className="bg-orange-600 p-8 rounded-[2.5rem] text-black"><h2 className="text-3xl font-black italic leading-none uppercase">Fluxo de<br/>Envios</h2></div>
              {dados.pedidos?.map(p => (
                <div key={p.id} className="bg-[#111] p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div><p className="text-orange-500 text-[9px] font-black italic">#{p.numero}</p><h4 className="text-lg font-black">{p.nome}</h4></div>
                    <div className="text-right bg-black/40 p-2 rounded-xl border border-white/5"><p className="text-[10px] font-black italic">{new Date(p.previsao).toLocaleDateString()}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SCRIPTS_BARBA.slice(0, 3).map(s => (
                      <button key={s.id} onClick={() => prepararMensagem(p, s.texto)} className="py-3 bg-white/5 rounded-xl text-[8px] font-black border border-white/10 hover:bg-orange-600 transition-all italic">{s.titulo}</button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ABAS NIVER, FEEDBACK E CONFIG (SET) SEGUEM O MESMO PADRÃO... */}
          {aba === 'config' && (
            <div className="bg-[#111] p-10 rounded-[3rem] border border-white/5 space-y-6">
              <input placeholder="CLIENT ID" value={config.client_id} onChange={e => setConfig({...config, client_id: e.target.value})} className="w-full p-5 bg-black border border-white/10 rounded-3xl text-orange-500 font-mono text-xs outline-none" />
              <input type="password" placeholder="CLIENT SECRET" value={config.client_secret} onChange={e => setConfig({...config, client_secret: e.target.value})} className="w-full p-5 bg-black border border-white/10 rounded-3xl text-orange-500 font-mono text-xs outline-none" />
              <button onClick={async () => { await supabase.from('lojistas').upsert({ id: session.user.id, client_id: config.client_id.trim(), client_secret: config.client_secret.trim() }); alert("Salvo!"); }} className="w-full bg-white text-black font-black py-5 rounded-3xl uppercase text-[10px]">Guardar Chaves</button>
              <a href={`https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${config.client_id}&state=123`} target="_self" className="block text-center w-full bg-orange-600 text-black font-black py-5 rounded-3xl text-[10px] uppercase">Autorizar Bling</a>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* MODAL WHATSAPP */}
      <AnimatePresence>
        {modal.aberto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] p-6 flex items-center justify-center">
            <div className="bg-[#111] w-full max-w-sm p-8 rounded-[3rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center text-orange-500 font-black italic text-xs"><span>Script WhatsApp</span><button onClick={() => setModal({ aberto: false })}><X size={20}/></button></div>
              <textarea value={modal.texto} onChange={e => setModal({...modal, texto: e.target.value})} className="w-full h-48 bg-black border border-white/10 rounded-3xl p-5 text-sm text-gray-300 outline-none focus:border-orange-500 font-bold uppercase" />
              <button onClick={() => { window.open(`https://wa.me/${modal.fone}?text=${encodeURIComponent(modal.texto)}`); setModal({ aberto: false }); }} className="w-full bg-green-500 text-black py-5 rounded-[2.5rem] font-black flex items-center justify-center gap-3 text-[10px] uppercase">Enviar Agora <MessageCircle size={18} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-white/5 backdrop-blur-3xl border border-white/10 p-2 rounded-full flex justify-between z-50 shadow-2xl">
        {[{ id: 'pedidos', icon: LayoutGrid, label: 'Fluxo', color: 'bg-orange-600' }, { id: 'niver', icon: Cake, label: 'Niver', color: 'bg-pink-600' }, { id: 'feedback', icon: Star, label: 'Venda', color: 'bg-yellow-500' }, { id: 'config', icon: Sliders, label: 'Set', color: 'bg-white' }].map(item => (
          <button key={item.id} onClick={() => setAba(item.id)} className={`flex-1 py-4 rounded-full flex flex-col items-center gap-1 transition-all ${aba === item.id ? `${item.color} text-black scale-105 shadow-xl` : 'text-gray-500'}`}>
            <item.icon size={18} className={aba === item.id ? 'fill-current' : ''} />
            <span className="text-[7px] font-black italic uppercase">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}