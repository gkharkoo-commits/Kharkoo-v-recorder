/**
 * AS Kharkoo Recorder - Core Logic
 * High-performance screen capture and recording system
 */

class KharkooRecorder {
  constructor() {
    this.stream = null;
    this.audioStream = null;
    this.webcamStream = null;
    this.micStream = null;
    this.audioCtx = null;
    this.audioDest = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.startTime = null;
    this.timerInterval = null;
    this.isRecording = false;

    // UI Elements
    this.videoPreview = document.getElementById('preview');
    this.webcamPreview = document.getElementById('webcam');
    this.camContainer = document.getElementById('cam-container');
    this.startBtn = document.getElementById('start-btn');
    this.stopBtn = document.getElementById('stop-btn');
    this.pauseBtn = document.getElementById('pause-btn');
    this.floatingControls = document.getElementById('recording-controls');
    this.timerDisplay = document.getElementById('timer');
    this.statusText = document.querySelector('.status-text');
    this.statusContainer = document.getElementById('recording-status');

    // Toggles
    this.screenToggle = document.getElementById('toggle-screen');
    this.webcamToggle = document.getElementById('toggle-webcam');
    this.audioToggle = document.getElementById('toggle-audio');

    // Compositor Canvas
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');

    // Webcam Settings UI
    this.camFilter = document.getElementById('cam-filter');
    this.camSize = document.getElementById('cam-size');
    this.shapeSquare = document.getElementById('shape-square');
    this.shapeCircle = document.getElementById('shape-circle');
    this.posBtns = {
      'top-left': document.getElementById('pos-tl'),
      'top-right': document.getElementById('pos-tr'),
      'bottom-left': document.getElementById('pos-bl'),
      'bottom-right': document.getElementById('pos-br')
    };

    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownNumber = document.getElementById('countdown-number');
    this.themeSelect = document.getElementById('theme-select');

    // Mouse Tracking for Cursor Highlight
    this.mousePos = { x: 0, y: 0 };
    if (this.videoPreview && this.videoPreview.parentElement) {
      this.videoPreview.parentElement.addEventListener('mousemove', (e) => {
        const rect = this.videoPreview.getBoundingClientRect();
        this.mousePos.x = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
        this.mousePos.y = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
      });
    }

    // Web Worker for Background Tab Recording Support
    const workerCode = `
      let intervalId;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          intervalId = setInterval(() => self.postMessage('tick'), 1000 / 60);
        } else if (e.data === 'stop') {
          clearInterval(intervalId);
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.renderClock = new Worker(URL.createObjectURL(blob));
    this.renderClock.onmessage = () => {
      if (document.hidden) {
        if (this.isRecording) this.drawCompositor(true);
      }
    };
    this.renderClock.postMessage('start');

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        if (this.isRecording) this.drawCompositor();
      }
    });

    this.init();
  }


  init() {
    // Recording Controls
    if (this.startBtn) this.startBtn.addEventListener('click', () => this.startRecording());
    if (this.stopBtn) this.stopBtn.addEventListener('click', () => this.stopRecording());
    if (this.webcamToggle) this.webcamToggle.addEventListener('click', () => this.toggleWebcamSource());
    if (this.screenToggle) this.screenToggle.addEventListener('click', () => this.setupPreview());
    if (this.audioToggle) {
      this.audioToggle.addEventListener('click', () => {
        this.audioToggle.classList.toggle('active');
      });
    }

    // Webcam customization listeners
    if (this.camFilter) this.camFilter.addEventListener('change', () => this.applyWebcamStyles());
    if (this.camSize) this.camSize.addEventListener('change', () => this.applyWebcamStyles());
    if (this.camOpacity) this.camOpacity.addEventListener('input', () => this.applyWebcamStyles());
    
    if (this.posBtns) {
      Object.keys(this.posBtns).forEach(pos => {
        const btn = this.posBtns[pos];
        if (btn) {
          btn.addEventListener('click', () => {
            Object.values(this.posBtns).forEach(b => b && b.classList.remove('active'));
            btn.classList.add('active');
            this.applyWebcamStyles();
          });
        }
      });
    }

    if (this.shapeSquare) {
      this.shapeSquare.addEventListener('click', () => {
        this.shapeSquare.classList.add('active');
        if (this.shapeCircle) this.shapeCircle.classList.remove('active');
        this.applyWebcamStyles();
      });
    }
    if (this.shapeCircle) {
      this.shapeCircle.addEventListener('click', () => {
        this.shapeCircle.classList.add('active');
        if (this.shapeSquare) this.shapeSquare.classList.remove('active');
        this.applyWebcamStyles();
      });
    }
    
    // Tab Switching Logic
    this.navButtons = {
      record: document.getElementById('nav-record'),
      library: document.getElementById('nav-library'),
      settings: document.getElementById('nav-settings')
    };
    
    this.sections = {
      record: document.getElementById('record-section'),
      library: document.getElementById('library-section'),
      settings: document.getElementById('settings-section')
    };

    Object.keys(this.navButtons).forEach(key => {
      const btn = this.navButtons[key];
      if (btn) {
        btn.addEventListener('click', () => this.switchTab(key));
      }
    });

    if (this.themeSelect) {
      this.themeSelect.addEventListener('change', () => this.toggleTheme());
    }

    // Auto-setup preview on load
    this.setupPreview();
  }

  toggleTheme() {
    if (!this.themeSelect) return;
    const isDark = this.themeSelect.value === 'dark';
    document.body.classList.toggle('dark-theme', isDark);
  }

  switchTab(tabKey) {
    console.log("Switching to tab:", tabKey);
    // Update Nav Buttons
    Object.keys(this.navButtons).forEach(key => {
      const btn = this.navButtons[key];
      if (btn) btn.classList.toggle('active', key === tabKey);
    });

    // Update Sections
    Object.keys(this.sections).forEach(key => {
      const section = this.sections[key];
      if (section) section.classList.toggle('hidden', key !== tabKey);
    });

    // If switching to record, ensure preview is active
    if (tabKey === 'record') {
      this.setupPreview();
    }
  }

  applyWebcamStyles() {
    if (!this.camContainer) return;
    const isPip = this.camContainer.classList.contains('pip-mode');
    this.camContainer.className = 'cam-overlay-container';
    if (isPip) this.camContainer.classList.add('pip-mode');

    if (this.webcamPreview) this.webcamPreview.className = '';

    // Apply Size
    if (this.camSize) {
      this.camContainer.classList.add(this.camSize.value);
    }

    // Apply Shape
    if (this.shapeCircle && this.shapeCircle.classList.contains('active')) {
      this.camContainer.classList.add('circle');
    }

    // Apply Position
    if (this.posBtns) {
      const activePos = Object.keys(this.posBtns).find(pos => this.posBtns[pos] && this.posBtns[pos].classList.contains('active'));
      if (activePos) {
        this.camContainer.classList.add(activePos);
      }
    }

    // Apply Filter
    if (this.camFilter && this.camFilter.value !== 'none' && this.webcamPreview) {
      this.webcamPreview.classList.add(`filter-${this.camFilter.value}`);
    }
  }

  async setupPreview() {
    try {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        try {
          this.stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always", frameRate: 60 },
            audio: true
          });
        } catch (err) {
          console.warn("Screen recording failed, falling back to camera:", err);
          this.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: true
          });
        }
      } else {
        console.warn("Screen recording not supported, falling back to camera.");
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true
        });
      }

      this.videoPreview.srcObject = this.stream;
      
      this.stream.getVideoTracks()[0].onended = () => {
         this.stopRecording();
      };
    } catch (err) {
      console.error("Error accessing media:", err);
    }
  }

  async toggleWebcamSource() {
    const isActive = this.webcamToggle.classList.toggle('active');
    if (isActive) {
      try {
        this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.webcamPreview.srcObject = this.webcamStream;
        this.camContainer.style.display = 'block';
      } catch (err) {
        console.error("Webcam access denied:", err);
        this.webcamToggle.classList.remove('active');
      }
    } else {
      if (this.webcamStream) {
        this.webcamStream.getTracks().forEach(track => track.stop());
      }
      this.camContainer.style.display = 'none';
    }
  }

  async startRecording() {
    if (this.isRecording) return;

    // 1. Initialize Audio Context immediately on user gesture to prevent mobile browsers from blocking it
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    if (!this.stream || !this.stream.active) {
      await this.setupPreview();
    }
    if (!this.stream) return;

    // --- Start Countdown Sequence ---
    this.countdownOverlay.classList.remove('hidden');
    this.countdownOverlay.classList.add('active');
    
    for (let i = 3; i > 0; i--) {
      this.countdownNumber.innerText = i;
      // Small pulse effect on number change
      this.countdownNumber.style.animation = 'none';
      this.countdownNumber.offsetHeight; // trigger reflow
      this.countdownNumber.style.animation = 'zoomInOut 1s ease-in-out';
      await new Promise(r => setTimeout(r, 1000));
    }
    
    this.countdownOverlay.classList.remove('active');
    setTimeout(() => this.countdownOverlay.classList.add('hidden'), 300);

    this.recordedChunks = [];
    
    this.audioDest = this.audioCtx.createMediaStreamDestination();

    // 2. Setup System Audio (from Screen Share)
    const systemAudioTracks = this.stream.getAudioTracks();
    if (systemAudioTracks.length > 0) {
      console.log("System Audio Track found:", systemAudioTracks[0].label);
      const systemSource = this.audioCtx.createMediaStreamSource(new MediaStream([systemAudioTracks[0]]));
      systemSource.connect(this.audioDest);
    } else {
      console.warn("No System Audio Track found. Did you check 'Share Audio'?");
    }

    // 3. Setup Microphone Audio with Noise Cleaning & Boost
    if (this.audioToggle.classList.contains('active')) {
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true 
          } 
        });
        
        console.log("Microphone Track found:", this.micStream.getAudioTracks()[0].label);
        const micSource = this.audioCtx.createMediaStreamSource(this.micStream);
        
        // --- NOISE CLEANER (High Pass Filter) ---
        const hpFilter = this.audioCtx.createBiquadFilter();
        hpFilter.type = "highpass";
        hpFilter.frequency.value = 100; // Slightly higher for better cleaning

        // --- CLARITY (Compressor) ---
        const compressor = this.audioCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, this.audioCtx.currentTime);
        compressor.knee.setValueAtTime(40, this.audioCtx.currentTime);
        compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
        compressor.attack.setValueAtTime(0, this.audioCtx.currentTime);
        compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);

        // --- VOLUME BOOST (Gain) ---
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 3.0; // Boosted to 3.0 for "Extra Volume"

        // Connect the chain
        micSource.connect(hpFilter);
        hpFilter.connect(compressor);
        compressor.connect(gainNode);
        gainNode.connect(this.audioDest);
        
        console.log("Audio Processing Pipeline active.");
      } catch (err) {
        console.error("Microphone access failed:", err);
      }
    }

    // 4. Setup Canvas Dimensions for Video
    const videoTrack = this.stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    this.canvas.width = settings.width || 1920;
    this.canvas.height = settings.height || 1080;

    // 5. Start Compositor Loop
    this.isRecording = true;
    this.drawCompositor();

    // 6. Capture Final Stream (Video from Canvas + Processed Audio)
    const canvasStream = this.canvas.captureStream(60);
    const processedAudioTracks = this.audioDest.stream.getAudioTracks();
    if (processedAudioTracks.length > 0) {
      canvasStream.addTrack(processedAudioTracks[0]);
    }

    this.mediaRecorder = new MediaRecorder(canvasStream, {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 8000000
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => this.saveRecording();

    this.mediaRecorder.start();
    this.startTime = Date.now();
    this.updateUIStatus(true);
    this.startTimer();
  }

  drawCompositor(isFromWorker = false) {
    if (!this.isRecording) return;

    // 1. Draw Background (Screen Capture)
    this.ctx.drawImage(this.videoPreview, 0, 0, this.canvas.width, this.canvas.height);

    // 2. Draw Webcam if active
    if (this.webcamStream && !this.isOutro) {
       const camWidth = this.canvas.width * 0.2;
       const camHeight = camWidth * (3/4);
       this.ctx.save();
       this.ctx.drawImage(this.webcamPreview, this.canvas.width - camWidth - 20, this.canvas.height - camHeight - 20, camWidth, camHeight);
       this.ctx.restore();
    }

    // 3. Draw Cursor Highlight (Pro Feature)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(this.mousePos.x, this.mousePos.y, 25, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
    this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
    this.ctx.fill();
    this.ctx.restore();

    // Only use rAF when tab is visible; Worker handles the background case
    if (!document.hidden && !isFromWorker) {
      requestAnimationFrame(() => this.drawCompositor());
    }
  }

  stopRecording() {
    if (!this.isRecording) return;
    this.mediaRecorder.stop();
    this.isRecording = false;
    this.updateUIStatus(false);
    this.stopTimer();
  }

  updateUIStatus(recording) {
    if (recording) {
      this.startBtn.innerText = "Recording...";
      this.startBtn.disabled = true;
      this.statusContainer.classList.add('recording');
      this.statusText.innerText = "Recording Live";
      this.floatingControls.classList.remove('hidden');
    } else {
      this.startBtn.innerText = "Start Recording";
      this.startBtn.disabled = false;
      this.statusContainer.classList.remove('recording');
      this.statusText.innerText = "Ready to record";
      this.floatingControls.classList.add('hidden');
    }
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const seconds = Math.floor((elapsed / 1000) % 60);
      const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
      const hours = Math.floor((elapsed / (1000 * 60 * 60)) % 24);
      
      this.timerDisplay.innerText = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
    this.timerDisplay.innerText = "00:00:00";
  }

  saveRecording() {
    const duration = Date.now() - this.startTime;
    const rawBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
    
    if (typeof ysFixWebmDuration !== 'undefined') {
      ysFixWebmDuration(rawBlob, duration, (fixedBlob) => {
        const url = URL.createObjectURL(fixedBlob);
        this.addToLibrary(url);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Kharkoo_Rec_${new Date().getTime()}.webm`;
        a.click();
      });
    } else {
      const url = URL.createObjectURL(rawBlob);
      this.addToLibrary(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Kharkoo_Rec_${new Date().getTime()}.webm`;
      a.click();
    }
  }

  addToLibrary(url) {
    const grid = document.getElementById('recording-grid');
    const empty = grid.querySelector('.empty-state');
    if (empty) empty.remove();

    const item = document.createElement('div');
    item.className = 'recording-card';
    item.innerHTML = `
      <div class="card-preview">
        <video src="${url}" controls></video>
      </div>
      <div class="card-info">
        <span class="card-title">Recording ${new Date().toLocaleTimeString()}</span>
        <span class="card-meta">WebM • ${Math.round(this.recordedChunks[0]?.size / 1024 / 1024 || 0)}MB</span>
      </div>
    `;
    grid.prepend(item);
  }
}

// Initialize the app
window.addEventListener('DOMContentLoaded', () => {
  new KharkooRecorder();
});
