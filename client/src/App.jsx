import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://loan-form-6s6o.onrender.com/api'

function validateForm(form) {
  const errors = {}
  if (!form.name.trim()) {
    errors.name = 'Client name is required.'
  } else if (form.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  }
  if (!form.email.trim()) {
    errors.email = 'Client email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Please enter a valid email address.'
  }
  if (!form.phone.trim()) {
    errors.phone = 'Phone number is required.'
  } else if (!/^[+0-9\s\-()]{7,20}$/.test(form.phone.trim())) {
    errors.phone = 'Please enter a valid phone number (at least 7 digits).'
  }
  return errors
}


const LENDING_PAGES = [
  {
    label: 'Advance America Style Page',
    icon: '🏛️',
    url: 'https://loanendignpages-landing-1.vercel.app/?token=abc123xyz789def456ghi',
  },
  {
    label: 'Standard Apply Page',
    icon: '📋',
    url: 'https://loanendignpages-landing-2.vercel.app/?token=jkl789mno456pqr123stu',
  },
  {
    label: 'Standard Approve Page',
    icon: '📋',
    url: 'https://loanendignpages-landing-3.vercel.app/?token=vwx456yza123bcd789efg',
  },
  {
    label: 'Advance Confirmation Page',
    icon: '🎯',
    url: 'https://loanendignpages-landing-4.vercel.app/?token=hij890klm567nop234qrs',
  },
]

const EXPIRY_DURATIONS = Array.from({ length: 30 }, (_, i) => {
  const days = i + 1
  return `${days} ${days === 1 ? 'Day' : 'Days'}`
})

function getInitial(name) {
  return name ? name.trim().charAt(0).toUpperCase() : '?'
}

