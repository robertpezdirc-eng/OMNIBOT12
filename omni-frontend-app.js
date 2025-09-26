// ==========================
// OMNI FRONTEND LOGIC
// ==========================

// Globalne spremenljivke za glasovne funkcije
let isListening = false;
let recognition = null;
let currentUtterance = null;

// Globalne spremenljivke za slike
let currentImage = null;
let currentImageUrl = null;

// Funkcija za upload slik
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Preveri tip datoteke
    if (!file.type.startsWith('image/')) {
        alert('Prosim, naloži samo slikovne datoteke.');
        return;
    }
    
    // Preveri velikost (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Slika je prevelika. Maksimalna velikost je 5MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        currentImageUrl = e.target.result;
        currentImage = file;
        showImagePreview(e.target.result, file.name, file.size);
    };
    reader.readAsDataURL(file);
}

// Prikaži predogled slike
function showImagePreview(imageUrl, fileName, fileSize) {
    const preview = document.getElementById('imagePreview');
    const fileSizeKB = Math.round(fileSize / 1024);
    
    preview.innerHTML = `
        <img src="${imageUrl}" alt="Naložena slika" />
        <div class="image-info">
            📁 ${fileName} (${fileSizeKB} KB)
        </div>
        <button class="remove-image" onclick="removeImage()">🗑️ Odstrani</button>
    `;
    
    preview.classList.add('active');
    
    // Posodobi placeholder
    const input = document.getElementById('userInput');
    input.placeholder = '🖼️ Slika naložena - vpiši vprašanje o sliki...';
}

// Odstrani sliko
function removeImage() {
    currentImage = null;
    currentImageUrl = null;
    
    const preview = document.getElementById('imagePreview');
    preview.classList.remove('active');
    preview.innerHTML = '';
    
    const input = document.getElementById('userInput');
    input.placeholder = 'Vpiši vprašanje ali ukaz...';
    
    // Počisti input
    document.getElementById('imageUpload').value = '';
}

