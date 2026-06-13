import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// ==========================================
// GANTIKAN DENGAN KONFIGURASI FIREBASE KORANG
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "projek-sekolah-korang.firebaseapp.com",
    projectId: "projek-sekolah-korang",
    storageBucket: "projek-sekolah-korang.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcde12345"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Global state untuk memegang data memori & event terpilih
let allMemories = [];
let activeEventFilter = "Semua Gambar";

// DOM Elemen
const galleryGrid = document.getElementById('galleryGrid');
const eventFilterContainer = document.getElementById('eventFilterContainer');
const existingEventsDatalist = document.getElementById('existingEvents');
const postForm = document.getElementById('postForm');
const uploadStatus = document.getElementById('uploadStatus');

// LOGIK MODAL POPUP (Buka/Tutup)
const uploadModal = document.getElementById('uploadModal');
document.getElementById('openModalBtn').addEventListener('click', () => {
    uploadModal.classList.remove('hidden');
    setTimeout(() => { uploadModal.classList.remove('opacity-0'); uploadModal.querySelector('div').classList.remove('scale-95'); }, 10);
});
const closeModal = () => {
    uploadModal.classList.add('opacity-0');
    uploadModal.querySelector('div').classList.add('scale-95');
    setTimeout(() => uploadModal.classList.add('hidden'), 3000);
};
document.getElementById('closeModalBtn').addEventListener('click', closeModal);

// 1. FUNGSI MUAT NAIK GAMBAR BESERTA EVENT
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const eventName = document.getElementById('eventInput').value.trim();
    const imageFile = document.getElementById('imageInput').files[0];

    if (!eventName || !imageFile) return;

    uploadStatus.classList.remove('hidden');
    uploadStatus.innerText = "Memuat naik gambar ke cloud...";

    try {
        const storageRef = ref(storage, `galeri/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        const downloadURL = await getDownloadURL(snapshot.ref);

        await addDoc(collection(db, "memori"), {
            event: eventName,
            imageUrl: downloadURL,
            createdAt: new Date()
        });

        postForm.reset();
        uploadStatus.innerText = "Selesai di-upload!";
        setTimeout(() => { uploadStatus.classList.add('hidden'); closeModal(); }, 1500);
    } catch (err) {
        console.error(err);
        uploadStatus.innerText = "Gagal memuat naik. Sila cuba lagi.";
    }
});

// 2. FUNGSI MENYUSUN & MENAPIS LAYOUT GAMBAR (REAL-TIME)
const q = query(collection(db, "memori"), orderBy("createdAt", "desc"));
onSnapshot(q, (querySnapshot) => {
    allMemories = [];
    const eventsSet = new Set();

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        allMemories.push(data);
        if (data.event) eventsSet.add(data.event);
    });

    renderFilters(Array.from(eventsSet));
    renderGallery();
});

// Papar senarai butang filter mengikut event
function renderFilters(eventsList) {
    existingEventsDatalist.innerHTML = "";
    eventFilterContainer.innerHTML = "";

    // Butang untuk paparan semua gambar
    const allBtn = document.createElement('button');
    allBtn.className = `filter-btn px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeEventFilter === "Semua Gambar" ? "active-filter" : ""}`;
    allBtn.innerText = "Semua Gambar";
    allBtn.addEventListener('click', () => { activeEventFilter = "Semua Gambar"; updateFilterUI(allBtn); renderGallery(); });
    eventFilterContainer.appendChild(allBtn);

    eventsList.forEach(event => {
        // Masukkan dalam auto-complete senarai input
        const option = document.createElement('option');
        option.value = event;
        existingEventsDatalist.appendChild(option);

        // Bina butang penapis bagi setiap event
        const btn = document.createElement('button');
        btn.className = `filter-btn px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeEventFilter === event ? "active-filter" : ""}`;
        btn.innerText = event;
        btn.addEventListener('click', () => { activeEventFilter = event; updateFilterUI(btn); renderGallery(); });
        eventFilterContainer.appendChild(btn);
    });
}

function updateFilterUI(activeButton) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active-filter'));
    activeButton.classList.add('active-filter');
}

// Render gambar masuk ke dalam layout grid yang cantik
function renderGallery() {
    galleryGrid.innerHTML = "";

    const filtered = activeEventFilter === "Semua Gambar" 
        ? allMemories 
        : allMemories.filter(m => m.event === activeEventFilter);

    if (filtered.length === 0) {
        galleryGrid.innerHTML = `<div class="col-span-full text-center text-gray-500 py-12 text-sm">Tiada gambar dalam album ini.</div>`;
        return;
    }

    filtered.forEach(data => {
        const card = document.createElement('div');
        // Layout kad dengan border gelap, rounded, dan zoom-effect semasa hover
        card.className = "group relative bg-[#1a1b20] rounded-2xl overflow-hidden border border-[#2c2e36] hover:border-gray-700 transition-all duration-300 shadow-md";
        
        card.innerHTML = `
            <div class="w-full h-64 overflow-hidden bg-[#121316]">
                <img src="${data.imageUrl}" alt="${data.event}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 loading="lazy"">
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <span class="bg-blue-600 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">${data.event}</span>
            </div>
            <div class="p-4 flex items-center justify-between">
                <p class="text-xs font-semibold text-gray-300 truncate">${data.event}</p>
                <span class="text-[10px] text-gray-500">Imbas Kembali</span>
            </div>
        `;
        galleryGrid.appendChild(card);
    });
}
