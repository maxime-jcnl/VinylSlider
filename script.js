// Création du canva
const canvas = document.getElementById("vinylCanvas");
const ctx = canvas.getContext("2d");
const canvasWidth = 800;
const canvasHeight = 800;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// Paramètre du vinyl
let angle = 0;
const vinylRadius = Math.min(canvasWidth, canvasHeight) / 2 - 20;
const widthVal = 10;
const center = { x: canvas.width / 2, y: canvas.height / 2 };
let isRotating = true; // Cette variable passera en false pour mettre en pause la rotation

const elements = []; // Tableau de nos éléments placé sur le vinyl
let audioContext; // Variable pour la lecture des sons
const sounds = {};
const recordedSounds = []; // List to store recorded sounds

// Charger les fichiers audio pour chaque son
async function loadSounds() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const soundFiles = {
        kick: 'kick.wav',
        snare: 'snare.wav',
        hats: 'hh.wav',
        perc: 'perc.wav'
    };
    for (const [key, value] of Object.entries(soundFiles)) {
        const response = await fetch(value);
        const arrayBuffer = await response.arrayBuffer();
        sounds[key] = await audioContext.decodeAudioData(arrayBuffer);
    }
}

function playSound(sound, soundIndex = null) {
    if (sound === 'recorded' && soundIndex !== null) {
        const source = audioContext.createBufferSource();
        source.buffer = recordedSounds[soundIndex];
        source.connect(audioContext.destination);
        source.start(0);
    } else if (sounds[sound]) {
        const source = audioContext.createBufferSource();
        source.buffer = sounds[sound];
        source.connect(audioContext.destination);
        source.start(0);
    }
}

loadSounds();

let flashStartTime = null;
let flashing = false;
let selectedSound = 'kick'; // Son sélectionné par défaut
let selectedRecordedSoundIndex = null; // Index of the selected recorded sound

function drawVinyl() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(center.x, center.y);

    // Détecter le thème de l'utilisateur et ajuster les couleurs
    const darkMode = document.body.classList.contains('dark-mode');
    const vinylColor = darkMode ? "white" : "black";
    const elementColor = darkMode ? "black" : "white";
    const armColor = darkMode ? "black" : "white";

    // Dessiner le vinyle
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, vinylRadius, 0, Math.PI * 2, false);
    ctx.fillStyle = vinylColor;
    ctx.fill();

    // Dessiner les éléments placés
    elements.forEach((el) => {
        ctx.beginPath();
        ctx.arc(el.x, el.y, 20, 0, Math.PI * 2, false); // Augmenter la taille du point ici (20 au lieu de 10)
        ctx.fillStyle = elementColor;
        ctx.fill();
        checkCollision(el);
    });

    ctx.restore();

    // Dessiner la barre blanche (bras de lecture)
    drawArm(armColor);

    // Dessiner le rond blanc central par-dessus tout
    drawCenterCircle(elementColor);
}

function drawArm(color) {
    ctx.save();
    ctx.translate(center.x, center.y);

    const currentTime = Date.now();
    let armColor = color;
    if (flashing && flashStartTime !== null) {
        const elapsed = currentTime - flashStartTime;
        if (elapsed < 100) {
            armColor = color === "white" ? "black" : "white"; // Flash to the opposite color
        } else if (elapsed < 600) {
            const fade = (elapsed - 100) / 500;
            const white = Math.round(255 * fade);
            armColor = `rgb(${white}, ${white}, ${white})`; // Fade back to the initial color
        } else {
            flashing = false;
            flashStartTime = null;
        }
    }
    ctx.fillStyle = armColor;
    ctx.fillRect(0, -widthVal / 2, vinylRadius, widthVal);
    ctx.restore();
}

function drawCenterCircle(color) {
    ctx.beginPath();
    ctx.arc(center.x, center.y, vinylRadius / 9, 0, Math.PI * 2, false);
    ctx.fillStyle = color;
    ctx.fill();
}

function checkCollision(el) {
    // Convertir la position de l'élément dans le système de coordonnées du canvas
    const rotatedX = el.x * Math.cos(angle) - el.y * Math.sin(angle);
    const rotatedY = el.x * Math.sin(angle) + el.y * Math.cos(angle);

    // Vérifier si l'élément est dans la moitié droite du vinyle
    if (rotatedX >= 0) {
        // Vérifier si l'élément intersecte la barre blanche
        const armStartX = 0;
        const armEndX = vinylRadius;
        const armY = 0;

        const distX = Math.abs(rotatedX - armStartX);
        const distY = Math.abs(rotatedY - armY);

        const isColliding = distX <= armEndX && distY <= widthVal / 2;
        if (isColliding && !el.wasColliding) {
            playSound(el.sound, el.soundIndex);
            triggerFlash();
        }
        el.wasColliding = isColliding;
    } else {
        el.wasColliding = false; // Réinitialiser lorsque hors de la moitié droite
    }
}

function triggerFlash() {
    flashing = true;
    flashStartTime = Date.now();
}

document.getElementById("speedControl").addEventListener("input", function (e) {
    speed = parseFloat(e.target.value);
});

let speed = parseFloat(document.getElementById("speedControl").value);

function update() {
    if (isRotating) {
        angle += speed;
    }
    drawVinyl();
    if (isRotating) {
        requestAnimationFrame(update);
    }
}

document.addEventListener("keydown", function (e) {
    if (e.code === "Space") {
        isRotating = !isRotating;
        if (isRotating) {
            requestAnimationFrame(update);
        } else {
            drawVinyl(); // Redessiner le vinyle
        }
    }
});

