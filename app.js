document.addEventListener("DOMContentLoaded", function() {
    // Initialize Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDAjjHIa2ZPqQ_Ybqp-uHbOleKwTV7AQAc",
        authDomain: "lecor-f87a8.firebaseapp.com",
        projectId: "lecor-f87a8",
        storageBucket: "lecor-f87a8",
        messagingSenderId: "606158282239",
        appId: "1:606158282239:web:40537977bdf29e86059bca",
        measurementId: "G-21F11LBMR6",
        databaseURL: "https://lecor-f87a8-default-rtdb.asia-southeast1.firebasedatabase.app/"
    };
    firebase.initializeApp(firebaseConfig);

    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();
    const rtdb = firebase.database();

    let map;
    let isMarking = false;
    let currentMarkers = [];
    let markerCount = 0;
    const maxMarkers = 1;

    function initMap() {
        map = L.map('map').setView([23.8103, 90.4125], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        loadMarkersFromFirestore();

        map.on('click', (e) => {
            if (isMarking && markerCount < maxMarkers) {
                const projectName = prompt("Enter project name:");
                if (!projectName) return;
                document.getElementById('project-name').value = projectName;
                const projectType = document.getElementById('project-type').value;
                const color = getProjectColor(projectType);

                const marker = L.circleMarker(e.latlng, {
                    color: color,
                    radius: 8
                }).addTo(map)
                    .bindPopup(`Project: ${projectName}<br>Type: ${projectType}<br><button onclick="openChatroom('${projectName}')">Open Chatroom</button>`)
                    .openPopup();

                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-marker-btn';
                deleteButton.textContent = 'X';
                deleteButton.onclick = () => {
                    map.removeLayer(marker);
                    currentMarkers = currentMarkers.filter(m => m.marker !== marker);
                    markerCount--;
                    if (markerCount < maxMarkers) {
                        isMarking = true;
                        document.getElementById('mark-area-button').textContent = 'Stop Marking';
                    }
                };

                marker.getElement().appendChild(deleteButton);

                currentMarkers.push({ marker, projectName, projectType, location: e.latlng });
                markerCount++;
                if (markerCount >= maxMarkers) {
                    isMarking = false;
                    document.getElementById('mark-area-button').textContent = 'Mark Area';
                }

                createChatroom(projectName);
            }
        });
    }

    async function loadMarkersFromFirestore() {
    const snapshot = await db.collection("projects").get();
    snapshot.forEach(doc => {
        const data = doc.data();
        const location = data.location;

        if (location && location.latitude && location.longitude) {
            const projectType = data.type;
            const color = getProjectColor(projectType);

            L.circleMarker([location.latitude, location.longitude], {
                color: color,
                radius: 8
            }).addTo(map)
                .bindPopup(`Project: ${data.name}<br>Type: ${data.type}<br>Description: ${data.description}<br><button onclick="openChatroom('${data.name}')">Open Chatroom</button>`)
                .openPopup();
        } else {
            console.error('Invalid location data:', location);
        }
    });
    }

    function locateUser() {
        map.locate({ setView: true, maxZoom: 16 });

        map.on('locationfound', (e) => {
            L.marker(e.latlng).addTo(map)
                .bindPopup('You are here!')
                .openPopup();
            map.setView(e.latlng, 16);
        });

        map.on('locationerror', () => {
            alert('Could not get your location.');
        });
    }

    function getProjectColor(type) {
        if (type === 'cleanup') {
            return '#3aeb34'; // Light Green for Cleanup
        } else if (type === 'calligraphy') {
            return '#349beb'; // Light Purple for Calligraphy
        }
        return '#000000'; // Default to black if no type is selected
    }

    document.getElementById('locate-button').addEventListener('click', locateUser);

    document.getElementById('mark-area-button').addEventListener('click', () => {
        if (markerCount >= maxMarkers) {
            alert('You can only mark one area at a time. Please submit the current project first.');
            return;
        }
        isMarking = !isMarking;
        document.getElementById('mark-area-button').textContent = isMarking ? 'Stop Marking' : 'Mark Area';
    });

    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectName = document.getElementById('project-name').value;
        const projectType = document.getElementById('project-type').value;
        const location = currentMarkers[0].location;
        const description = document.getElementById('description').value;
        const photo = document.getElementById('photo').files[0];

        try {
            let photoURL = null;
            if (photo) {
                const storageRef = storage.ref(`project_photos/${projectName}`);
                await storageRef.put(photo);
                photoURL = await storageRef.getDownloadURL();
            }

            await db.collection('projects').add({
                name: projectName,
                type: projectType,
                location: new firebase.firestore.GeoPoint(location.lat, location.lng),
                description: description,
                photoURL: photoURL
            });

            alert('Project submitted successfully!');
            map.removeLayer(currentMarkers[0].marker);
            currentMarkers = [];
            markerCount = 0;
            isMarking = true;
            document.getElementById('mark-area-button').textContent = 'Stop Marking';
            document.getElementById('report-form').reset();
        } catch (error) {
            console.error('Error adding document: ', error);
            alert('Failed to submit project.');
        }
    });

    initMap();

    // Google Login
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const deleteAccountButton = document.getElementById('delete-account-button');

    loginButton.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(result => {
                alert(`Logged in as ${result.user.displayName}`);
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';
                deleteAccountButton.style.display = 'block';
            })
            .catch(error => {
                console.error('Error during sign in:', error);
            });
    });

    logoutButton.addEventListener('click', () => {
        auth.signOut()
            .then(() => {
                alert('Logged out successfully.');
                loginButton.style.display = 'block';
                logoutButton.style.display = 'none';
                deleteAccountButton.style.display = 'none';
            })
            .catch(error => {
                console.error('Error during sign out:', error);
            });
    });

    deleteAccountButton.addEventListener('click', () => {
        const user = auth.currentUser;
        if (user) {
            user.delete()
                .then(() => {
                    alert('Account deleted successfully.');
                    loginButton.style.display = 'block';
                    logoutButton.style.display = 'none';
                    deleteAccountButton.style.display = 'none';
                })
                .catch(error => {
                    console.error('Error deleting account:', error);
                });
        }
    });
});
