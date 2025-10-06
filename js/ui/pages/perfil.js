export function setupPerfilPage() {
    const changePictureBtn = document.getElementById('changePictureBtn');
    const fileInput = document.getElementById('fileInput');
    const profilePicture = document.getElementById('profilePicture');

    if (changePictureBtn && fileInput && profilePicture) {
        changePictureBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => { profilePicture.src = e.target.result; };
                reader.readAsDataURL(file);
            }
        });
    }
}