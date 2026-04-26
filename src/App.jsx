import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { LayoutGrid, Sliders, Zap, MessageCircle, RefreshCcw, Cake, Star, Clock, Send, X, Plus, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function App() {
  const [session, setSession] = useState(null)
  const [aba, setAba] = useState('pedidos')
  const [loading, setLoading] = useState(false)
  const [dados, setDados] = useState({ pedidos: [], feedbacks: [], aniversarios: [] })
  const [scripts, setScripts] = useState([])
  const [config, setConfig] = useState({})
  const [modal, setModal] = useState({ aberto: false, texto: '', fone: '' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_e, session) => setSession(session))
  }, [])

  const carregarTudo = useCallback(async () => {
    if (!session) return
    const { data: conf } = await supabase.from('lojistas').select('*').maybeSingle()
    const { data: scr } = await supabase.from('scripts').select('*')
    if (conf) setConfig(conf)
    if (scr) setScripts(scr)
  }, [session])

  useEffect(() => { carregarTudo() }, [carregarTudo])

  const sincronizar = async () => {
    setLoading(true)
    const res = await fetch('/.netlify/functions/api-bling', {
      method: 'POST', body: JSON.stringify({ access_token: config.access_token })
    })
    const r = await res.json()
    setDados(r)
    setLoading(false)
  }

  const prepararMsg = (p, base) => {
    const nome = (p.nome || p.contato?.nome || '').split(' ')[0]
    const msg = base.replace('{nome}', nome).replace('{pedido}', p.numero || '').replace('{data}', new Date(p.previsao || hoje).toLocaleDateString())
    setModal({ aberto: true, texto: msg, fone: (p.celular || p.contato?.celular || '').replace(/\D/g, '') })
  }

  if (!session) return <div className="bg-black min-h-screen text-orange-500 flex items-center justify-center font-black">AUTOCRM • ACESSO</div>

  return (
    <div className="min-h-screen bg-black text-white p-5 pb-32 font-sans uppercase">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-black italic tracking-tighter">AUTO<span className="text-orange-500">CRM</span></h1>
        <button onClick={sincronizar} className="bg-[#111] p-4 rounded-2xl border border-white/5"><RefreshCcw size={20} className={loading ? 'animate-spin' : ''} /></button>
      </header>

      <main className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {aba === 'pedidos' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-orange-600 p-8 rounded-[2.5rem] text-black font-black italic text-3xl leading-none">FLUXO</div>
              {dados.pedidos.map(p => (
                <div key={p.id} className="bg-[#111] p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                  <div className="flex justify-between font-black text-xs"><span>#{p.numero} - {p.nome}</span><span className="text-orange-500">{p.contatoAtual}/5</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    {scripts.map(s => <button key={s.id} onClick={() => prepararMsg(p, s.texto)} className="py-3 bg-white/5 rounded-xl text-[8px] font-black border border-white/10">{s.titulo}</button>)}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {aba === 'scripts' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-blue-600 p-8 rounded-[2.5rem] text-black font-black italic text-3xl leading-none">SCRIPTS</div>
              <button onClick={async () => {
                const titulo = prompt("Título do Script:");
                const texto = prompt("Texto (Use {nome}, {pedido}, {data}):");
                await supabase.from('scripts').insert({ user_id: session.user.id, titulo, texto });
                carregarTudo();
              }} className="w-full bg-white/5 p-5 rounded-3xl border border-dashed border-white/20 flex items-center justify-center gap-2 text-[10px] font-black"><Plus size={14}/> NOVO SCRIPT</button>
              {scripts.map(s => (
                <div key={s.id} className="bg-[#111] p-6 rounded-[2rem] border border-white/5 flex justify-between items-center">
                  <div className="text-[10px] font-black">{s.titulo}</div>
                  <button onClick={async () => { await supabase.from('scripts').delete().eq('id', s.id); carregarTudo(); }}><Trash2 size={16} className="text-red-500" /></button>
                </div>
              ))}
            </motion.div>
          )}
          {/* ... Abas Niver, Feedback e Config seguem lógica similar ... */}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-white/5 backdrop-blur-3xl border border-white/10 p-2 rounded-full flex justify-between z-50 shadow-2xl">
        {[{ id: 'pedidos', icon: LayoutGrid, label: 'FLUXO' }, { id: 'niver', icon: Cake, label: 'NIVER' }, { id: 'scripts', icon: MessageCircle, label: 'SCRIPTS' }, { id: 'config', icon: Sliders, label: 'SET' }].map(item => (
          <button key={item.id} onClick={() => setAba(item.id)} className={`flex-1 py-4 rounded-full flex flex-col items-center gap-1 transition-all ${aba === item.id ? 'bg-orange-600 text-black' : 'text-gray-500'}`}><item.icon size={18} /><span className="text-[7px] font-black italic">{item.label}</span></button>
        ))}
      </nav>

      {/* MODAL DE ENVIO */}
      {modal.aberto && (
        <div className="fixed inset-0 bg-black/98 z-[100] p-6 flex items-center justify-center uppercase">
          <div className="bg-[#111] w-full max-w-sm p-8 rounded-[3.5rem] border border-white/10 space-y-6">
            <div className="flex justify-between items-center text-orange-500 font-black italic text-xs"><span>EDITAR</span><button onClick={() => setModal({ aberto: false })}><X size={24}/></button></div>
            <textarea value={modal.texto} onChange={e => setModal({...modal, texto: e.target.value})} className="w-full h-56 bg-black border border-white/10 rounded-[2rem] p-6 text-sm text-gray-300 outline-none font-bold" />
            <button onClick={() => { window.open(`https://wa.me/${modal.fone}?text=${encodeURIComponent(modal.texto)}`); setModal({ aberto: false }) }} className="w-full bg-green-500 text-black py-6 rounded-[2rem] font-black text-sm active:scale-95 transition-all">DISPARAR WHATSAPP</button>
          </div>
        </div>
      )}
    </div>
  )
}