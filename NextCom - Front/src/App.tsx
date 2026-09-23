import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MotionPanel } from '@/components/motion/MotionPanel'
import { NavButton } from '@/components/motion/NavButton'
import { useMotionPreferences, type MotionMode } from '@/components/motion/MotionPreferences'
import { useNextMotion, useRetainedValue } from '@/lib/motion'
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  FileBarChart2,
  Globe2,
  LayoutDashboard,
  Layers3,
  Link2,
  Menu,
  Megaphone,
  Moon,
  PanelLeftClose,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TooltipProvider } from '@/components/ui/tooltip'
import { GeoPerformanceMap } from '@/components/GeoPerformanceMap'
import { KpiCards } from '@/components/KpiCards'
import { PerformanceChart } from '@/components/PerformanceChart'
import { ChannelBreakdown } from '@/components/ChannelBreakdown'
import { CampaignTable } from '@/components/CampaignTable'
import { CountryFlag } from '@/components/CountryFlag'
import { CountryPerformanceDialog } from '@/components/CountryPerformanceDialog'
import { CountryDetailsDialog } from '@/components/CountryDetailsDialog'
import {
  channels,
  currency,
  dateLabel,
  dateOffset,
  decimal,
  exportCampaignCsv,
  geoFormat,
  geoLabels,
  getCountries,
  getRecords,
  ratio,
  sum,
  type ChannelFilter,
  type GeoMetric,
} from '@/lib/data'

type Modal = 'planner' | 'reports' | 'integrations' | 'settings' | 'help' | 'countries' | null
type Draft = { id: string; name: string; budget: string; date: string }
function readDrafts(): Draft[] {
  try {
    const raw = JSON.parse(localStorage.getItem('nextcom-drafts') || '[]')
    return Array.isArray(raw)
      ? raw.filter(
          (d) =>
            typeof d.id === 'string' &&
            typeof d.name === 'string' &&
            typeof d.budget === 'string' &&
            typeof d.date === 'string',
        )
      : []
  } catch {
    return []
  }
}
function Logo() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M7 24V8h4.5L21 19V8h4v16h-4.5L11 13v11H7Z" fill="currentColor" />
          <path d="m19 4 3-3 3 3-3 3-3-3Z" fill="currentColor" />
        </svg>
      </div>
      <span>
        NextCom<span className="brand-period">.</span>
      </span>
    </div>
  )
}

