/* ============================================================
   COLA LAVADERO
   SCRIPT.JS
============================================================ */

const STORAGE_KEY = "cola_lavadero";

let queue = [];
let editingId = null;
let confirmAction = null;
let nextCarNumber = 1;

/* ============================================================
    ATAJOS DOM
============================================================ */

const $ = (id) => document.getElementById(id);

const els = {

    queue: $("queue"),
    active: $("activeContainer"),

    queueCount: $("queueCount"),
    lastFinish: $("lastFinish"),
    remainingDay: $("remainingDay"),
    currentDate: $("currentDate"),

    modal: $("modalOverlay"),
    confirm: $("confirmOverlay"),

    modalTitle: $("modalTitle"),

    form: $("carForm"),

    type: $("carType"),

    customContainer: $("customMinutesContainer"),

    customMinutes: $("customMinutes"),

    clientName: $("clientName"),

    clientPhone: $("clientPhone")

};

/* ============================================================
    UTILIDADES
============================================================ */

function uid() {

    return crypto.randomUUID();

}

function pad(num) {

    return String(num).padStart(2, "0");

}

function formatHour(date) {

    return pad(date.getHours()) + ":" + pad(date.getMinutes());

}

function addMinutes(date, minutes) {

    return new Date(

        date.getTime() + minutes * 60000

    );

}

function diffMinutes(a, b) {

    return Math.floor(

        (b.getTime() - a.getTime()) / 60000

    );

}

function now() {

    return new Date();

}

/* ============================================================
    LOCAL STORAGE
============================================================ */

function saveQueue() {

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(queue)

    );

}

function loadQueue() {

    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) {

        queue = [];
        nextCarNumber = 1;
        return;

    }

    try {

        queue = JSON.parse(data);

        if (queue.length > 0) {

            nextCarNumber =
                Math.max(...queue.map(car => car.number || 0)) + 1;

        } else {

            nextCarNumber = 1;

        }

    }

    catch {

        queue = [];
        nextCarNumber = 1;

    }

}

/* ============================================================
    CREAR COCHE
============================================================ */

function createCar(duration, type, client = "", phone = "") {

    const car = {

        id: uid(),

        number: nextCarNumber++,

        type,

        duration,

        client,

        phone,

        start: null,

        end: null,

        realStart: null

    };

    queue.push(car);

    if (queue.length === 1) {

        queue[0].realStart = now().toISOString();

    }

    recalculateQueue();

    saveQueue();

}

/* ============================================================
    RECALCULAR COLA
============================================================ */

function recalculateQueue() {

    if (queue.length === 0) {

        return;

    }

    let current = queue[0].realStart

        ? new Date(queue[0].realStart)

        : now();

    queue[0].realStart = current.toISOString();

    for (const car of queue) {

        car.start = current.toISOString();

        current = addMinutes(

            current,

            car.duration

        );

        car.end = current.toISOString();

    }

    saveQueue();

}

/* ============================================================
    MODAL
============================================================ */

function openModal(mode = "new", car = null) {

    editingId = null;

    els.form.reset();

    els.customContainer.classList.add("hidden");

    if (mode === "edit") {

        editingId = car.id;

        els.modalTitle.textContent = "Editar coche";

        if (car.type === "Personalizado") {

            els.type.value = "custom";

            els.customContainer.classList.remove("hidden");

            els.customMinutes.value = car.duration;

        } else {

            els.type.value = String(car.duration);

        }

        els.clientName.value = car.client;

        els.clientPhone.value = car.phone;

    } else {

        els.modalTitle.textContent = "Nuevo coche";

        els.type.value = "25";

        els.clientName.value = "";

        els.clientPhone.value = "";

        els.customMinutes.value = "";

    }

    els.modal.classList.remove("hidden");

}

function closeModal() {

    editingId = null;

    els.modal.classList.add("hidden");

}

/* ============================================================
    CONFIRMACIONES
============================================================ */

function showConfirm(text, action) {

    $("confirmText").textContent = text;

    confirmAction = action;

    els.confirm.classList.remove("hidden");

}

function closeConfirm() {

    confirmAction = null;

    els.confirm.classList.add("hidden");

}

function acceptConfirm() {

    if (typeof confirmAction === "function") {

        confirmAction();

    }

    closeConfirm();

}

/* ============================================================
    EDITAR
============================================================ */

function editCar(id) {

    if (queue.length === 0) return;

    if (queue[0].id === id) return;

    const car = queue.find(c => c.id === id);

    if (!car) return;

    openModal("edit", car);

}

