import React, { useState, useEffect } from 'react';
import './App.css';

const NEPAL_PROVINCES = [
  { id: 'koshi', name: 'Province 1 / Koshi Province', active: false },
  { id: 'madhesh', name: 'Madhesh Province', active: true },
  { id: 'bagmati', name: 'Bagmati Province', active: false },
  { id: 'gandaki', name: 'Gandaki Province', active: false },
  { id: 'lumbini', name: 'Lumbini Province', active: true },
  { id: 'karnali', name: 'Karnali Province', active: false },
  { id: 'sudurpashchim', name: 'Sudurpashchim Province', active: false },
];

function App() {
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [municipalities, setMunicipalities] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    fetch('http://localhost:5001/api/municipalities')
      .then(res => res.json())
      .then(data => setMunicipalities(data))
      .catch(err => console.error('Error fetching municipalities:', err));
  }, []);

  const handleSelectProvince = (prov) => {
    if (!prov.active) return;
    setSelectedProvince(prov);
    setSelectedMunicipality(null);
  };

  const handleSelectMunicipality = (mun) => {
    // Fetch full details including projects, reports, notices & documents
    fetch(`http://localhost:5001/api/municipalities/${mun.id}`)
      .then(res => res.json())
      .then(data => setSelectedMunicipality(data))
      .catch(err => console.error('Error fetching municipality details:', err));
  };

  return (
    <div className="container" style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Scrape Data Viewer</h1>
      <p style={{ color: '#666' }}>Explore Nepalese municipalities data, projects, reports, notices, and attached files.</p>

      {!selectedProvince ? (
        <div>
          <h2>Select a Province</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', marginTop: '15px' }}>
            {NEPAL_PROVINCES.map(prov => (
              <div
                key={prov.id}
                onClick={() => handleSelectProvince(prov)}
                style={{
                  border: '1px solid #ddd',
                  padding: '20px',
                  borderRadius: '8px',
                  cursor: prov.active ? 'pointer' : 'not-allowed',
                  opacity: prov.active ? 1 : 0.5,
                  background: prov.active ? '#f0f8ff' : '#f9f9f9',
                  boxShadow: prov.active ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <h3>{prov.name}</h3>
                <p style={{ fontSize: '14px', color: prov.active ? '#0070f3' : '#888' }}>
                  {prov.active ? (prov.id === 'lumbini' ? 'Active (1 Municipality)' : 'Active (No Data Yet)') : 'Coming Soon'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : !selectedMunicipality ? (
        <div>
          <button onClick={() => setSelectedProvince(null)} style={{ marginBottom: '15px', padding: '8px 12px', cursor: 'pointer' }}>← Back to Provinces</button>
          <h2>Municipalities in {selectedProvince.name}</h2>
          {selectedProvince.id === 'madhesh' ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No municipalities scraped yet for Madhesh Province.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', marginTop: '15px' }}>
              {municipalities.map(mun => (
                <div
                  key={mun.id}
                  onClick={() => handleSelectMunicipality(mun)}
                  style={{
                    border: '1px solid #ccc',
                    padding: '20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: '#fff',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                  }}
                >
                  <h3>{mun.nameEn} ({mun.nameNe})</h3>
                  <p>District: {mun.district}</p>
                  <p>Province: {mun.province}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <button onClick={() => setSelectedMunicipality(null)} style={{ marginBottom: '15px', padding: '8px 12px', cursor: 'pointer' }}>← Back to Municipalities</button>
          <h2>{selectedMunicipality.nameEn} ({selectedMunicipality.nameNe})</h2>
          <p style={{ color: '#666' }}>District: {selectedMunicipality.district} | Province: {selectedMunicipality.province}</p>

          <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #eee', paddingBottom: '10px', margin: '20px 0' }}>
            <button
              onClick={() => setActiveTab('home')}
              style={{ padding: '8px 16px', cursor: 'pointer', background: activeTab === 'home' ? '#0070f3' : '#f0f0f0', color: activeTab === 'home' ? '#fff' : '#000', border: 'none', borderRadius: '4px' }}
            >
              Home / Profile
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              style={{ padding: '8px 16px', cursor: 'pointer', background: activeTab === 'projects' ? '#0070f3' : '#f0f0f0', color: activeTab === 'projects' ? '#fff' : '#000', border: 'none', borderRadius: '4px' }}
            >
              Projects ({selectedMunicipality.projects?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('notices')}
              style={{ padding: '8px 16px', cursor: 'pointer', background: activeTab === 'notices' ? '#0070f3' : '#f0f0f0', color: activeTab === 'notices' ? '#fff' : '#000', border: 'none', borderRadius: '4px' }}
            >
              Notices ({selectedMunicipality.notices?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              style={{ padding: '8px 16px', cursor: 'pointer', background: activeTab === 'reports' ? '#0070f3' : '#f0f0f0', color: activeTab === 'reports' ? '#fff' : '#000', border: 'none', borderRadius: '4px' }}
            >
              Reports ({selectedMunicipality.reports?.length || 0})
            </button>
          </div>

          {activeTab === 'home' && (
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
              <h3>Municipality Profile</h3>
              {selectedMunicipality.profile ? (
                <ul style={{ lineHeight: '1.8' }}>
                  <li><strong>Established (BS):</strong> {selectedMunicipality.profile.establishedBs || 'N/A'}</li>
                  <li><strong>Total Wards:</strong> {selectedMunicipality.profile.totalWards || 'N/A'}</li>
                  <li><strong>Population:</strong> {selectedMunicipality.profile.population || 'N/A'}</li>
                  <li><strong>Area (Sq Km):</strong> {selectedMunicipality.profile.areaSqKm || 'N/A'}</li>
                  <li><strong>Email:</strong> {selectedMunicipality.profile.email || 'N/A'}</li>
                  <li><strong>Website:</strong> {selectedMunicipality.profile.website ? <a href={selectedMunicipality.profile.website} target="_blank" rel="noreferrer">{selectedMunicipality.profile.website}</a> : 'N/A'}</li>
                </ul>
              ) : (
                <p>No profile data available.</p>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div>
              <h3>Projects</h3>
              {selectedMunicipality.projects && selectedMunicipality.projects.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                    <thead>
                      <tr style={{ background: '#f1f1f1' }}>
                        <th>Title (Nepali)</th>
                        <th>Title (English)</th>
                        <th>Budget</th>
                        <th>Fiscal Year</th>
                        <th>Status</th>
                        <th>Source Link</th>
                        <th>Documents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMunicipality.projects.map(p => (
                        <tr key={p.id}>
                          <td>{p.titleNe}</td>
                          <td>{p.titleEn || '-'}</td>
                          <td>{p.budgetAmount ? `NPR ${p.budgetAmount}` : '-'}</td>
                          <td>{p.fiscalYear || '-'}</td>
                          <td>{p.status || '-'}</td>
                          <td>
                            {p.sourceUrl ? (
                              <a href={p.sourceUrl} target="_blank" rel="noreferrer" style={{ color: '#0070f3', textDecoration: 'underline' }}>
                                🌐 View Page
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            {p.documents && p.documents.length > 0 ? (
                              p.documents.map(d => (
                                <div key={d.id} style={{ marginBottom: '4px' }}>
                                  <a href={`http://localhost:5001/api/documents/${d.id}/download`} target="_blank" rel="noreferrer" style={{ color: '#0070f3', textDecoration: 'underline' }}>
                                    📥 {d.fileName || 'Download File'}
                                  </a>
                                </div>
                              ))
                            ) : (
                              <span style={{ color: '#888' }}>No file</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No projects found.</p>
              )}
            </div>
          )}

          {activeTab === 'notices' && (
            <div>
              <h3>Notices</h3>
              {selectedMunicipality.notices && selectedMunicipality.notices.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                    <thead>
                      <tr style={{ background: '#f1f1f1' }}>
                        <th>Title (Nepali)</th>
                        <th>Notice Type</th>
                        <th>Published Date</th>
                        <th>Source Link</th>
                        <th>Documents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMunicipality.notices.map(n => (
                        <tr key={n.id}>
                          <td>{n.titleNe}</td>
                          <td>{n.noticeType || '-'}</td>
                          <td>{n.publishedDate || '-'}</td>
                          <td>
                            {n.sourceUrl ? (
                              <a href={n.sourceUrl} target="_blank" rel="noreferrer" style={{ color: '#0070f3', textDecoration: 'underline' }}>
                                🌐 View Page
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            {n.documents && n.documents.length > 0 ? (
                              n.documents.map(d => (
                                <div key={d.id} style={{ marginBottom: '4px' }}>
                                  <a href={`http://localhost:5001/api/documents/${d.id}/download`} target="_blank" rel="noreferrer" style={{ color: '#0070f3', textDecoration: 'underline' }}>
                                    📥 {d.fileName || 'Download File'}
                                  </a>
                                </div>
                              ))
                            ) : (
                              <span style={{ color: '#888' }}>No file</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No notices found.</p>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <h3>Reports</h3>
              {selectedMunicipality.reports && selectedMunicipality.reports.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                    <thead>
                      <tr style={{ background: '#f1f1f1' }}>
                        <th>Title (Nepali)</th>
                        <th>Report Type</th>
                        <th>Fiscal Year</th>
                        <th>Published Date</th>
                        <th>Source Link</th>
                        <th>Documents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMunicipality.reports.map(r => (
                        <tr key={r.id}>
                          <td>{r.titleNe}</td>
                          <td>{r.reportType || '-'}</td>
                          <td>{r.fiscalYear || '-'}</td>
                          <td>{r.publishedDate || '-'}</td>
                          <td>
                            {r.sourceUrl ? (
                              <a href={r.sourceUrl} target="_blank" rel="noreferrer" style={{ color: '#0070f3', textDecoration: 'underline' }}>
                                🌐 View Page
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            {r.documents && r.documents.length > 0 ? (
                              r.documents.map(d => (
                                <div key={d.id} style={{ marginBottom: '4px' }}>
                                  <a href={`http://localhost:5001/api/documents/${d.id}/download`} target="_blank" rel="noreferrer" style={{ color: '#0070f3', textDecoration: 'underline' }}>
                                    📥 {d.fileName || 'Download File'}
                                  </a>
                                </div>
                              ))
                            ) : (
                              <span style={{ color: '#888' }}>No file</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No reports found.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
