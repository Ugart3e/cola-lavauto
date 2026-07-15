/* ============================================================
   COLA LAVADERO
   SCRIPT.JS
============================================================ */
import {
    dbAddCar,
    dbUpdateCar,
    dbDeleteCar,
    dbListen,
    dbGetCars
} from "./db.js";

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

async function loadQueueFromFirestore() {

    const q = query(
        collection(db, "cars"),
        orderBy("position")
    );

    const snapshot = await getDocs(q);

    queue = [];

    snapshot.forEach((document) => {

        const car = document.data();

        car.id = document.id;

        queue.push(car);

    });

    if (queue.length > 0) {

        nextCarNumber =
            Math.max(...queue.map(car => car.number || 0)) + 1;

    } else {

        nextCarNumber = 1;

    }

}

function listenQueue() {

    dbListen((cars) => {

        queue = cars;

        if (queue.length > 0) {

            nextCarNumber =
                Math.max(...queue.map(c => c.number || 0)) + 1;

        } else {

            nextCarNumber = 1;

        }

        render();

    });

}

/* ============================================================
    CREAR COCHE
============================================================ */
async function createCar(duration, type, client = "", phone = "") {

    const cars = await dbGetCars();

    const car = {

        number: nextCarNumber,

        position: cars.length + 1,

        type,

        duration,

        client,

        phone,

        start: null,

        end: null,

        realStart: null

    };

    nextCarNumber++;

    await dbAddCar(car);

}
/* ============================================================
    RECALCULAR COLA
============================================================ */

async function recalculateQueue() {

    if (queue.length === 0) {
        return;
    }

    let current = queue[0].realStart
        ? new Date(queue[0].realStart)
        : now();

    queue[0].realStart = current.toISOString();

    let position = 1;

    for (const car of queue) {

        car.position = position++;

        car.start = current.toISOString();

        current = addMinutes(
            current,
            car.duration
        );

        car.end = current.toISOString();

    }

    await Promise.all(

        queue.map(car =>
            dbUpdateCar(car.id, {
                position: car.position,
                start: car.start,
                end: car.end,
                realStart: car.realStart
            })
        )

    );

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
async function deleteCar(id) {

    if (queue.length === 0) return;

    if (queue[0].id === id) return;

    showConfirm(

        "¿Eliminar este coche?",

        async () => {

            await dbDeleteCar(id);

            // Esperamos a que onSnapshot actualice queue
            setTimeout(async () => {

                await recalculateQueue();

            }, 100);

        }

    );

}
/* ============================================================
    MOVER ARRIBA
============================================================ */

async function moveCarUp(id) {

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

    await recalculateQueue();

}

/* ============================================================
    MOVER ABAJO
============================================================ */

async function moveCarDown(id) {

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

    await recalculateQueue();

}

/* ============================================================
    FINALIZAR COCHE
============================================================ */

async function finishCurrentCar() {

    if (queue.length === 0) return;

    const finishTime = now();

    const finishedCar = queue[0];

    await dbDeleteCar(finishedCar.id);

    if (queue.length > 1) {

        await dbUpdateCar(queue[1].id, {
            realStart: finishTime.toISOString()
        });

    }

    // Esperamos a que onSnapshot actualice la cola
    setTimeout(async () => {

        await recalculateQueue();

    }, 100);

}

/* ============================================================
    REINICIAR JORNADA
============================================================ */

async function resetDay() {

    showConfirm(

        "¿Reiniciar la jornada?",

        async () => {

            const deletes = queue.map(car =>
                dbDeleteCar(car.id)
            );

            await Promise.all(deletes);

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

async function saveForm(e) {

    e.preventDefault();

    let duration;
    let type;

    if (els.type.value === "custom") {

        duration = parseInt(els.customMinutes.value);

        if (!duration || duration < 1) {

            alert("Introduce una duración válida.");
            return;

        }

        type = "Personalizado";

    } else {

        duration = parseInt(els.type.value);

        type = duration === 25
            ? "Interior / Exterior"
            : "Completo";

    }

    const client = els.clientName.value.trim();
    const phone = els.clientPhone.value.trim();

    if (editingId) {

        await dbUpdateCar(editingId, {
            duration,
            type,
            client,
            phone
        });

        // Esperamos a que onSnapshot actualice queue
        setTimeout(async () => {

            await recalculateQueue();

        }, 100);

    } else {

        await createCar(
            duration,
            type,
            client,
            phone
        );

    }

    closeModal();

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

async function initializeQueue() {

    await loadQueueFromFirestore();

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

$("add25").addEventListener("click", async () => {

    await createCar(
        25,
        "Interior / Exterior"
    );

});

$("add45").addEventListener("click", async () => {

    await createCar(
        45,
        "Completo"
    );

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

async function init() {

    bindEvents();

    listenQueue();

    setInterval(

        tick,

        1000

    );

}

document.addEventListener(

    "DOMContentLoaded",

    init

);

window.finishCurrentCar = finishCurrentCar;
window.deleteCar = deleteCar;
window.editCar = editCar;
window.moveCarUp = moveCarUp;
window.moveCarDown = moveCarDown;