/* ============================================================
    ELIMINAR
============================================================ */

function deleteCar(id) {

    if (queue.length === 0) return;

    if (queue[0].id === id) return;

    showConfirm(

        "¿Eliminar este coche?",

        () => {

            queue = queue.filter(

                car => car.id !== id

            );

            recalculateQueue();

            render();

        }

    );

}

/* ============================================================
    MOVER ARRIBA
============================================================ */

function moveCarUp(id) {

    const index = queue.findIndex(

        car => car.id === id

    );

    if (index <= 1) return;

    [

        queue[index - 1],

        queue[index]

    ] = [

        queue[index],

        queue[index - 1]

    ];

    recalculateQueue();

    render();

}

/* ============================================================
    MOVER ABAJO
============================================================ */

function moveCarDown(id) {

    const index = queue.findIndex(

        car => car.id === id

    );

    if (index === -1) return;

    if (index === queue.length - 1) return;

    [

        queue[index],

        queue[index + 1]

    ] = [

        queue[index + 1],

        queue[index]

    ];

    recalculateQueue();

    render();

}

/* ============================================================
    FINALIZAR COCHE
============================================================ */

function finishCurrentCar() {

    if (queue.length === 0) return;

    const finishTime = now();

    queue.shift();

    if (queue.length > 0) {

        queue[0].realStart = finishTime.toISOString();

    }

    recalculateQueue();

    render();

}

/* ============================================================
    REINICIAR JORNADA
============================================================ */

function resetDay() {

    showConfirm(

        "¿Reiniciar la jornada?",

        () => {

            queue = [];

            saveQueue();

            render();

        }

    );

}

/* ============================================================
    CABECERA
============================================================ */

