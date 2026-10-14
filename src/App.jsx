import { useState } from 'react'
import './App.css'

const LENDING_PAGES = [
  {
    label: 'Advance America Style Page',
    icon: '🏛️',
    url: 'https://loan-hub-usa-eight.vercel.app/advanceamerica-apply?token=umqirueuumv7rrzjy',
  },
  {
    label: 'Standard Apply Page',
    icon: '📋',
    url: 'https://loan-hub-usa-eight.vercel.app/standalone-apply?token=jhdv9aj5i3amv7rt704',
  },
  {
    label: 'Standard Approve Page',
    icon: '📋',
    url: 'https://loan-hub-usa-eight.vercel.app/standard-approve?token=1sm13f8wv65mv7rv323',
  },
]

const EXPIRY_DURATIONS = [
  '7 Days',
  '14 Days',
  '30 Days',
  '60 Days',
  '90 Days',
]

const initialClients = [
  {
    id: 1,
    name: 'harvinder singh',
    email: 'harvindersingh2@gmail.com',
    expires: '12/11/2026',
    status: 'pending',
    toRemove: true,
  },
  {
    id: 2,
    name: 'a',
    email: 'a@gmail.com',
    expires: '12/11/2026',
    status: 'approved',
    toRemove: false,
  },
  {
    id: 3,
    name: 'Demo',
    email: 'harvindr1993@gmail.com',
    expires: '12/11/2026',
    status: 'deactivated',
    toRemove: false,
  },
  {
    id: 4,
    name: 'a',
    email: 'a@gmail.com',
    expires: '12/11/2026',
    status: 'approved',
    toRemove: false,
  },
  {
    id: 5,
    name: 'demo',
    email: 'adkspd@gmail.com',
    expires: '12/11/2026',
    status: 'pending',
    toRemove: false,
  },
  {
    id: 6,
    name: 'demo',
    email: 'harvinder@gmail.com',
    expires: '12/11/2026',
    status: 'deactivated',
    toRemove: false,
  },
  {
    id: 7,
    name: 'APP',
    email: 'amritalliancesolar50@gmail.com',
    expires: '12/11/2026',
    status: 'pending',
    toRemove: false,
  },
  {
    id: 8,
    name: 'HS',
    email: 'avneet@gmail.com',
    expires: '12/11/2026',
    status: 'pending',
    toRemove: true,
  },
  {
    id: 9,
    name: 'a',
    email: 'a@gmail.com',
    expires: '12/11/2026',
    status: 'approved',
    toRemove: false,
  },
]

function App() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    lendingPage: LENDING_PAGES[0].label,
    expiry: '30 Days',
  })
  const [addedClient, setAddedClient] = useState(null)
  const [copied, setCopied] = useState(false)
  const [clients, setClients] = useState(initialClients)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddClient = () => {
    if (!form.name.trim() || !form.email.trim()) return
    const newClient = {
      id: Date.now(),
      name: form.name,
      email: form.email,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
      status: 'pending',
      toRemove: false,
    }
    setClients((prev) => [newClient, ...prev])
    const selectedPage = LENDING_PAGES.find(
      (p) => p.label === form.lendingPage
    )
    setAddedClient({
      name: form.name,
      email: form.email,
      accessUrl: selectedPage
        ? selectedPage.url
        : `https://loan-hub-usa-eight.vercel.app/client/${encodeURIComponent(
            form.email
          )}`,
    })
    setForm({
      name: '',
      email: '',
      lendingPage: LENDING_PAGES[0].label,
      expiry: '30 Days',
    })
  }

  const handleCopyUrl = async () => {
    if (!addedClient) return
    try {
      await navigator.clipboard.writeText(addedClient.accessUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      const textarea = document.createElement('textarea')
      textarea.value = addedClient.accessUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleApprove = (id) => {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'approved' } : c))
    )
  }

  const handleDeactivate = (id) => {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'deactivated' } : c))
    )
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Admin - Manage Clients</h1>

        <div className="form-card">
          <div className="form-group">
            <label>Client Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter client name"
            />
          </div>

          <div className="form-group">
            <label>Client Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Enter client email"
            />
          </div>

          <div className="form-group">
            <label>Lending Page</label>
            <select
              value={form.lendingPage}
              onChange={(e) => handleChange('lendingPage', e.target.value)}
            >
              {LENDING_PAGES.map((page) => (
                <option key={page.label} value={page.label}>
                  {page.icon} {page.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Token Expiry Duration</label>
            <select
              value={form.expiry}
              onChange={(e) => handleChange('expiry', e.target.value)}
            >
              {EXPIRY_DURATIONS.map((dur) => (
                <option key={dur} value={dur}>
                  {dur}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" onClick={handleAddClient}>
            Add Client
          </button>

          {addedClient && (
            <div className="access-box">
              <div className="access-row">
                <span className="check-icon">✅</span>
                <span>
                  Client access granted to <strong>{addedClient.name}</strong>
                </span>
              </div>
              <div className="access-row">
                <span className="check-icon">✅</span>
                <span>
                  Email sent to <strong>{addedClient.email}</strong>
                </span>
              </div>
              <div className="access-row">
                <span className="link-icon">🔗</span>
                <span className="access-url-label">Access URL:</span>
              </div>
              <div className="access-url">{addedClient.accessUrl}</div>
              <button className="btn btn-copy" onClick={handleCopyUrl}>
                {copied ? 'Copied!' : 'Copy URL to Clipboard'}
              </button>
            </div>
          )}
        </div>

        <div className="clients-section">
          <h2 className="section-title">Existing Clients</h2>
          <div className="clients-list">
            {clients.map((client) => (
              <div key={client.id} className="client-card">
                <div className="client-info">
                  <div className="client-name-row">
                    <span
                      className={`client-name ${
                        client.toRemove ? 'to-remove' : ''
                      }`}
                    >
                      {client.name}
                    </span>
                    {client.toRemove && (
                      <span className="remove-tag">remove</span>
                    )}
                  </div>
                  <div className="client-email">{client.email}</div>
                  <div className="client-expires">Expires: {client.expires}</div>
                </div>
                <div className="client-actions">
                  <button
                    className={`btn-status ${client.status === 'approved' ? 'active' : ''}`}
                    onClick={() => handleApprove(client.id)}
                  >
                    Approve
                  </button>
                  <button
                    className={`btn-danger ${client.status === 'deactivated' ? 'active' : ''}`}
                    onClick={() => handleDeactivate(client.id)}
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
