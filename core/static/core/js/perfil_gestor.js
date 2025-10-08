import { BASE_URL, ApiData } from "/static/js/api.js";
const input  = document.getElementById('profilePicInput')
const img  = document.getElementById('imgcontainer')
input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) {
        const imageUrl = URL.createObjectURL(file);
        img.src = imageUrl;
    }
});
//oi