import { useState, useEffect } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

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

const EXPIRY_DURATIONS = Array.from({ length: 30 }, (_, i) => {
  const days = i + 1
  return `${days} ${days === 1 ? 'Day' : 'Days'}`
})

function App() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    lendingPage: LENDING_PAGES[0].label,
    expiry: '30 Days',
  })
  const [addedClient, setAddedClient] = useState(null)
  const [copied, setCopied] = useState(false)
  const [clients, setClients] = useState([])

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/clients`)
      const data = await res.json()
      setClients(data)
    } catch (err) {
      console.error('Error fetching clients:', err)
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddClient = async () => {
    if (!form.name.trim() || !form.email.trim()) return

    const expiryDays = parseInt(form.expiry)
    const expires = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })

    const selectedPage = LENDING_PAGES.find(
      (p) => p.label === form.lendingPage
    )
    const accessUrl = selectedPage ? selectedPage.url : ''

    const clientData = {
      name: form.name,
      email: form.email,
      lendingPage: form.lendingPage,
      expiryDuration: form.expiry,
      expires: expires,
      accessUrl: accessUrl,
    }

    try {
      const res = await fetch(`${API_BASE_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      })

      if (res.ok) {
        const newClient = await res.json()
        setClients((prev) => [newClient, ...prev])
        setAddedClient({
          name: form.name,
          email: form.email,
          accessUrl: accessUrl,
        })
        setForm({
          name: '',
          email: '',
          lendingPage: LENDING_PAGES[0].label,
          expiry: '30 Days',
        })
      }
    } catch (err) {
      console.error('Error adding client:', err)
    }
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

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      if (res.ok) {
        setClients((prev) =>
          prev.map((c) => (c._id === id ? { ...c, status: 'approved' } : c))
        )
      }
    } catch (err) {
      console.error('Error approving client:', err)
    }
  }

  const handleDeactivate = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'deactivated' }),
      })
      if (res.ok) {
        setClients((prev) =>
          prev.map((c) => (c._id === id ? { ...c, status: 'deactivated' } : c))
        )
      }
    } catch (err) {
      console.error('Error deactivating client:', err)
    }
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
              className="expiry-select"
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
                <span>Client added successfully!</span>
              </div>
              <div className="access-row">
                <span className="check-icon">✅</span>
                <span>Email sent successfully!</span>
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

        <hr className="divider" />

        <div className="clients-section">
          <h2 className="section-title">Existing Clients</h2>
          <div className="clients-list">
            {clients.map((client) => (
              <div key={client._id} className="client-card">
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
                  {client.status === 'approved' ? (
                    <span className="status-active">Active</span>
                  ) : (
                    <button
                      className="btn-status"
                      onClick={() => handleApprove(client._id)}
                    >
                      Approve
                    </button>
                  )}
                  <button
                    className="btn-danger"
                    onClick={() => handleDeactivate(client._id)}
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
