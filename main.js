let satellites = [];

fetch('stations.txt')
.then(response => response.text())
.then(text => {
    const lines = text.trim().split('\n');
    console.log("total lanes: ", lines.length);
    for (let i = 0; i < lines.length; i += 3) {
        const name = lines[i];
        const tleLine1 = lines[i + 1];
        const tleLine2 = lines[i + 2];

        if (!name || !tleLine1 || !tleLine2) continue;

        try {
            const satrec = satellite.twoline2satrec(tleLine1, tleLine2)

            satellites.push({
                name,
                satrec,
                marker: null
            });
            console.log("Loaded satellite: ", name);
        } catch (err){
            console.warn(`Failed to created satrec for ${name}`, err);
        }
    }
    console.log("Total number of satallites processed: ", satellites.length);
    
    const map = L.map('map', {
        minZoom: 2,
        maxZoom: 10
    }).setView([0,0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    // Group by close orbit (same craft)
    function isCloseEnough(satA, satB) {
        const now = new Date();
        const posA = satellite.propagate(satA.satrec, now).position;
        const posB = satellite.propagate(satB.satrec, now).position;
        if (!posA || !posB) return false;

        const gmst = satellite.gstime(now);
        const coordsA = satellite.eciToGeodetic(posA, gmst);
        const coordsB = satellite.eciToGeodetic(posB, gmst);

        const latDiff = Math.abs(satellite.degreesLat(coordsA.latitude) - satellite.degreesLat(coordsB.latitude));
        const lonDiff = Math.abs(satellite.degreesLong(coordsA.longitude) - satellite.degreesLong(coordsB.longitude));

        return latDiff < 0.02 && lonDiff < 0.02;
    }

    let groups = [];
    satellites.forEach(sat => {
        let added = false;
        for (let group of groups) {
            if (isCloseEnough(sat, group[0])) {
                group.push(sat);
                added = true;
                break;
            }
        }
        if (!added) groups.push([sat]);
    });

    // Create one marker per group
    groups.forEach(group => {
        const now = new Date();
        const result = satellite.propagate(group[0].satrec, now);
        if (!result || !result.position) return;

        const gmst = satellite.gstime(now);
        const coords = satellite.eciToGeodetic(result.position, gmst);

        const lat = satellite.degreesLat(coords.latitude);
        const lon = satellite.degreesLong(coords.longitude);

        const name = group.map(s => s.name.trim()).join(" + ");

        const marker = L.marker([lat, lon])
            .addTo(map)
            .bindPopup(`${name}<br>${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);

        group.forEach(sat => sat.marker = marker);
    });

    satellites.forEach((sat) => {
        const now = new Date();
        const result = satellite.propagate(sat.satrec, now);
        if (!result || !result.position || isNaN(result.position.x)){
            console.warn(`Skipping ${sat.name}, no position`);
            return;
        }
        const gmst = satellite.gstime(now);
        const coords = satellite.eciToGeodetic(result.position, gmst);
        const latitude = satellite.degreesLat(coords.latitude);
        const longitude = satellite.degreesLong(coords.longitude);
        
        console.log(`Placing marker for ${sat.name} at ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
        const marker = L.marker([latitude, longitude])
            .addTo(map)
            .bindPopup(`${sat.name}<br>${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
        
        sat.marker = marker;
    })

    setInterval(() => {
        const now = new Date();

        satellites.forEach((sat) => {
            const pv_result = satellite.propagate(sat.satrec, now);
            if (!pv_result || !pv_result.position || isNaN(pv_result.position.x)) {
                console.warn(`No position for ${sat.name}`);
                return;
            }
            const gmst = satellite.gstime(now);
            const coords = satellite.eciToGeodetic(pv_result.position, gmst);
            if (!coords || isNaN(coords.latitude) || isNaN(coords.longitude)){
                console.warn(`Invalid coordinates for: ${sat.name}`);
                return;
            }
            const latitude = satellite.degreesLat(coords.latitude);
            const longitude = satellite.degreesLong(coords.longitude);
            if (sat.marker){
                sat.marker.setLatLng([latitude, longitude]);
                sat.marker.setPopupContent(`${sat.name}`);
            }
        });
    }, 1000);
})
.catch(error => console.error('Failed to fetch TLE:', error))

/*
window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const h1 = document.querySelector('header h1');
    h1.style.backgroundPosition = `center ${scrollTop * 0.5}px`;
})
*/
