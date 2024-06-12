document.addEventListener('DOMContentLoaded', () => {
    const enterButton = document.getElementById('enterButton');

    if (enterButton) {
        enterButton.addEventListener('click', () => {
            enterButton.style.opacity = 0;
            setTimeout(() => {
                window.location.href = '../html/index.html';
            }, 500); // Correspond à la durée de la transition
        });
    }
});
