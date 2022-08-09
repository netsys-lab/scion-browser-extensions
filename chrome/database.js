
const database = {
    requests: [],
}

// This is not optimal. The popup and the browser extension have different local/session storages
// So we need to use this sync storage which is limited to 8K and which is slow... 
// Until now I don't have a nice idea on how to solve this.
// phew...

if (window.database === undefined) {
    window.database = database;
}

function saveStorageValue(key, value) {
    return new Promise((resolve) => {
        chrome.storage.sync.set({ [key]: value }, function () {
            resolve();
        });
    });
}

function getStorageValue(key) {
    return new Promise((resolve) => {
        chrome.storage.sync.get([key], function (result) {
            resolve(result[key]);
        });
    });
}

const load = async () => {
    const str = await getStorageValue("requests");
    if (str && str != "") {

        window.database = JSON.parse(str);
    }
}

const save = async () => {
    await saveStorageValue("requests", JSON.stringify(window.database));
}


class DatabaseAdapter {

    constructor(table) {
        this.table = table;
    }

    get = (filter) => {

        return new Promise(resolve => {
            load().then(() => {
                let filteredRequests = window.database[this.table];
                Object.keys(filter).forEach((key) => {
                    filteredRequests = filteredRequests.filter(r => r[key] === filter[key]);
                });

                resolve(filteredRequests);
            })

        });

    }


    first = (filter) => {
        return new Promise(resolve => {
            load();
            let filteredRequests = window.database[this.table];
            Object.keys(filter).forEach((key) => {
                filteredRequests = filteredRequests.filter(r => r[key] === filter[key]);
            });
            if (filteredRequests.length > 0) {
                resolve(filteredRequests[0]);
            }

            resolve(null);
        });
    }

    add = (entry) => {
        return new Promise(resolve => {
            load().then(() => {
                // We need to keep the list small for now, since 
                // This storage thing can only handle 8KB...
                while (window.database[this.table].length > 50) {
                    window.database[this.table].shift();
                }

                window.database[this.table].push(entry);
                save().then(() => {
                    resolve(entry);
                });

            })

        })
    }

    update = (id, newEntry) => {
        return new Promise(resolve => {
            const entryIndex = window.database[this.table].findIndex(r => r.requestId === id);
            const updateEntry = {
                ...window.database[this.table][entryIndex],
                ...newEntry
            };

            window.database[this.table][entryIndex] = updateEntry;
            resolve(updateEntry);
        })
    }
}

export const getRequestsDatabaseAdapter = () => {
    return new Promise((resolve) => {
        resolve(new DatabaseAdapter("requests"));
    });
}