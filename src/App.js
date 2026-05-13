import { useState, useRef, useCallback } from "react";

const LANGUAGES = ["javascript", "typescript", "python", "java", "cpp", "go", "rust", "php", "ruby", "css"];

const detectLanguage = (code, filename) => {
  if (filename) {
    const ext = filename.split(".").pop().toLowerCase();
    const map = { js: "javascript", ts: "typescript", py: "python", java: "java", cpp: "cpp", go: "go", rs: "rust", php: "php", rb: "ruby", css: "css" };
    if (map[ext]) return map[ext];
  }
  if (code.includes("import React") || code.includes("const ") || code.includes("=>")) return "javascript";
  if (code.includes("def ") || code.includes("import ") && code.includes(":")) return "python";
  if (code.includes("public class") || code.includes("System.out")) return "java";
  return "javascript";
};

const SAMPLE_CODE = `// Paste your code here or upload a file
function fetchUserData(userId) {
  const url = "http://api.example.com/users/" + userId;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      var password = data.password;
      console.log("User password: " + password);
      document.innerHTML = data.bio;
    })
}

// Call without error handling
fetchUserData(prompt("Enter user ID:"));`;

export default function CodeReviewAI() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [language, setLanguage] = useState("javascript");
  const [filename, setFilename] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [review, setReview] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("editor"); // editor | history
  const [activeReviewTab, setActiveReviewTab] = useState("bugs");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setCode(content);
      setLanguage(detectLanguage(content, file.name));
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const runReview = async () => {
    if (!code.trim()) return;
    setIsReviewing(true);
    setReview(null);
    setActiveTab("editor");

    const prompt = `You are an expert code reviewer. Analyze the following ${language} code and provide a structured review.

Return ONLY a valid JSON object with this exact structure:
{
  "summary": "2-3 sentence overall assessment",
  "score": <number 0-100>,
  "bugs": [
    {"line": <number or null>, "severity": "critical|high|medium|low", "title": "short title", "description": "explanation", "fix": "corrected code snippet"}
  ],
  "performance": [
    {"line": <number or null>, "impact": "high|medium|low", "title": "short title", "description": "explanation", "suggestion": "improved code snippet"}
  ],
  "metrics": {
    "bugs_found": <number>,
    "perf_issues": <number>,
    "security_issues": <number>,
    "maintainability": <number 0-100>
  }
}

Code to review:
\`\`\`${language}
${code}
\`\`\``;

    try {
     const res = await fetch("https://code-review-backend-mpts.onrender.com/api/review", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ code, language })
});
      const parsed = data;
      setReview(entry);
      setHistory(prev => [entry, ...prev.slice(0, 9)]);
      setActiveReviewTab("bugs");
    } catch (err) {
      setReview({ error: "Failed to parse review. Please try again." });
    }
    setIsReviewing(false);
  };

  const loadFromHistory = (entry) => {
    setCode(entry.code);
    setLanguage(entry.language);
    setFilename(entry.filename);
    setReview(entry);
    setActiveTab("editor");
  };

  const scoreColor = (s) => s >= 80 ? "#4ec9b0" : s >= 60 ? "#dcdcaa" : s >= 40 ? "#ce9178" : "#f44747";
  const severityColor = { critical: "#f44747", high: "#ce9178", medium: "#dcdcaa", low: "#9cdcfe" };
  const impactColor = { high: "#f44747", medium: "#dcdcaa", low: "#4ec9b0" };

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      background: "#1e1e1e",
      color: "#d4d4d4",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Title Bar */}
      <div style={{ background: "#323233", borderBottom: "1px solid #3c3c3c", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["#ff5f57","#ffbd2e","#28ca42"].map((c,i) => <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
          </div>
          <span style={{ fontSize: 12, color: "#858585", marginLeft: 8 }}>CodeReview AI — {filename || "untitled"}</span>
        </div>
        <span style={{ fontSize: 11, color: "#4ec9b0", letterSpacing: 1 }}>POWERED BY CLAUDE AI</span>
      </div>

      {/* Activity Bar */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ width: 48, background: "#333333", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, gap: 4, borderRight: "1px solid #3c3c3c" }}>
          {[
            { id: "editor", icon: "⌨", label: "Editor" },
            { id: "history", icon: "🕐", label: "History" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} title={tab.label} style={{
              width: 36, height: 36, background: activeTab === tab.id ? "#1e1e1e" : "transparent",
              border: activeTab === tab.id ? "1px solid #3c3c3c" : "1px solid transparent",
              borderLeft: activeTab === tab.id ? "2px solid #4ec9b0" : "2px solid transparent",
              color: activeTab === tab.id ? "#d4d4d4" : "#858585", cursor: "pointer",
              fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 0
            }}>{tab.icon}</button>
          ))}
        </div>

        {/* Sidebar */}
        <div style={{ width: 200, background: "#252526", borderRight: "1px solid #3c3c3c", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", fontSize: 11, color: "#bbb", letterSpacing: 1, borderBottom: "1px solid #3c3c3c", textTransform: "uppercase" }}>
            {activeTab === "editor" ? "Explorer" : "Review History"}
          </div>

          {activeTab === "editor" ? (
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, color: "#858585" }}>LANGUAGE</div>
              <select value={language} onChange={e => setLanguage(e.target.value)} style={{
                background: "#3c3c3c", color: "#d4d4d4", border: "1px solid #555", borderRadius: 3,
                padding: "4px 8px", fontSize: 12, width: "100%"
              }}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>

              <div style={{ fontSize: 11, color: "#858585", marginTop: 4 }}>UPLOAD FILE</div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
                style={{
                  border: `2px dashed ${dragOver ? "#4ec9b0" : "#555"}`,
                  borderRadius: 4, padding: "12px 8px", textAlign: "center",
                  cursor: "pointer", fontSize: 11, color: "#858585",
                  background: dragOver ? "#1e3a3a" : "transparent",
                  transition: "all 0.2s"
                }}>
                {dragOver ? "Drop here!" : "Drop or click\nto upload"}
              </div>
              <input ref={fileRef} type="file" accept=".js,.ts,.py,.java,.cpp,.go,.rs,.php,.rb,.css,.jsx,.tsx" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

              {filename && (
                <div style={{ fontSize: 11, color: "#4ec9b0", wordBreak: "break-all" }}>📄 {filename}</div>
              )}

              {review && !review.error && (
                <div style={{ marginTop: 8, padding: 10, background: "#1e1e1e", borderRadius: 4, border: "1px solid #3c3c3c" }}>
                  <div style={{ fontSize: 11, color: "#858585", marginBottom: 6 }}>LAST SCORE</div>
                  <div style={{ fontSize: 28, fontWeight: "bold", color: scoreColor(review.score), textAlign: "center" }}>{review.score}</div>
                  <div style={{ fontSize: 10, color: "#858585", textAlign: "center" }}>/ 100</div>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                    {[
                      { label: "Bugs", val: review.metrics.bugs_found, color: "#f44747" },
                      { label: "Perf", val: review.metrics.perf_issues, color: "#dcdcaa" },
                      { label: "Security", val: review.metrics.security_issues, color: "#ce9178" },
                    ].map(m => (
                      <div key={m.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#858585" }}>{m.label}</span>
                        <span style={{ color: m.color, fontWeight: "bold" }}>{m.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ overflow: "auto", flex: 1 }}>
              {history.length === 0 ? (
                <div style={{ padding: 16, fontSize: 11, color: "#858585", textAlign: "center" }}>No reviews yet</div>
              ) : history.map(entry => (
                <div key={entry.id} onClick={() => loadFromHistory(entry)} style={{
                  padding: "10px 12px", borderBottom: "1px solid #3c3c3c", cursor: "pointer",
                  background: review?.id === entry.id ? "#2a2d2e" : "transparent",
                  transition: "background 0.15s"
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#2a2d2e"}
                  onMouseLeave={e => e.currentTarget.style.background = review?.id === entry.id ? "#2a2d2e" : "transparent"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#d4d4d4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{entry.filename}</span>
                    <span style={{ fontSize: 13, fontWeight: "bold", color: scoreColor(entry.score) }}>{entry.score}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#858585", marginTop: 2 }}>{entry.timestamp}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Editor Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ display: "flex", background: "#2d2d2d", borderBottom: "1px solid #3c3c3c" }}>
            <div style={{ padding: "6px 16px", fontSize: 12, color: "#d4d4d4", background: "#1e1e1e", borderRight: "1px solid #3c3c3c", borderTop: "1px solid #4ec9b0", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#4ec9b0" }}>●</span>
              {filename || `untitled.${language === "javascript" ? "js" : language === "typescript" ? "ts" : language === "python" ? "py" : language.slice(0,2)}`}
            </div>
          </div>

          {/* Editor + Review Split */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Code Editor */}
            <div style={{ flex: review ? "0 0 50%" : "1", display: "flex", flexDirection: "column", borderRight: review ? "1px solid #3c3c3c" : "none", transition: "flex 0.3s" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "6px 12px", background: "#252526", borderBottom: "1px solid #3c3c3c", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#858585" }}>CODE EDITOR</span>
                <span style={{ fontSize: 11, color: "#569cd6", marginLeft: "auto" }}>{language}</span>
                <span style={{ fontSize: 11, color: "#858585" }}>{code.split("\n").length} lines</span>
              </div>
              <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
                {/* Line numbers */}
                <div style={{
                  background: "#1e1e1e", padding: "12px 8px", color: "#4e4e4e", fontSize: 13,
                  lineHeight: "20px", textAlign: "right", userSelect: "none", minWidth: 40,
                  borderRight: "1px solid #3c3c3c", overflowY: "hidden"
                }}>
                  {code.split("\n").map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  spellCheck={false}
                  style={{
                    flex: 1, background: "#1e1e1e", color: "#d4d4d4", border: "none", outline: "none",
                    padding: "12px", fontSize: 13, lineHeight: "20px", resize: "none",
                    fontFamily: "inherit", tabSize: 2
                  }}
                />
              </div>
              <div style={{ padding: "8px 12px", background: "#007acc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#fff" }}>
                  {isReviewing ? "⏳ Analyzing with Claude AI..." : "Ready"}
                </span>
                <button
                  onClick={runReview}
                  disabled={isReviewing || !code.trim()}
                  style={{
                    background: isReviewing ? "#005a9e" : "#4ec9b0", color: "#1e1e1e",
                    border: "none", borderRadius: 3, padding: "5px 16px", fontSize: 12,
                    fontWeight: "bold", cursor: isReviewing ? "not-allowed" : "pointer",
                    fontFamily: "inherit", letterSpacing: 0.5, transition: "background 0.2s"
                  }}
                >
                  {isReviewing ? "Reviewing..." : "▶ Run Review"}
                </button>
              </div>
            </div>

            {/* Review Panel */}
            {review && (
              <div style={{ flex: "0 0 50%", display: "flex", flexDirection: "column", overflow: "hidden", background: "#1e1e1e" }}>
                {review.error ? (
                  <div style={{ padding: 20, color: "#f44747" }}>{review.error}</div>
                ) : (
                  <>
                    {/* Review Header */}
                    <div style={{ padding: "10px 16px", background: "#252526", borderBottom: "1px solid #3c3c3c" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#858585", textTransform: "uppercase", letterSpacing: 1 }}>AI Code Review</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "#858585" }}>Score</span>
                          <span style={{ fontSize: 22, fontWeight: "bold", color: scoreColor(review.score) }}>{review.score}</span>
                          <span style={{ fontSize: 11, color: "#858585" }}>/100</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "#9cdcfe", marginTop: 6, lineHeight: 1.5 }}>{review.summary}</div>
                      {/* Metric Pills */}
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        {[
                          { label: `${review.metrics.bugs_found} Bugs`, color: "#f44747" },
                          { label: `${review.metrics.perf_issues} Perf Issues`, color: "#dcdcaa" },
                          { label: `${review.metrics.security_issues} Security`, color: "#ce9178" },
                          { label: `${review.metrics.maintainability}% Maintainability`, color: "#4ec9b0" },
                        ].map(p => (
                          <span key={p.label} style={{ fontSize: 10, color: p.color, background: "#2d2d2d", border: `1px solid ${p.color}33`, borderRadius: 3, padding: "2px 8px" }}>{p.label}</span>
                        ))}
                      </div>
                    </div>

                    {/* Review Tabs */}
                    <div style={{ display: "flex", background: "#2d2d2d", borderBottom: "1px solid #3c3c3c" }}>
                      {[
                        { id: "bugs", label: `🐛 Bugs (${review.bugs.length})` },
                        { id: "perf", label: `⚡ Performance (${review.performance.length})` },
                      ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveReviewTab(tab.id)} style={{
                          padding: "6px 14px", fontSize: 11, background: activeReviewTab === tab.id ? "#1e1e1e" : "transparent",
                          color: activeReviewTab === tab.id ? "#d4d4d4" : "#858585",
                          border: "none", borderBottom: activeReviewTab === tab.id ? "2px solid #4ec9b0" : "2px solid transparent",
                          cursor: "pointer", fontFamily: "inherit"
                        }}>{tab.label}</button>
                      ))}
                    </div>

                    {/* Review Items */}
                    <div style={{ flex: 1, overflow: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      {(activeReviewTab === "bugs" ? review.bugs : review.performance).length === 0 ? (
                        <div style={{ textAlign: "center", padding: 32, color: "#4ec9b0", fontSize: 13 }}>
                          ✓ No {activeReviewTab === "bugs" ? "bugs" : "performance issues"} found!
                        </div>
                      ) : (activeReviewTab === "bugs" ? review.bugs : review.performance).map((item, i) => (
                        <div key={i} style={{ background: "#252526", border: "1px solid #3c3c3c", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ padding: "8px 12px", borderBottom: "1px solid #3c3c3c", display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              fontSize: 10, fontWeight: "bold", padding: "2px 6px", borderRadius: 3,
                              background: (activeReviewTab === "bugs" ? severityColor[item.severity] : impactColor[item.impact]) + "22",
                              color: activeReviewTab === "bugs" ? severityColor[item.severity] : impactColor[item.impact],
                              textTransform: "uppercase"
                            }}>
                              {activeReviewTab === "bugs" ? item.severity : item.impact}
                            </span>
                            {item.line && <span style={{ fontSize: 10, color: "#858585" }}>Line {item.line}</span>}
                            <span style={{ fontSize: 12, color: "#d4d4d4", fontWeight: "bold" }}>{item.title}</span>
                          </div>
                          <div style={{ padding: "8px 12px" }}>
                            <p style={{ fontSize: 11, color: "#9cdcfe", margin: "0 0 8px 0", lineHeight: 1.5 }}>{item.description}</p>
                            <div style={{ fontSize: 10, color: "#858585", marginBottom: 4 }}>SUGGESTED FIX:</div>
                            <pre style={{
                              background: "#1e1e1e", border: "1px solid #3c3c3c", borderRadius: 3,
                              padding: 8, fontSize: 11, color: "#ce9178", margin: 0,
                              overflowX: "auto", lineHeight: 1.5
                            }}>{activeReviewTab === "bugs" ? item.fix : item.suggestion}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ height: 22, background: "#007acc", display: "flex", alignItems: "center", padding: "0 12px", gap: 16, fontSize: 11, color: "#fff" }}>
        <span>⎇ main</span>
        <span>{language}</span>
        <span style={{ marginLeft: "auto" }}>Ln {code.split("\n").length}, Col 1</span>
        <span>UTF-8</span>
        <span style={{ color: "#4ec9b0" }}>Claude AI Ready</span>
      </div>
    </div>
  );
}