let _save: SaveData = {};
window.getSave = () => {

    return {

    }
}

let _time: Time;
window.getTime = () => {

    if (!_time) {
        const hour = new Date().getHours();

        // open 8am - 11pm
        if (hour < 8 || hour > 22) {
            _time = "closed";
        }
        else if (hour <= 11) {
            _time = "morning";
        }
        else if (hour <= 16) {
            _time = "afternoon";
        }
        else {
            _time = "evening";
        }
    }

    return _time;
}

function init() {
    // document.querySelectorAll("[data-time]").forEach(_e => { _e.innerHTML = window.getTime(); });


    const contentContainer = document.querySelector("[data-content]") as HTMLElement;
    function setupNewCard() {
        document.querySelectorAll("[data-choice]").forEach(_e => {
            const button = _e as HTMLElement;
            const url = button.dataset.choice;
            if (!url) {
                return;
            }

            _e.addEventListener("click", async () => {
                const respose = await fetch(url);
                contentContainer.innerHTML = await respose.text();
                setupNewCard();
            })
        });
    }
    setupNewCard();
    
}


document.addEventListener("DOMContentLoaded", init);