// Dodaj sliko v pogovor
function addImageMessage(imageUrl, sender) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <img src="${imageUrl}" alt="Poslana slika" style="max-width: 300px; max-height: 200px; border-radius: 8px; object-fit: cover;" />
        </div>
        <div class="timestamp">${new Date().toLocaleTimeString()}</div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendToOmni() {
  const input = document.getElementById("userInput").value;
  if (!input && !currentImageUrl) {
    alert("⚠️ Vnesi vprašanje ali ukaz!");
    return;
  }

  // Prikaži loading
  document.getElementById("output").innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div class="loading"></div>
      <p>⏳ Omni razmišlja...</p>
    </div>
  `;
  
  // Posodobi status
  updateStatus("aiStatus", "Obdeluje...");

  try {
    // Pripravi podatke za pošiljanje
    const requestData = {
      input: input || 'Analiziraj to sliko',
      imageUrl: currentImageUrl
    };
    
    const res = await fetch("/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    let outputHTML = '';
    
    if (data.aiResponse) {
      outputHTML += `
        <h3>🧠 AI Odgovor</h3>
        <p>${data.aiResponse}</p>
      `;
    }
    
    if (data.visionResponse) {
      outputHTML += `
        <h3>🖼️ Vizualna analiza</h3>
        <p>${data.visionResponse}</p>
      `;
    }
    
    if (data.googleResponse) {
      // Preveri če je Google Search napaka
      if (data.googleResponse.includes('❌')) {
        outputHTML += `
          <h3>🌍 Google Search</h3>
          <div style="color: #ff6b6b; background: #fff5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #ff6b6b;">
            <p>${data.googleResponse}</p>
          </div>
        `;
      } else if (!data.googleResponse.includes('Ni rezultatov')) {
        outputHTML += `
          <h3>🌍 Google Search</h3>
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
            <p>${data.googleResponse}</p>
          </div>
        `;
      }
    }
    
    if (data.iotResponse) {
      outputHTML += `
        <h3>🏠 IoT</h3>
        <p>${data.iotResponse}</p>
      `;
    }
    
    outputHTML += `
      <h3>📝 Spomin</h3>
      <p>Shranjenih vnosov: ${data.memory ? data.memory.length : 0}</p>
    `;
    
    document.getElementById("output").innerHTML = outputHTML;
    
    // Posodobi status
    updateStatus("aiStatus", "Pripravljen");
    updateStatus("memoryCount", `${data.memory ? data.memory.length : 0} vnosov`);
    
    // Počisti input polje
    document.getElementById("userInput").value = "";
    
    // Počisti sliko po pošiljanju
    if (currentImageUrl) {
      removeImage();
    }
    
  } catch (err) {
    console.error("Napaka pri pošiljanju:", err);
    document.getElementById("output").innerHTML = `
      <div style="color: #ff6b6b; padding: 20px; text-align: center;">
        <h3>❌ Napaka</h3>
        <p>${err.message}</p>
        <p><small>Preveri, ali je OPENAI_API_KEY nastavljen</small></p>
      </div>
    `;
    updateStatus("aiStatus", "Napaka");
  }
}

// ==========================
// SPEECH-TO-TEXT (STT)
// ==========================

function startListening() {
  if (isListening) {
    stopListening();
    return;
  }

  // Preveri podporo za Web Speech API
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert("❌ Tvoj brskalnik ne podpira prepoznavanja govora. Poskusi z Chrome ali Edge.");
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  
  recognition.lang = "sl-SI"; // Slovenski jezik
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const micBtn = document.getElementById("micBtn");
  
  recognition.onstart = function() {
    isListening = true;
    micBtn.textContent = "🔴 Poslušam...";
    micBtn.classList.add("listening");
    updateStatus("aiStatus", "Poslušam govor...");
    console.log("🎤 Začenjam poslušanje...");
  };

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    const confidence = event.results[0][0].confidence;
    
    console.log(`🎤 Prepoznan govor: "${transcript}" (zaupanje: ${confidence})`);
    
    // Vnesi prepoznan tekst v polje
    document.getElementById("userInput").value = transcript;
    
    // Avtomatsko pošlji vprašanje
    setTimeout(() => {
      sendToOmni();
    }, 500);
  };

  recognition.onerror = function(event) {
    console.error("❌ Napaka pri prepoznavanju govora:", event.error);
    let errorMsg = "Neznana napaka";
    
    switch(event.error) {
      case 'no-speech':
        errorMsg = "Ni zaznanega govora. Poskusi znova.";
        break;
      case 'audio-capture':
        errorMsg = "Ni dostopa do mikrofona.";
        break;
      case 'not-allowed':
        errorMsg = "Dostop do mikrofona je zavrnjen.";
        break;
      case 'network':
        errorMsg = "Napaka omrežja.";
        break;
      default:
        errorMsg = `Napaka: ${event.error}`;
    }
    
    alert(`❌ ${errorMsg}`);
    stopListening();
  };

  recognition.onend = function() {
    stopListening();
  };

  try {
    recognition.start();
  } catch (err) {
    console.error("❌ Napaka pri zagonu prepoznavanja:", err);
    alert("❌ Napaka pri zagonu prepoznavanja govora.");
    stopListening();
  }
}

function stopListening() {
  isListening = false;
  const micBtn = document.getElementById("micBtn");
  
  if (micBtn) {
    micBtn.textContent = "🎤 Govori";
    micBtn.classList.remove("listening");
  }
  
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  
  updateStatus("aiStatus", "Pripravljen");
}

// ==========================
// TEXT-TO-SPEECH (TTS)
// ==========================

function speakOutput() {
  // Ustavi trenutni govor, če se predvaja
  if (currentUtterance) {
    speechSynthesis.cancel();
    currentUtterance = null;
    return;
  }

  const outputElement = document.getElementById("output");
  if (!outputElement) {
    alert("❌ Ni vsebine za predvajanje.");
    return;
  }

  // Pridobi samo besedilo (brez HTML tagov)
  let textToSpeak = outputElement.innerText || outputElement.textContent;
  
  // Očisti besedilo
  textToSpeak = textToSpeak
    .replace(/🧠 AI Odgovor/g, "AI odgovor:")
    .replace(/🌍 Google/g, "Google rezultat:")
    .replace(/📝 Spomin/g, "Spomin:")
    .replace(/Shranjenih vnosov:/g, "Shranjenih je")
    .trim();

  if (!textToSpeak || textToSpeak.length < 3) {
    alert("❌ Ni besedila za predvajanje.");
    return;
  }

  // Preveri podporo za Web Speech Synthesis API
  if (!('speechSynthesis' in window)) {
    alert("❌ Tvoj brskalnik ne podpira sinteze govora.");
    return;
  }

  currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
  
  // Nastavitve za slovenski govor
  currentUtterance.lang = "sl-SI";
  currentUtterance.rate = 0.9; // Hitrost govora
  currentUtterance.pitch = 1.0; // Višina glasu
  currentUtterance.volume = 1.0; // Glasnost

  // Poskusi najti slovenski glas
  const voices = speechSynthesis.getVoices();
  const slovenianVoice = voices.find(voice => 
    voice.lang.startsWith('sl') || 
    voice.name.toLowerCase().includes('sloven')
  );
  
  if (slovenianVoice) {
    currentUtterance.voice = slovenianVoice;
    console.log(`🔊 Uporabljam glas: ${slovenianVoice.name}`);
  } else {
    console.log("🔊 Slovenski glas ni na voljo, uporabljam privzeti glas.");
  }

  currentUtterance.onstart = function() {
    updateStatus("aiStatus", "Predvajam govor...");
    console.log("🔊 Začenjam predvajanje govora...");
  };

  currentUtterance.onend = function() {
    currentUtterance = null;
    updateStatus("aiStatus", "Pripravljen");
    console.log("🔊 Predvajanje končano.");
  };

  currentUtterance.onerror = function(event) {
    console.error("❌ Napaka pri predvajanju govora:", event.error);
    currentUtterance = null;
    updateStatus("aiStatus", "Napaka pri govoru");
  };

  // Začni predvajanje
  speechSynthesis.speak(currentUtterance);
}

// ==========================
// POMOŽNE FUNKCIJE
// ==========================

function updateStatus(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

// Preveri povezavo s strežnikom
async function checkConnection() {
  try {
    const res = await fetch("/status");
    const data = await res.json();
    updateStatus("connectionStatus", "Aktivna");
    console.log("✅ Povezava s strežnikom uspešna:", data);
  } catch (err) {
    updateStatus("connectionStatus", "Napaka");
    console.error("❌ Napaka pri povezavi:", err);
  }
}

// Inicializacija ob nalaganju strani
document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById("userInput");
  if (input) {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendToOmni();
      }
    });
  }
  
  // Preveri povezavo ob nalaganju
  checkConnection();
  
  // Naloži glasove (potrebno za nekatere brskalnike)
  if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    
    // Nekateri brskalniki potrebujejo event listener
    speechSynthesis.addEventListener('voiceschanged', function() {
      console.log("🔊 Glasovi naloženi:", speechSynthesis.getVoices().length);
    });
  }
  
  console.log("✅ Omni Dashboard inicializiran z glasovnimi funkcijami!");
});