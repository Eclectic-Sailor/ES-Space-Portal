fetch("launches.json")
.then(res => res.json())
.then(data => {
    const section = document.querySelector("#Launch_tracking div");
    section.innerHTML = data.results.map(launch => `
    <p><strong>${launch.name}</stong><br>
    ${launch.net} - ${launch.pad.name}</p>
    `).join("");
});