// Custom dropdown that always opens downward
function ExpiryDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="custom-dropdown" ref={ref}>
      <button
        type="button"
        className="custom-dropdown-trigger"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{value}</span>
        <svg
          className={`dropdown-arrow ${open ? 'open' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ul className="custom-dropdown-list">
          {EXPIRY_DURATIONS.map((dur) => (
            <li
              key={dur}
              className={`custom-dropdown-item ${value === dur ? 'selected' : ''}`}
              onClick={() => {
                onChange(dur)
                setOpen(false)
              }}
            >
              {dur}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function App() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    lendingPage: LENDING_PAGES[0].label,
    expiry: '30 Days',
  })
  const [addedClient, setAddedClient] = useState(null)
  const [copied, setCopied] = useState(false)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/clients`)
      if (!res.ok) {
        console.error(`Server error: ${res.status}`)
        setClients([])
        return
      }
      const data = await res.json()
      setClients(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching clients:', err)
      setClients([])
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const newErrors = validateForm({ ...form })
    setErrors((prev) => ({ ...prev, [field]: newErrors[field] || '' }))
  }

  const handleAddClient = async () => {
    const newErrors = validateForm(form)
    setErrors(newErrors)
    setTouched({ name: true, email: true, phone: true })
    if (Object.keys(newErrors).length > 0) return
    setLoading(true)

    const expiryDays = parseInt(form.expiry)
    const expiresDate = new Date()
    expiresDate.setDate(expiresDate.getDate() + expiryDays)
    const expires = expiresDate.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })

    const selectedPage = LENDING_PAGES.find((p) => p.label === form.lendingPage)
    const accessUrl = selectedPage ? selectedPage.url : ''
    const tokenMatch = accessUrl.match(/[?&]token=([^&]+)/)
    const token = tokenMatch ? tokenMatch[1] : ''

    const clientData = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      lendingPage: form.lendingPage,
      expiryDuration: form.expiry,
      expires: expires,
      accessUrl: accessUrl,
      token: token,
    }

    setSubmitError('')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch(`${API_BASE_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const newClient = await res.json()
        setClients((prev) => [newClient, ...prev])
        setAddedClient({
          name: form.name,
          email: form.email,
          phone: form.phone,
          lendingPage: form.lendingPage,
          accessUrl: accessUrl,
          token: newClient.token || token,
          emailSent: newClient.emailSent,
          emailError: newClient.emailError
        })
        setForm({
          name: '',
          email: '',
          phone: '',
          lendingPage: LENDING_PAGES[0].label,
          expiry: '30 Days',
        })
        setErrors({})
        setTouched({})
      } else {
        const errData = await res.json().catch(() => ({}))
        setSubmitError(errData.error || 'Server error: Failed to add client.')
      }
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('Error adding client:', err)
      if (err.name === 'AbortError') {
        setSubmitError('Server took too long to respond (timeout). Render server may be waking up, please try again.')
      } else {
        setSubmitError('Failed to connect to the server. Please check your internet or server status.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUrl = async () => {
    if (!addedClient) return
    try {
      await navigator.clipboard.writeText(addedClient.accessUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed', err)
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
        setClients((prev) => prev.map((c) => (c._id === id ? { ...c, status: 'approved' } : c)))
      }
    } catch (err) {
      console.error('Error approving:', err)
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
        setClients((prev) => prev.map((c) => (c._id === id ? { ...c, status: 'deactivated' } : c)))
      }
    } catch (err) {
      console.error('Error deactivating:', err)
    }
  }

  return (
    <div className="page">
      <div className="container">

        {/* ── CLIENT FORM ── */}
        <div className="form-card">
          <div className="card-title card-title-center">
            Admin Panel
          </div>

          {/* Client Name */}
          <div className="form-group">
            <label htmlFor="client-name">Client Name</label>
            <input
              id="client-name"
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="Enter client name"
              className={touched.name && errors.name ? 'input-error' : ''}
            />
            {touched.name && errors.name && (
              <span className="error-msg">⚠ {errors.name}</span>
            )}
          </div>

          {/* Client Email */}
          <div className="form-group">
            <label htmlFor="client-email">Client Email</label>
            <input
              id="client-email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="Enter client email"
              className={touched.email && errors.email ? 'input-error' : ''}
            />
            {touched.email && errors.email && (
              <span className="error-msg">⚠ {errors.email}</span>
            )}
          </div>

          {/* Client Phone */}
          <div className="form-group">
            <label htmlFor="client-phone">Phone Number</label>
            <input
              id="client-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              placeholder="Enter phone number"
              className={touched.phone && errors.phone ? 'input-error' : ''}
            />
            {touched.phone && errors.phone && (
              <span className="error-msg">⚠ {errors.phone}</span>
            )}
          </div>

          {/* Lending Page */}
          <div className="form-group">
            <label htmlFor="lending-page">Lending Page</label>
            <div className="select-wrapper">
              <select
                id="lending-page"
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
          </div>

          {/* Token Expiry — Custom dropdown (always opens down) */}
          <div className="form-group">
            <label>Token Expiry Duration</label>
            <ExpiryDropdown
              value={form.expiry}
              onChange={(val) => handleChange('expiry', val)}
            />
          </div>

          {/* Submit */}
          <button
            id="add-client-btn"
            className="btn btn-primary"
            onClick={handleAddClient}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                Adding Client...
              </>
            ) : (
              'Add Client'
            )}
          </button>

          {/* Error Message */}
          {submitError && (
            <div className="error-banner" style={{ marginTop: '20px', padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span>
              <span>{submitError}</span>
            </div>
          )}

          {/* Success Box */}
          {addedClient && (
            <div className="success-box">
              <div className="success-row">
                <span className="icon">✅</span>
                <span>Client <strong>{addedClient.name}</strong> added successfully!</span>
              </div>
              {addedClient.phone && (
                <div className="success-row">
                  <span className="icon">📞</span>
                  <span>Phone: <strong>{addedClient.phone}</strong></span>
                </div>
              )}
              <div className="success-row">
                <span className="icon">{addedClient.emailSent ? '📨' : '⚠️'}</span>
                <span>
                  {addedClient.emailSent ? (
                    <>Email sent directly to <strong>{addedClient.email}</strong> and notification sent to company!</>
                  ) : (
                    <>
                      Client saved, but email could not be sent to <strong>{addedClient.email}</strong>.
                      {addedClient.emailError && (
                        <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px' }}>
                          Reason: {addedClient.emailError}
                        </div>
                      )}
                    </>
                  )}
                </span>
              </div>
              <div className="link-section">
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#166534', marginBottom: '6px' }}>
                  📄 Selected Page: <span style={{ fontWeight: '500' }}>{addedClient.lendingPage}</span>
                </div>
                <span className="link-label">🔗 Generated Client Access URL:</span>
                <div className="url-text">{addedClient.accessUrl}</div>
                <button
                  id="copy-url-btn"
                  className={`btn-copy ${copied ? 'copied' : ''}`}
                  onClick={handleCopyUrl}
                >
                  {copied ? 'Copied to Clipboard!' : 'Copy Link'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="divider" />

        {/* ── EXISTING CLIENTS ── */}
        <div className="clients-section">
          <div className="section-header">
            <h2 className="section-title">Existing Clients</h2>
            {clients.length > 0 && (
              <span className="clients-count">{clients.length}</span>
            )}
          </div>

          <div className="clients-list">
            {clients.length === 0 ? (
              <p className="no-data">No clients found or connecting to server...</p>
            ) : (
              clients.map((client) => {
                const url = client.accessUrl || (client.lendingPage ? LENDING_PAGES.find((p) => p.label === client.lendingPage)?.url : '')

                return (
                  <div key={client._id} className="client-card">
                    <div className="client-avatar">
                      {getInitial(client.name)}
                    </div>
                    <div className="client-info">
                      <div className="name">{client.name}</div>
                      <div className="email">{client.email}</div>
                      {client.phone && (
                        <div className="phone" style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px', fontWeight: '500' }}>
                          📞 {client.phone}
                        </div>
                      )}
                      {url && (
                        <div className="url">
                          URL: <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                        </div>
                      )}
                      <div className="expiry">Expires: {client.expires}</div>
                    </div>
                    <div className="client-actions">
                      {client.status === 'approved' ? (
                        <span className="status-badge">Active</span>
                      ) : (
                        <button
                          className="btn-approve"
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
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
