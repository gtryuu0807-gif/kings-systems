export function setupButtonEffects() {
    document.addEventListener("click", (event) => {
        const button = event.target.closest("button")

        if (!button || button.disabled) return

        button.classList.remove("buttonTap")
        void button.offsetWidth
        button.classList.add("buttonTap")
    })
}

