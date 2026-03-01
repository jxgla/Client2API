<div align="center">

<img src="src/img/logo-mid.webp" alt="logo"  style="width: 128px; height: 128px;margin-bottom: 3px;">

# GROKAPI 🚀

**An optimized proxy designed exclusively for managing Grok Reverse API requests, featuring native SSO token batch imports, TLS sidecar fingerprinting, and unified local OpenAI compatibility.**

</div>

`GROKAPI` breaks through traditional limits by explicitly specializing in `grok-custom` model support. Born from the `AIClient2API` tree, this project has been heavily pruned and refactored to prioritize Grok SSO imports, removing bloat and unused provider adapters (like Claude, Gemini, OpenAI, etc.).

---

## 💡 Core Advantages

### 🎯 Specialization
*   **Grok First**: Dedicated exclusively to Grok Reverse (`grok-custom`). All extraneous code for other providers has been pruned for a cleaner, leaner binary.
*   **SSO Batch Imports**: Stop dragging and dropping single tokens. GROKAPI features a native SSO Batch Import endpoint that deduplicates and saves multiple tokens at once directly from the UI.
*   **OpenAI Compatibility**: Encapsulates connections into a standard OpenAI-compatible interface that can be called by any modern application (Cherry-Studio, NextChat, Cline).

### 🛡️ Hardened Security
*   **Loopback Bindings**: By default, the main application HTTP server runs tightly on port `3001` and is strictly bound to `127.0.0.1`.
*   **Automated TLS Fingerprinting**: The Go-based TLS Sidecar is enabled by default, ensuring your browser fingerprints are properly spoofed.

---

## 🚀 Quick Start

### 1. Build the TLS Sidecar
Because GROKAPI requires fingerprinted spoofing for Grok to function smoothly, you MUST compile the Go sidecar on your local machine first.
Ensure you have Go installed on your machine (`winget install GoLang.Go`).
```bash
cd tls-sidecar
go mod tidy
go build -o tls-sidecar.exe
```

### 2. Run the Node Server
```bash
npm install
npm start
```

### 3. Access the Console
After the server starts, open your browser and visit:
👉 [**http://127.0.0.1:3001**](http://127.0.0.1:3001)

> **Default Password**: `admin123` (can be changed in the console or by modifying the `pwd` file after login)

### 4. Batch Import 
Navigate to the **Providers** menu on the left. Click **Batch Import SSO**, paste a list of your SSO tokens separated by a new line, and click Import!

---

## ⚠️ Disclaimer

### Usage Risk Warning
This project (GROKAPI) is for learning and research purposes only. Users assume all risks when using this project. The author is not responsible for any direct, indirect, or consequential losses resulting from the use of this project.
