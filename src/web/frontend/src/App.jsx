import React, { useState, useEffect } from "react";
import "./App.css";

const DEFAULT_PROVINCES = [
    { id: "koshi", name: "Koshi Province", count: 0, active: false },
    { id: "madhesh", name: "Madhesh Province", count: 0, active: false },
    { id: "bagmati", name: "Bagmati Province", count: 0, active: false },
    { id: "gandaki", name: "Gandaki Province", count: 0, active: false },
    { id: "lumbini", name: "Lumbini Province", count: 0, active: false },
    { id: "karnali", name: "Karnali Province", count: 0, active: false },
    { id: "sudurpashchim", name: "Sudurpashchim Province", count: 0, active: false },
];

function App() {
    const [provinces, setProvinces] = useState(DEFAULT_PROVINCES);
    const [loadingProvinces, setLoadingProvinces] = useState(true);
    const [selectedProvince, setSelectedProvince] = useState(null);
    const [municipalities, setMunicipalities] = useState([]);
    const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
    const [selectedMunicipality, setSelectedMunicipality] = useState(null);
    const [activeTab, setActiveTab] = useState("home");

    useEffect(() => {
        let isMounted = true;
        fetch("http://localhost:5001/api/provinces")
            .then((res) => res.json())
            .then((data) => {
                if (isMounted) {
                    if (Array.isArray(data) && data.length > 0) {
                        setProvinces(data);
                    }
                    setLoadingProvinces(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    console.error("Error fetching provinces:", err);
                    setLoadingProvinces(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const handleSelectProvince = (prov) => {
        if (!prov.active || prov.count === 0) return;
        setSelectedProvince(prov);
        setSelectedMunicipality(null);
        setLoadingMunicipalities(true);

        fetch(`http://localhost:5001/api/municipalities?province=${encodeURIComponent(prov.id)}`)
            .then((res) => res.json())
            .then((data) => {
                setMunicipalities(Array.isArray(data) ? data : []);
                setLoadingMunicipalities(false);
            })
            .catch((err) => {
                console.error("Error fetching municipalities:", err);
                setMunicipalities([]);
                setLoadingMunicipalities(false);
            });
    };

    const handleSelectMunicipality = (mun) => {
        // Fetch full details including projects, reports, notices & documents
        fetch(`http://localhost:5001/api/municipalities/${mun.id}`)
            .then((res) => res.json())
            .then((data) => setSelectedMunicipality(data))
            .catch((err) => console.error("Error fetching municipality details:", err));
    };

    return (
        <div
            className="container"
            style={{
                padding: "20px",
                fontFamily: "sans-serif",
                maxWidth: "1200px",
                margin: "0 auto",
            }}
        >
            <h1>Scrape Data Viewer</h1>
            <p style={{ color: "#666" }}>
                Explore Nepalese municipalities data, projects, reports, notices, and attached
                files.
            </p>

            {!selectedProvince ? (
                <div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: "15px",
                        }}
                    >
                        <h2>Select a Province</h2>
                        {loadingProvinces && (
                            <span style={{ color: "#666", fontSize: "14px" }}>
                                Loading provinces...
                            </span>
                        )}
                    </div>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                            gap: "16px",
                            marginTop: "15px",
                        }}
                    >
                        {provinces.map((prov) => {
                            const isActive = Boolean(prov.active && prov.count > 0);
                            return (
                                <div
                                    key={prov.id}
                                    onClick={() => handleSelectProvince(prov)}
                                    style={{
                                        border: isActive
                                            ? "1px solid #3b82f6"
                                            : "1px solid #e2e8f0",
                                        padding: "20px",
                                        borderRadius: "10px",
                                        cursor: isActive ? "pointer" : "not-allowed",
                                        opacity: isActive ? 1 : 0.6,
                                        background: isActive ? "#f8faff" : "#f8fafc",
                                        boxShadow: isActive
                                            ? "0 3px 10px rgba(59, 130, 246, 0.12)"
                                            : "none",
                                        transition: "all 0.2s ease",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                marginBottom: "8px",
                                            }}
                                        >
                                            <h3
                                                style={{
                                                    margin: 0,
                                                    fontSize: "18px",
                                                    color: isActive ? "#0f172a" : "#64748b",
                                                }}
                                            >
                                                {prov.name}
                                            </h3>
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    fontWeight: 600,
                                                    padding: "2px 8px",
                                                    borderRadius: "12px",
                                                    background: isActive ? "#dcfce7" : "#f1f5f9",
                                                    color: isActive ? "#15803d" : "#64748b",
                                                }}
                                            >
                                                {isActive ? "● Active" : "○ Inactive"}
                                            </span>
                                        </div>
                                    </div>
                                    <p
                                        style={{
                                            margin: "12px 0 0 0",
                                            fontSize: "14px",
                                            fontWeight: 500,
                                            color: isActive ? "#2563eb" : "#94a3b8",
                                        }}
                                    >
                                        {prov.count}{" "}
                                        {prov.count === 1 ? "Municipality" : "Municipalities"}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : !selectedMunicipality ? (
                <div>
                    <button
                        onClick={() => setSelectedProvince(null)}
                        style={{ marginBottom: "15px", padding: "8px 12px", cursor: "pointer" }}
                    >
                        ← Back to Provinces
                    </button>
                    <h2>Municipalities in {selectedProvince.name}</h2>
                    {loadingMunicipalities ? (
                        <p style={{ color: "#666", fontStyle: "italic" }}>
                            Loading municipalities...
                        </p>
                    ) : municipalities.length === 0 ? (
                        <p style={{ color: "#666", fontStyle: "italic" }}>
                            No municipalities registered yet for {selectedProvince.name}.
                        </p>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                                gap: "15px",
                                marginTop: "15px",
                            }}
                        >
                            {municipalities.map((mun) => (
                                <div
                                    key={mun.id}
                                    onClick={() => handleSelectMunicipality(mun)}
                                    style={{
                                        border: "1px solid #ccc",
                                        padding: "20px",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        background: "#fff",
                                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                                    }}
                                >
                                    <h3>
                                        {mun.nameEn} ({mun.nameNe})
                                    </h3>
                                    <p>District: {mun.district}</p>
                                    <p>Province: {mun.province}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <button
                        onClick={() => setSelectedMunicipality(null)}
                        style={{ marginBottom: "15px", padding: "8px 12px", cursor: "pointer" }}
                    >
                        ← Back to Municipalities
                    </button>
                    <h2>
                        {selectedMunicipality.nameEn} ({selectedMunicipality.nameNe})
                    </h2>
                    <p style={{ color: "#666" }}>
                        District: {selectedMunicipality.district} | Province:{" "}
                        {selectedMunicipality.province}
                    </p>

                    <div
                        style={{
                            display: "flex",
                            gap: "10px",
                            borderBottom: "2px solid #eee",
                            paddingBottom: "10px",
                            margin: "20px 0",
                        }}
                    >
                        <button
                            onClick={() => setActiveTab("home")}
                            style={{
                                padding: "8px 16px",
                                cursor: "pointer",
                                background: activeTab === "home" ? "#0070f3" : "#f0f0f0",
                                color: activeTab === "home" ? "#fff" : "#000",
                                border: "none",
                                borderRadius: "4px",
                            }}
                        >
                            Home / Profile
                        </button>
                        <button
                            onClick={() => setActiveTab("projects")}
                            style={{
                                padding: "8px 16px",
                                cursor: "pointer",
                                background: activeTab === "projects" ? "#0070f3" : "#f0f0f0",
                                color: activeTab === "projects" ? "#fff" : "#000",
                                border: "none",
                                borderRadius: "4px",
                            }}
                        >
                            Projects ({selectedMunicipality.projects?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab("notices")}
                            style={{
                                padding: "8px 16px",
                                cursor: "pointer",
                                background: activeTab === "notices" ? "#0070f3" : "#f0f0f0",
                                color: activeTab === "notices" ? "#fff" : "#000",
                                border: "none",
                                borderRadius: "4px",
                            }}
                        >
                            Notices ({selectedMunicipality.notices?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab("reports")}
                            style={{
                                padding: "8px 16px",
                                cursor: "pointer",
                                background: activeTab === "reports" ? "#0070f3" : "#f0f0f0",
                                color: activeTab === "reports" ? "#fff" : "#000",
                                border: "none",
                                borderRadius: "4px",
                            }}
                        >
                            Reports ({selectedMunicipality.reports?.length || 0})
                        </button>
                    </div>

                    {activeTab === "home" && (
                        <div
                            style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px" }}
                        >
                            <h3>Municipality Profile</h3>
                            {selectedMunicipality.profile ? (
                                <ul style={{ lineHeight: "1.8" }}>
                                    <li>
                                        <strong>Established (BS):</strong>{" "}
                                        {selectedMunicipality.profile.establishedBs || "N/A"}
                                    </li>
                                    <li>
                                        <strong>Total Wards:</strong>{" "}
                                        {selectedMunicipality.profile.totalWards || "N/A"}
                                    </li>
                                    <li>
                                        <strong>Population:</strong>{" "}
                                        {selectedMunicipality.profile.population || "N/A"}
                                    </li>
                                    <li>
                                        <strong>Area (Sq Km):</strong>{" "}
                                        {selectedMunicipality.profile.areaSqKm || "N/A"}
                                    </li>
                                    <li>
                                        <strong>Email:</strong>{" "}
                                        {selectedMunicipality.profile.email || "N/A"}
                                    </li>
                                    <li>
                                        <strong>Website:</strong>{" "}
                                        {selectedMunicipality.profile.website ? (
                                            <a
                                                href={selectedMunicipality.profile.website}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {selectedMunicipality.profile.website}
                                            </a>
                                        ) : (
                                            "N/A"
                                        )}
                                    </li>
                                </ul>
                            ) : (
                                <p>No profile data available.</p>
                            )}
                        </div>
                    )}

                    {activeTab === "projects" && (
                        <div>
                            <h3>Projects</h3>
                            {selectedMunicipality.projects &&
                            selectedMunicipality.projects.length > 0 ? (
                                <div style={{ overflowX: "auto" }}>
                                    <table
                                        border="1"
                                        cellPadding="10"
                                        style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                            background: "#fff",
                                        }}
                                    >
                                        <thead>
                                            <tr style={{ background: "#f1f1f1" }}>
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
                                            {selectedMunicipality.projects.map((p) => (
                                                <tr key={p.id}>
                                                    <td>{p.titleNe}</td>
                                                    <td>{p.titleEn || "-"}</td>
                                                    <td>
                                                        {p.budgetAmount
                                                            ? `NPR ${p.budgetAmount}`
                                                            : "-"}
                                                    </td>
                                                    <td>{p.fiscalYear || "-"}</td>
                                                    <td>{p.status || "-"}</td>
                                                    <td>
                                                        {p.sourceUrl ? (
                                                            <a
                                                                href={p.sourceUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{
                                                                    color: "#0070f3",
                                                                    textDecoration: "underline",
                                                                }}
                                                            >
                                                                🌐 View Page
                                                            </a>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </td>
                                                    <td>
                                                        {p.documents && p.documents.length > 0 ? (
                                                            p.documents.map((d) => (
                                                                <div
                                                                    key={d.id}
                                                                    style={{ marginBottom: "4px" }}
                                                                >
                                                                    <a
                                                                        href={`http://localhost:5001/api/documents/${d.id}/download`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        style={{
                                                                            color: "#0070f3",
                                                                            textDecoration:
                                                                                "underline",
                                                                        }}
                                                                    >
                                                                        📥{" "}
                                                                        {d.fileName ||
                                                                            "Download File"}
                                                                    </a>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span style={{ color: "#888" }}>
                                                                No file
                                                            </span>
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

                    {activeTab === "notices" && (
                        <div>
                            <h3>Notices</h3>
                            {selectedMunicipality.notices &&
                            selectedMunicipality.notices.length > 0 ? (
                                <div style={{ overflowX: "auto" }}>
                                    <table
                                        border="1"
                                        cellPadding="10"
                                        style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                            background: "#fff",
                                        }}
                                    >
                                        <thead>
                                            <tr style={{ background: "#f1f1f1" }}>
                                                <th>Title (Nepali)</th>
                                                <th>Notice Type</th>
                                                <th>Published Date</th>
                                                <th>Source Link</th>
                                                <th>Documents</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedMunicipality.notices.map((n) => (
                                                <tr key={n.id}>
                                                    <td>{n.titleNe}</td>
                                                    <td>{n.noticeType || "-"}</td>
                                                    <td>{n.publishedDate || "-"}</td>
                                                    <td>
                                                        {n.sourceUrl ? (
                                                            <a
                                                                href={n.sourceUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{
                                                                    color: "#0070f3",
                                                                    textDecoration: "underline",
                                                                }}
                                                            >
                                                                🌐 View Page
                                                            </a>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </td>
                                                    <td>
                                                        {n.documents && n.documents.length > 0 ? (
                                                            n.documents.map((d) => (
                                                                <div
                                                                    key={d.id}
                                                                    style={{ marginBottom: "4px" }}
                                                                >
                                                                    <a
                                                                        href={`http://localhost:5001/api/documents/${d.id}/download`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        style={{
                                                                            color: "#0070f3",
                                                                            textDecoration:
                                                                                "underline",
                                                                        }}
                                                                    >
                                                                        📥{" "}
                                                                        {d.fileName ||
                                                                            "Download File"}
                                                                    </a>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span style={{ color: "#888" }}>
                                                                No file
                                                            </span>
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

                    {activeTab === "reports" && (
                        <div>
                            <h3>Reports</h3>
                            {selectedMunicipality.reports &&
                            selectedMunicipality.reports.length > 0 ? (
                                <div style={{ overflowX: "auto" }}>
                                    <table
                                        border="1"
                                        cellPadding="10"
                                        style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                            background: "#fff",
                                        }}
                                    >
                                        <thead>
                                            <tr style={{ background: "#f1f1f1" }}>
                                                <th>Title (Nepali)</th>
                                                <th>Report Type</th>
                                                <th>Fiscal Year</th>
                                                <th>Published Date</th>
                                                <th>Source Link</th>
                                                <th>Documents</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedMunicipality.reports.map((r) => (
                                                <tr key={r.id}>
                                                    <td>{r.titleNe}</td>
                                                    <td>{r.reportType || "-"}</td>
                                                    <td>{r.fiscalYear || "-"}</td>
                                                    <td>{r.publishedDate || "-"}</td>
                                                    <td>
                                                        {r.sourceUrl ? (
                                                            <a
                                                                href={r.sourceUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{
                                                                    color: "#0070f3",
                                                                    textDecoration: "underline",
                                                                }}
                                                            >
                                                                🌐 View Page
                                                            </a>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </td>
                                                    <td>
                                                        {r.documents && r.documents.length > 0 ? (
                                                            r.documents.map((d) => (
                                                                <div
                                                                    key={d.id}
                                                                    style={{ marginBottom: "4px" }}
                                                                >
                                                                    <a
                                                                        href={`http://localhost:5001/api/documents/${d.id}/download`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        style={{
                                                                            color: "#0070f3",
                                                                            textDecoration:
                                                                                "underline",
                                                                        }}
                                                                    >
                                                                        📥{" "}
                                                                        {d.fileName ||
                                                                            "Download File"}
                                                                    </a>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span style={{ color: "#888" }}>
                                                                No file
                                                            </span>
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
