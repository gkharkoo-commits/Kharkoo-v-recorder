# AS Kharkoo Recorder 🎥

A professional-grade, high-performance screen recording application built with Electron/Vite and Chromium's advanced media engine. Designed for creators, gamers, and professionals who demand stability and quality.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## ✨ Features

- **Professional White Theme**: A stunning, minimalist UI designed for focus and productivity.
- **Hybrid Capture**: Simultaneous recording of Screen, Webcam, and Audio.
- **4K Support**: Record at high resolutions up to 4K at 60 FPS.
- **Hardware Acceleration**: Automatic detection and utilization of GPU (NVENC, QSV, AMD).
- **Zero-Lag Engine**: Optimized frame handling for smooth recording even during heavy tasks.
- **Instant Preview**: View and manage your recordings immediately after capture.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/as-kharkoo-recorder.git
   ```
2. Navigate to the project directory:
   ```bash
   cd as-kharkoo-recorder
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
To start the application in development mode:
```bash
npm run dev
```

### Building for Production
To create a production-ready bundle:
```bash
npm run build
```

## 🏗️ System Architecture

- **UI Layer**: Electron + Vite + CSS (Custom White Theme)
- **Capture Engine**: Chromium MediaDevices API
- **Processing**: Real-time Canvas Compositing
- **Encoding**: MediaRecorder API with H.264 support

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙌 Contributing
Contributions are welcome! Please open an issue or submit a pull request for any features or bug fixes.

---
Created with ❤️ by **Antigravity AI**