// Ajouter la logique de sélection de son
const soundButtons = document.querySelectorAll('.sound-selector button');
soundButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        soundButtons.forEach(btn => btn.classList.remove('active', 'dark-mode', 'light-mode'));
        button.classList.add('active');
        if (index < 4) {
            selectedSound = ['kick', 'snare', 'hats', 'perc'][index];
            selectedRecordedSoundIndex = null;
        } else {
            selectedSound = 'recorded';
            selectedRecordedSoundIndex = recordedSounds.length - 1; // Use the most recent recording
        }
        updateActiveButtonStyles();
    });
});

// Définir le kick comme actif par défaut
const kickBtn = document.getElementById("kickBtn");
kickBtn.classList.add("active");
updateActiveButtonStyles();

// Recording functionality
let isRecording = false;
let mediaRecorder;
let recordedChunks = [];

const recordBtn = document.getElementById('recordBtn');
recordBtn.addEventListener('click', async () => {
    if (isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.style.backgroundColor = 'red';
        recordBtn.classList.remove('active');
    } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(recordedChunks, { type: 'audio/wav' });
            const arrayBuffer = await audioBlob.arrayBuffer();
            const decodedData = await audioContext.decodeAudioData(arrayBuffer);
            recordedSounds.push(decodedData); // Store the recording
            recordedChunks = [];
            selectedRecordedSoundIndex = recordedSounds.length - 1; // Update the selected index
        };

        mediaRecorder.start();
        isRecording = true;
        recordBtn.style.backgroundColor = 'blue';
        recordBtn.classList.add('active');
    }
});

function addElement(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - center.x;
    const mouseY = e.clientY - rect.top - center.y;

    const rotatedX = mouseX * Math.cos(-angle) - mouseY * Math.sin(-angle);
    const rotatedY = mouseX * Math.sin(-angle) + mouseY * Math.cos(-angle);

    const distanceFromCenter = Math.sqrt(
        rotatedX * rotatedX + rotatedY * rotatedY
    );
    const pointRadius = 20; // Augmenter la taille du point ici (20 au lieu de 10)
    const maxDistance = vinylRadius - pointRadius;
    const centerHoleRadius = vinylRadius / 9;

    // Vérifier les collisions avec les autres éléments
    for (let el of elements) {
        const dx = rotatedX - el.x;
        const dy = rotatedY - el.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 2 * pointRadius) {
            return; // Éviter de placer un nouvel élément s'il y a collision
        }
    }

    if (distanceFromCenter < centerHoleRadius + pointRadius) {
        const angleToPoint = Math.atan2(rotatedY, rotatedX);
        const x = (centerHoleRadius + pointRadius) * Math.cos(angleToPoint);
        const y = (centerHoleRadius + pointRadius) * Math.sin(angleToPoint);
        elements.push({ x, y, wasColliding: false, sound: selectedSound, soundIndex: selectedRecordedSoundIndex });
    } else if (distanceFromCenter > maxDistance) {
        const angleToPoint = Math.atan2(rotatedY, rotatedX);
        const x = maxDistance * Math.cos(angleToPoint);
        const y = maxDistance * Math.sin(angleToPoint);
        elements.push({ x, y, wasColliding: false, sound: selectedSound, soundIndex: selectedRecordedSoundIndex });
    } else {
        elements.push({ x: rotatedX, y: rotatedY, wasColliding: false, sound: selectedSound, soundIndex: selectedRecordedSoundIndex });
    }
    drawVinyl();
}

canvas.addEventListener("click", addElement);

canvas.addEventListener("contextmenu", function (e) {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - center.x;
    const mouseY = e.clientY - rect.top - center.y;

    const rotatedX = mouseX * Math.cos(angle) + mouseY * Math.sin(angle);
    const rotatedY = -mouseX * Math.sin(angle) + mouseY * Math.cos(angle);

    for (let i = 0; i < elements.length; i++) {
        const dx = rotatedX - elements[i].x;
        const dy = rotatedY - elements[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 10) {
            elements.splice(i, 1);
            break;
        }
    }

    drawVinyl();
});

document.getElementById("speedControl").addEventListener("input", function (e) {
    const speed = parseFloat(e.target.value);
    updateBpmDisplay(speed);
});

function updateBpmDisplay(speed) {
    const fps = 60;
    const bpm = Math.abs(speed) * fps * 60;
    document.getElementById("bpmDisplay").textContent = `BPM: ${Math.round(bpm)}`;
}

updateBpmDisplay(parseFloat(document.getElementById("speedControl").value));
update();

// Fonction pour appliquer le thème en fonction de la préférence de l'utilisateur
function applyTheme() {
    const darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark-mode', darkMode);
    document.body.classList.toggle('light-mode', !darkMode);

    // Mettre à jour les styles des boutons actifs
    updateActiveButtonStyles();

    drawVinyl(); // Redessiner le vinyle après le changement de thème
}

// Fonction pour mettre à jour les styles des boutons actifs
function updateActiveButtonStyles() {
    const darkMode = document.body.classList.contains('dark-mode');
    const activeButton = document.querySelector('.sound-selector button.active');
    if (activeButton) {
        if (darkMode) {
            activeButton.classList.add('dark-mode');
            activeButton.classList.remove('light-mode');
        } else {
            activeButton.classList.add('light-mode');
            activeButton.classList.remove('dark-mode');
        }
    }
}

// Appliquer le thème au chargement de la page
applyTheme();

// Écouter les changements de thème
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
