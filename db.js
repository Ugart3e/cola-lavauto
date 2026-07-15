import {
    db,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    onSnapshot
} from "./firebase.js";

export async function dbAddCar(car) {

    return await addDoc(
        collection(db, "cars"),
        car
    );

}

export async function dbUpdateCar(id, data) {

    return await updateDoc(
        doc(db, "cars", id),
        data
    );

}

export async function dbDeleteCar(id) {

    return await deleteDoc(
        doc(db, "cars", id)
    );

}

export function dbListen(callback) {

    const q = query(
        collection(db, "cars"),
        orderBy("position")
    );

    return onSnapshot(q, (snapshot) => {

        const cars = [];

        snapshot.forEach((document) => {

            cars.push({
                id: document.id,
                ...document.data()
            });

        });

        callback(cars);

    });

}

export async function dbGetCars() {

    const q = query(
        collection(db, "cars"),
        orderBy("position")
    );

    const snapshot = await getDocs(q);

    const cars = [];

    snapshot.forEach((document) => {

        cars.push({
            id: document.id,
            ...document.data()
        });

    });

    return cars;

}