export default function App() {
  const { reduced, presence } = useNextMotion()
  const { mode: motionMode, setMode: setMotionMode } = useMotionPreferences()
  const [section, setSection] = useState('main')
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches)
  const [days, setDays] = useState(30),
    [channel, setChannel] = useState<ChannelFilter>('all')
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('nextcom-theme') === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })
  const [modal, setModal] = useState<Modal>(null),
    [sidebar, setSidebar] = useState(false)
  const [detailCountryId, setDetailCountryId] = useState<string | null>(null)
  const displayModal = useRetainedValue(modal)
  const [search, setSearch] = useState(''),
    [geoMetric, setGeoMetric] = useState<GeoMetric>('spend'),
    [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [countrySearch, setCountrySearch] = useState(''),
    [toast, setToast] = useState(''),
    [notificationRead, setNotificationRead] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>(readDrafts)
  const [draftName, setDraftName] = useState(''),
    [draftBudget, setDraftBudget] = useState(''),
    [draftDate, setDraftDate] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)')
    const update = () => {
      setMobile(media.matches)
      if (!media.matches) setSidebar(false)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const rows = useMemo(() => getRecords(days, channel), [days, channel])
  const totals = useMemo(() => sum(rows), [rows])
  const previous = useMemo(() => sum(getRecords(days, channel, true)), [days, channel])
  const countryData = useMemo(
    () => getCountries(rows).sort((a, b) => b[geoMetric] - a[geoMetric]),
    [rows, geoMetric],
  )
  const filteredCountries = countryData.filter((c) =>
    c.name.toLocaleLowerCase('pt-BR').includes(countrySearch.toLocaleLowerCase('pt-BR')),
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem('nextcom-theme', theme)
    } catch {
      /* O tema funciona sem armazenamento. */
    }
  }, [theme])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') setSidebar(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(timeout)
  }, [toast])
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  const exportData = () => {
    exportCampaignCsv(rows, days)
    setToast('Relatório demonstrativo exportado em CSV.')
  }
  const navigate = (id: string) => {
    setSection(id === 'campanhas' ? 'campanhas' : 'main')
    setSidebar(false)
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })
  }
  const openModal = (value: Modal) => {
    setSidebar(false)
    setModal(value)
  }
  const storeDrafts = (next: Draft[]) => {
    setDrafts(next)
    try {
      localStorage.setItem('nextcom-drafts', JSON.stringify(next))
      setToast('Planejamento salvo neste navegador.')
    } catch {
      setToast('Salvo apenas nesta sessão: armazenamento indisponível.')
    }
  }
  const renderCountryRows = (all = false) => (
    <div className="country-list">
      {(all ? filteredCountries : filteredCountries.slice(0, 5)).map((c, i) => (
        <motion.button
          layout={reduced ? false : 'position'}
          transition={presence.transition}
          className={`country-row ${selectedCountry === c.id ? 'selected' : ''}`}
          key={c.id}
          onClick={() => {
            setSelectedCountry(c.id)
            setDetailCountryId(c.id)
            if (all) {
              setModal(null)
              setTimeout(() => navigate('geografia'), 0)
            }
          }}
        >
          <span className="country-identity">
            <span className="country-rank">{String(i + 1).padStart(2, '0')}</span>
            <CountryFlag code={c.code} />
            <span>
              <strong>{c.name}</strong>
              <span className="country-progress">
                <i
                  style={{
                    width: `${ratio(c[geoMetric], Math.max(...countryData.map((d) => d[geoMetric]))) * 100}%`,
                  }}
                />
              </span>
            </span>
          </span>
          <span className="country-value">
            <strong>{geoFormat(geoMetric, c[geoMetric])}</strong>
            <small>{decimal(ratio(c.spend, totals.spend) * 100)}% do gasto</small>
          </span>
        </motion.button>
      ))}
      {filteredCountries.length === 0 && <p className="empty-country">Nenhum país encontrado.</p>}
    </div>
  )
  return (
    <TooltipProvider delayDuration={250}>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <div className="app-shell">
        <AnimatePresence>
          {sidebar && (
            <motion.button
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              className="sidebar-overlay"
              aria-label="Fechar navegação"
              onClick={() => setSidebar(false)}
            />
          )}
        </AnimatePresence>
        <aside
          inert={mobile && !sidebar}
          className={`sidebar ${sidebar ? 'open' : ''}`}
          aria-label="Navegação principal"
        >
          <div className="sidebar-brand">
            <Logo />
            <button
              className="mobile-close icon-button"
              onClick={() => setSidebar(false)}
              aria-label="Fechar menu"
            >
              <PanelLeftClose size={20} />
            </button>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button className="workspace">
                <span className="workspace-avatar">
                  N<span />
                </span>
                <span>
                  <strong>NextCorp Inc.</strong>
                  <small>Workspace pessoal</small>
                </span>
                <ChevronDown size={14} />
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-64">
              <div className="workspace-popover">
                <strong>NextCorp Inc.</strong>
                <span>Workspace de demonstração</span>
                <p>A gestão de contas e permissões será implementada após a validação do dashboard.</p>
              </div>
            </PopoverContent>
          </Popover>
          <span className="nav-label">WORKSPACE</span>
          <nav className="main-nav">
            <NavButton active={!modal && section === 'main'} onClick={() => navigate('main')}>
              <LayoutDashboard size={18} />
              Dashboard
              <span className="active-dot" />
            </NavButton>
            <NavButton active={!modal && section === 'campanhas'} onClick={() => navigate('campanhas')}>
              <Megaphone size={18} />
              Campanhas<span className="nav-count">5</span>
            </NavButton>
            <NavButton active={modal === 'planner'} onClick={() => openModal('planner')}>
              <CalendarDays size={18} />
              Planejamento
            </NavButton>
            <NavButton active={modal === 'reports'} onClick={() => openModal('reports')}>
              <FileBarChart2 size={18} />
              Relatórios
            </NavButton>
          </nav>
          <span className="nav-label connections-label">CONEXÕES</span>
          <nav className="main-nav">
            <NavButton active={modal === 'integrations'} onClick={() => openModal('integrations')}>
              <Link2 size={18} />
              Integrações<span className="nav-count">1</span>
            </NavButton>
            <button className="nav-item meta-nav" onClick={() => openModal('integrations')}>
              <span className="meta-logo">∞</span>Meta Ads<span className="demo-mini">DEMO</span>
            </button>
          </nav>
          <div className="sidebar-bottom">
            <div className="purpose-card">
              <div className="purpose-icon">
                <Sparkles size={18} />
              </div>
              <strong>Mais clareza. Mais impacto.</strong>
              <p>
                Inteligência para suas campanhas.
                <br />
                Gratuita, por propósito.
              </p>
              <button onClick={() => openModal('help')}>
                Conheça a NextCom <ArrowUpRight size={13} />
              </button>
            </div>
            <NavButton active={modal === 'settings'} onClick={() => openModal('settings')}>
              <Settings2 size={18} />
              Configurações
            </NavButton>
            <NavButton active={modal === 'help'} onClick={() => openModal('help')}>
              <CircleHelp size={18} />
              Ajuda e feedback
              <ArrowUpRight size={14} className="ml-auto" />
            </NavButton>
            <div className="sidebar-footer">
              <span className="corp-mark">N</span>
              <span>
                Uma iniciativa <strong>NextCorp Inc.</strong>
              </span>
              <span>v0.1</span>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="topbar-start">
              <button
                className="mobile-toggle icon-button"
                aria-label="Abrir menu"
                onClick={() => setSidebar(true)}
              >
                <Menu size={20} />
              </button>
              <span className="breadcrumb">
                Workspace <ChevronRight size={12} />
                <strong>Visão geral</strong>
              </span>
            </div>
            <div className="topbar-right">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="motion-control"
                    aria-label="Preferência de animações"
                    title={reduced ? 'Ativar animações completas' : 'Preferências de animação'}
                    onClick={() => {
                      if (reduced) setMotionMode('full')
                    }}
                  >
                    <Sparkles size={15} />
                    <span>{reduced ? 'Ativar animações' : 'Animações ativas'}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <strong>Animações da interface</strong>
                  <p className="muted text-xs mt-2 mb-3">
                    {reduced
                      ? 'Os efeitos estão reduzidos. Escolha Completas para ver todas as interações.'
                      : 'Defina como botões, menus e transições se movimentam.'}
                  </p>
                  <Select value={motionMode} onValueChange={(v) => setMotionMode(v as MotionMode)}>
                    <SelectTrigger aria-label="Modo de animação">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Completas</SelectItem>
                      <SelectItem value="system">Seguir sistema</SelectItem>
                      <SelectItem value="reduced">Reduzidas</SelectItem>
                    </SelectContent>
                  </Select>
                </PopoverContent>
              </Popover>
              <div className="global-search">
                <Search size={15} />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate('campanhas')
                  }}
                  placeholder="Buscar campanhas..."
                  aria-label="Busca global de campanhas"
                />
                <kbd>
                  <Command size={10} /> K
                </kbd>
                <AnimatePresence>
                  {search && (
                    <motion.div key="search-results" {...presence} className="search-popover">
                      <button onClick={() => navigate('campanhas')}>
                        <Search size={15} />
                        <span>Ver campanhas com “{search}”</span>
                        <ArrowRight size={14} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="topbar-divider" />
              <button
                className="icon-button theme-toggle"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={theme}
                    className="theme-glyph"
                    initial={{ opacity: 0, rotate: reduced ? 0 : -35, scale: reduced ? 1 : 0.7 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: reduced ? 0 : 35, scale: reduced ? 1 : 0.7 }}
                    transition={{ duration: reduced ? 0 : 0.12 }}
                  >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                  </motion.span>
                </AnimatePresence>
              </button>
              <Popover
                onOpenChange={(open) => {
                  if (open) setNotificationRead(true)
                }}
              >
                <PopoverTrigger asChild>
                  <button className="icon-button notification-button" aria-label="Notificações">
                    <Bell size={18} />
                    {!notificationRead && <i />}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="notification-popover">
                  <strong>Você está por dentro</strong>
                  <p>Seu workspace de demonstração está pronto.</p>
                  <div>
                    <span className="purpose-icon">
                      <Sparkles size={16} />
                    </span>
                    <span>
                      <strong>Bem-vindo à NextCom</strong>
                      <small>Explore os filtros e descubra seus dados por uma nova perspectiva.</small>
                    </span>
                  </div>
                  <small>Nenhuma conta Meta está conectada.</small>
                </PopoverContent>
              </Popover>
              <div className="topbar-divider" />
              <Popover>
                <PopoverTrigger asChild>
                  <button className="profile-button">
                    <span className="profile-avatar">NC</span>
                    <span>
                      <strong>NextCorp</strong>
                      <small>Workspace pessoal</small>
                    </span>
                    <ChevronDown size={13} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-60">
                  <div className="workspace-popover">
                    <strong>Perfil de demonstração</strong>
                    <p>Você está explorando a primeira versão do dashboard NextCom.</p>
                    <Button variant="outline" onClick={() => openModal('settings')}>
                      Preferências
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>
          <main id="main">
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span /> SEU PRÓXIMO RESULTADO COMEÇA AQUI
                </div>
                <h1>
                  Dashboard<span>.</span>
                </h1>
                <p>Uma visão clara das suas campanhas. Cada detalhe, uma oportunidade.</p>
              </div>
              <div className="heading-actions">
                <span className="demo-indicator">
                  <span />
                  Dados demonstrativos
                </span>
                <Button className="export-button" onClick={exportData}>
                  <ArrowDownToLine size={15} />
                  Exportar dados
                </Button>
              </div>
            </div>
            <div className="filter-bar">
              <div className="filter-left">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="account-filter">
                      <span className="meta-logo">∞</span>
                      <span>Conta de demonstração</span>
                      <ChevronDown size={13} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-72">
                    <div className="workspace-popover">
                      <strong>
                        Conta de demonstração <Check size={14} />
                      </strong>
                      <p>Dados fictícios em BRL. Nenhuma conta de anúncios conectada.</p>
                      <Button variant="outline" onClick={() => openModal('integrations')}>
                        <Link2 size={14} />
                        Ver integração Meta
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <span className="filter-divider" />
                <Select value={channel} onValueChange={(v) => setChannel(v as ChannelFilter)}>
                  <SelectTrigger aria-label="Filtrar canal" className="channel-filter">
                    <Layers3 size={14} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os canais</SelectItem>
                    {channels.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {channel !== 'all' && (
                  <button
                    className="reset-filter"
                    onClick={() => setChannel('all')}
                    aria-label="Limpar filtro de canal"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="filter-right">
                <span className="period-comparison">Comparado ao período anterior</span>
                <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
                  <SelectTrigger aria-label="Período do dashboard" className="date-filter">
                    <CalendarDays size={14} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="14">Últimos 14 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
                <span className="date-range">{dateLabel(dateOffset(-days + 1))} — 23 set, 2026</span>
              </div>
            </div>
            <KpiCards total={totals} previous={previous} />
            <div className="primary-grid">
              <PerformanceChart rows={rows} />
              <ChannelBreakdown rows={rows} onSelect={setChannel} />
            </div>
            <div className="geography-grid" id="geografia">
              <GeoPerformanceMap
                data={countryData}
                metric={geoMetric}
                onMetricChange={setGeoMetric}
                selectedCountry={selectedCountry}
                onCountrySelect={setSelectedCountry}
              />
              <MotionPanel className="panel countries-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      Principais países <span className="count-badge">12</span>
                    </h2>
                    <p>Uma perspectiva além das fronteiras.</p>
                  </div>
                  <Globe2 size={17} className="muted" />
                </div>
                <div className="country-table-head">
                  <span>País</span>
                  <span>{geoLabels[geoMetric]}</span>
                </div>
                {renderCountryRows()}
                <button
                  className="all-countries"
                  onClick={() => {
                    setCountrySearch('')
                    openModal('countries')
                  }}
                >
                  Explorar todos os países <ArrowRight size={14} />
                </button>
              </MotionPanel>
            </div>
            <div className="insight-strip">
              <div className="insight-icon">
                <Sparkles size={18} />
              </div>
              <div>
                <strong>Seu investimento tem um mundo de possibilidades.</strong>
                <span>
                  O Brasil representa{' '}
                  {decimal(ratio(countryData.find((c) => c.code === 'BR')!.spend, totals.spend) * 100)}% do
                  gasto. Compare o custo por resultado entre países antes de redistribuir o orçamento.
                </span>
              </div>
              <button
                onClick={() => {
                  setCountrySearch('')
                  openModal('countries')
                }}
              >
                Explorar países <ArrowUpRight size={15} />
              </button>
            </div>
            <CampaignTable rows={rows} search={search} onSearchChange={setSearch} />
            <footer className="page-footer">
              <span>
                © 2026 NextCom <span>by NextCorp Inc.</span>
              </span>
              <span>
                <ShieldCheck size={13} />
                Feito para dar mais sentido aos seus dados.
              </span>
              <button onClick={() => openModal('help')}>
                Sobre o projeto <ArrowUpRight size={12} />
              </button>
            </footer>
          </main>
        </div>
      </div>
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null)
        }}
      >
        <DialogContent className={displayModal === 'countries' ? 'countries-dialog' : ''}>
          {displayModal !== 'countries' && (
            <DialogHeader>
              <DialogTitle>
                {displayModal === 'planner'
                  ? 'Planeje o próximo passo'
                  : displayModal === 'reports'
                    ? 'Seus dados, com você'
                    : displayModal === 'integrations'
                      ? 'Conecte suas fontes de dados'
                      : displayModal === 'settings'
                        ? 'Do seu jeito'
                        : 'Clareza que gera possibilidades'}
              </DialogTitle>
              <DialogDescription>
                {displayModal === 'planner'
                  ? 'Organize ideias de campanha. Rascunhos ficam salvos apenas neste navegador.'
                  : displayModal === 'reports'
                    ? 'Exporte um retrato das suas campanhas com os filtros atuais.'
                    : displayModal === 'integrations'
                      ? 'A Meta será a primeira integração da NextCom.'
                      : displayModal === 'settings'
                        ? 'Personalize a experiência do seu dashboard.'
                        : 'Uma iniciativa gratuita e sem fins lucrativos da NextCorp Inc.'}
              </DialogDescription>
            </DialogHeader>
          )}
          {displayModal === 'planner' && (
            <>
              <form
                className="planner-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!draftName.trim()) return
                  storeDrafts([
                    ...drafts,
                    { id: crypto.randomUUID(), name: draftName.trim(), budget: draftBudget, date: draftDate },
                  ])
                  setDraftName('')
                  setDraftBudget('')
                  setDraftDate('')
                }}
              >
                <label>
                  Nome da campanha
                  <input
                    required
                    maxLength={100}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Ex.: Lançamento da coleção"
                  />
                </label>
                <div className="form-two-col">
                  <label>
                    Orçamento planejado (R$)
                    <input
                      type="number"
                      min="1"
                      max="100000000"
                      step="0.01"
                      required
                      value={draftBudget}
                      onChange={(e) => setDraftBudget(e.target.value)}
                      placeholder="1.000,00"
                    />
                  </label>
                  <label>
                    Data de início
                    <input
                      type="date"
                      required
                      value={draftDate}
                      onChange={(e) => setDraftDate(e.target.value)}
                    />
                  </label>
                </div>
                <Button type="submit">
                  <Plus size={15} />
                  Salvar rascunho
                </Button>
              </form>
              <div className="draft-list">
                <AnimatePresence initial={false}>
                  {drafts.length === 0 ? (
                    <motion.div key="empty-drafts" {...presence} className="draft-empty">
                      <CalendarDays size={22} />
                      <p>Grandes resultados começam com um plano.</p>
                      <small>Seu primeiro rascunho aparecerá aqui.</small>
                    </motion.div>
                  ) : (
                    drafts.map((d) => (
                      <motion.div
                        layout={reduced ? false : 'position'}
                        {...presence}
                        className="draft-row"
                        key={d.id}
                      >
                        <span>
                          <strong>{d.name}</strong>
                          <small>
                            {currency(Number(d.budget))} · {dateLabel(d.date)} · Rascunho local
                          </small>
                        </span>
                        <button
                          className="icon-button"
                          aria-label={`Excluir rascunho ${d.name}`}
                          onClick={() => storeDrafts(drafts.filter((item) => item.id !== d.id))}
                        >
                          <X size={15} />
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
              <p className="text-xs muted">Nenhuma campanha será publicada ou enviada à Meta.</p>
            </>
          )}
          {displayModal === 'reports' && (
            <>
              <div className="report-preview">
                <FileBarChart2 size={28} />
                <div>
                  <strong>Relatório de campanhas</strong>
                  <span>{dateLabel(dateOffset(-days + 1))} — 23 set, 2026</span>
                  <small>{channel === 'all' ? 'Todos os canais' : channel} · 5 campanhas · CSV</small>
                </div>
                <span className="demo-mini">DEMO</span>
              </div>
              <p className="muted text-sm">
                Inclui valor gasto, resultados, CPA, valor de conversão, ROAS e CTR. Os números usam os mesmos
                filtros do dashboard.
              </p>
              <Button onClick={exportData}>
                <ArrowDownToLine size={15} />
                Baixar relatório CSV
              </Button>
            </>
          )}
          {displayModal === 'integrations' && (
            <>
              <div className="integration-card">
                <span className="meta-logo">∞</span>
                <div>
                  <strong>Meta Ads</strong>
                  <span>Facebook · Instagram · Audience Network</span>
                </div>
                <span className="planned-badge">Em preparação</span>
              </div>
              <div className="info-box">
                <Activity size={17} />
                <p>
                  Você está usando dados demonstrativos. A autenticação e a sincronização com a API da Meta
                  serão implementadas na próxima etapa.
                </p>
              </div>
              <p className="muted text-sm">
                A NextCom foi pensada para reunir novas plataformas no futuro, mantendo uma visão independente
                de cada fonte de dados.
              </p>
              <div className="future-platforms">
                <span>
                  Google Ads <small>Futuro</small>
                </span>
                <span>
                  TikTok Ads <small>Futuro</small>
                </span>
              </div>
            </>
          )}
          {displayModal === 'settings' && (
            <>
              <div className="settings-row">
                <span>
                  <strong>Tema escuro</strong>
                  <small>Conforto visual para suas sessões de análise.</small>
                </span>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  aria-label="Tema escuro"
                />
              </div>
              <div className="settings-row">
                <span>
                  <strong>Idioma e moeda</strong>
                  <small>Português (Brasil) · Real brasileiro (BRL)</small>
                </span>
                <span className="planned-badge">Padrão</span>
              </div>
              <p className="text-xs muted">Sua preferência de tema é salva neste navegador.</p>
            </>
          )}
          {displayModal === 'countries' && (
            <CountryPerformanceDialog
              data={countryData}
              metric={geoMetric}
              onMetricChange={setGeoMetric}
              selectedCountry={selectedCountry}
              days={days}
              channel={channel}
              onSelect={(id) => {
                setSelectedCountry(id)
                setDetailCountryId(id)
              }}
            />
          )}
          {displayModal === 'help' && (
            <>
              <div className="about-brand">
                <Logo />
                <span>by NextCorp Inc.</span>
              </div>
              <p className="about-copy">
                Mais organização. Análises mais precisas. Decisões mais conscientes. A NextCom nasceu para
                tornar o planejamento e a análise de anúncios acessíveis a quem precisa.
              </p>
              <div className="info-box">
                <Target size={19} />
                <p>
                  Esta é a primeira etapa: um dashboard interativo com dados de demonstração. Explore os
                  períodos, canais, países e campanhas.
                </p>
              </div>
              <p className="muted text-sm">
                Projeto sem fins lucrativos. A integração com dados reais da Meta e novos recursos de análise
                virão nas próximas etapas.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
      <CountryDetailsDialog
        country={countryData.find((country) => country.id === detailCountryId)}
        rows={rows}
        days={days}
        channel={channel}
        fromRanking={modal === 'countries'}
        onClose={() => setDetailCountryId(null)}
      />
      <div className="toast-positioner">
        <AnimatePresence>
          {toast && (
            <motion.div key="toast" {...presence} className="toast" role="status">
              <span>
                <Check size={15} />
              </span>
              {toast}
              <button onClick={() => setToast('')} aria-label="Fechar aviso">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
}