function updateHeader() {

    els.currentDate.textContent = new Date().toLocaleDateString(
        "es-ES",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

    els.queueCount.textContent = queue.length;

    if (queue.length === 0) {

        els.lastFinish.textContent = "--";

        els.remainingDay.textContent = "--";

        return;

    }

    const end = new Date(
        queue[queue.length - 1].end
    );

    els.lastFinish.textContent = formatHour(end);

    const mins = Math.max(
        0,
        diffMinutes(now(), end)
    );

    const h = Math.floor(mins / 60);

    const m = mins % 60;

    els.remainingDay.textContent =
        h > 0
            ? `${h} h ${m} min`
            : `${m} min`;

}

/* ============================================================
    PROGRESO
============================================================ */

function getProgress(car) {

    const start = new Date(car.start);

    const elapsed = diffMinutes(
        start,
        now()
    );

    let percent =
        (elapsed / car.duration) * 100;

    percent = Math.max(0, percent);

    percent = Math.min(100, percent);

    return Math.round(percent);

}

function getRemaining(car) {

    const start = new Date(car.start);

    const elapsed = diffMinutes(
        start,
        now()
    );

    const left =
        car.duration - elapsed;

    if (left >= 0) {

        return `Quedan ${left} min`;

    }

    return `+${Math.abs(left)} min`;

}

/* ============================================================
    TARJETA
============================================================ */

function cardHTML(car, index, active = false) {

    return `

<div class="car-card">

    <div class="car-header">

        <div class="car-title">

            ${
                active
                    ? `🚗 En proceso (Coche ${car.number})`
                    : `🚗 Coche ${car.number}`
            }

        </div>

        <div class="badge">

            ${car.type}

        </div>

    </div>

    ${
        active
            ? `
        <div class="progress">

            <div
                class="progress-bar"
                style="width:${getProgress(car)}%">

            </div>

        </div>

        <div class="timer">

            <p>

                ${getRemaining(car)}

            </p>

        </div>
        `
            : ""
    }

    <div class="car-grid">

        <div class="info">

            <span class="info-label">

                Inicio

            </span>

            <span class="info-value">

                ${formatHour(new Date(car.start))}

            </span>

        </div>

        <div class="info">

            <span class="info-label">

                Fin

            </span>

            <span class="info-value">

                ${formatHour(new Date(car.end))}

            </span>

        </div>

        <div class="info">

            <span class="info-label">

                Duración

            </span>

            <span class="info-value">

                ${car.duration} min

            </span>

        </div>

        <div class="info">

            <span class="info-label">

                Cliente

            </span>

            <span class="info-value">

                ${car.client || "-"}

            </span>

        </div>

        <div class="info">

            <span class="info-label">

                Teléfono

            </span>

            <span class="info-value">

                ${car.phone || "-"}

            </span>

        </div>

    </div>

    ${
        active
            ? `

<button
class="finish"
style="margin-top:20px;width:100%;height:90px;font-size:30px"
onclick="finishCurrentCar()">

✅ FINALIZADO

</button>

`
            : `

<div class="card-buttons">

<button
class="secondary"
onclick="editCar('${car.id}')">

Editar

</button>

<button
class="danger"
onclick="deleteCar('${car.id}')">

Eliminar

</button>

</div>

<div class="move-buttons">

<button
onclick="moveCarUp('${car.id}')"
${index===1?"disabled":""}>

⬆️

</button>

<button
onclick="moveCarDown('${car.id}')"
${index===queue.length-1?"disabled":""}>

⬇️

</button>

</div>

`
    }

</div>

`;

}
/* ============================================================
    RENDER COCHE ACTIVO
============================================================ */

function renderActive() {

    if (queue.length === 0) {

        els.active.innerHTML = `

            <div class="car-card">

                <div class="car-title">

                    No hay coches en cola

                </div>

            </div>

        `;

        return;

    }

    els.active.innerHTML = cardHTML(

        queue[0],

        0,

        true

    );

}

/* ============================================================
    RENDER COLA
============================================================ */

function renderQueue() {

    els.queue.innerHTML = "";

    if (queue.length <= 1) {

        return;

    }

    let html = "";

    for (let i = 1; i < queue.length; i++) {

        html += cardHTML(

            queue[i],

            i,

            false

        );

    }

    els.queue.innerHTML = html;

}

/* ============================================================
    RENDER GENERAL
============================================================ */

function render() {

    updateHeader();

    renderActive();

    renderQueue();

}

/* ============================================================
    GUARDAR FORMULARIO
============================================================ */

function saveForm(e) {

    e.preventDefault();

    let duration;

    let type;

    if (els.type.value === "custom") {

        duration = parseInt(

            els.customMinutes.value

        );

        if (!duration || duration < 1) {

            alert("Introduce una duración válida.");

            return;

        }

        type = "Personalizado";

    }

    else {

        duration = parseInt(

            els.type.value

        );

        type = duration === 25

            ? "Interior / Exterior"

            : "Completo";

    }

    const client =

        els.clientName.value.trim();

    const phone =

        els.clientPhone.value.trim();

    if (editingId) {

        const car = queue.find(

            c => c.id === editingId

        );

        if (car) {

            car.duration = duration;

            car.type = type;

            car.client = client;

            car.phone = phone;

        }

        recalculateQueue();

    }

    else {

        createCar(

            duration,

            type,

            client,

            phone

        );

    }

    closeModal();

    render();

}

/* ============================================================
    RELOJ
============================================================ */

function tick() {

    if (queue.length === 0) {

        updateHeader();

        return;

    }

    recalculateQueue();

    render();

}

/* ============================================================
    CAMBIO DE TIPO
============================================================ */

function handleTypeChange() {

    if (els.type.value === "custom") {

        els.customContainer.classList.remove("hidden");

    } else {

        els.customContainer.classList.add("hidden");

    }

}

/* ============================================================
    CARGA INICIAL
============================================================ */

function initializeQueue() {

    loadQueue();

    if (queue.length > 0) {

        if (!queue[0].realStart) {

            queue[0].realStart = now().toISOString();

        }

        recalculateQueue();

    }

}

/* ============================================================
    EVENTOS
============================================================ */

function bindEvents() {

    $("add25").addEventListener("click", () => {

        createCar(

            25,

            "Interior / Exterior"

        );

        render();

    });

    $("add45").addEventListener("click", () => {

        createCar(

            45,

            "Completo"

        );

        render();

    });

    $("addCustom").addEventListener("click", () => {

        openModal();

        els.type.value = "custom";

        handleTypeChange();

    });

    els.type.addEventListener(

        "change",

        handleTypeChange

    );

    els.form.addEventListener(

        "submit",

        saveForm

    );

    $("cancelModal").addEventListener(

        "click",

        closeModal

    );

    $("cancelConfirm").addEventListener(

        "click",

        closeConfirm

    );

    $("acceptConfirm").addEventListener(

        "click",

        acceptConfirm

    );

    $("resetDay").addEventListener(

        "click",

        resetDay

    );

}

/* ============================================================
    INICIO
============================================================ */

function init() {

    initializeQueue();

    bindEvents();

    render();

    setInterval(

        tick,

        1000

    );

}

document.addEventListener(

    "DOMContentLoaded",

    init

);