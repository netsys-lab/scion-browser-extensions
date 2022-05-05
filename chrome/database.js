
const database = {
    requests: [],
}

// This is crap. The popup and the browser extension have different local/session storages
// ...

if(window.database === undefined) {
    window.database = database;
}

function saveStorageValue(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({[key]: value}, function() {
        resolve();
      });
    });
  }

  function getStorageValue(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get([key], function(result) {
        resolve(result[key]);
      });
    });
  }

const load = async () => {
    const str = await getStorageValue("requests");
    if(str && str != "") {

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
            if(filteredRequests.length > 0) {
                return filteredRequests[0];
            }

            return null;
        });
    }

    add = (entry) => {
        return new Promise(resolve => {
            load().then(() => {
                // We need to keep the list small for now, since 
                // This storage thing can only handle 8KB...
                while(window.database[this.table].length > 50) {
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

// TODO: For later, if we want to persist things, but for now
// Its too time consuming to tackle this...
/*
class DatabaseAdapter {

    constructor(table, objectStore) {
        this.table = table;
        this.objectStore = objectStore;
    }

    open() {

    }

    close() {

    }

    get(filers) {

    }

    find(filers) {

    }

    add(entry) {
        return new Promise((resolve, reject) => {
            var request = this.objectStore.add(entry);
            request.onsuccess = function(event) {
                resolve(entry);
            };

            request.onerror = function(event) {
                reject(event.target.errorCode);
              };
        }); 
    }

    update(id, newEntry) {

    }
}

const getRequestsDatabaseAdapter = () => {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(dbName, 3);
        request.onerror = function(event) {
            // Machen Sie etwas mit request.errorCode!
            reject(request.errorCode);
        };
        request.onsuccess = function(event) {
            const db = event.target.result;
            var objectStore = db.createObjectStore("requests", { keyPath: "requestId" });
            objectStore.createIndex("tabId", "tabId", { unique: false });
            const dbAdapter = new DatabaseAdapter("requests", objectStore);
            resolve(dbAdapter);
        };
    })
    
}*/

// console.warn(getRequestsDatabaseAdapter);