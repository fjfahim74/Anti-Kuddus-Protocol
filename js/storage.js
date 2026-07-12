const Storage = (function () {
    const PREFIX = 'akp_';

    function _key(key) {
        return PREFIX + key;
    }

    return {
        get(key) {
            try {
                const raw = localStorage.getItem(_key(key));
                return raw ? JSON.parse(raw) : null;
            } catch {
                return null;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(_key(key), JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },

        remove(key) {
            localStorage.removeItem(_key(key));
        },

        has(key) {
            return localStorage.getItem(_key(key)) !== null;
        },

        push(key, item) {
            const arr = this.get(key) || [];
            arr.push(item);
            this.set(key, arr);
            return arr;
        },

        update(key, updater) {
            const current = this.get(key);
            const updated = updater(current);
            this.set(key, updated);
            return updated;
        },

        removeFromArray(key, predicate) {
            const arr = this.get(key) || [];
            const filtered = arr.filter((item) => !predicate(item));
            this.set(key, filtered);
            return filtered;
        },

        updateInArray(key, predicate, updater) {
            const arr = this.get(key) || [];
            const updated = arr.map((item) => (predicate(item) ? updater(item) : item));
            this.set(key, updated);
            return updated;
        },

        clear() {
            const keys = Object.keys(localStorage);
            keys.forEach((k) => {
                if (k.startsWith(PREFIX)) {
                    localStorage.removeItem(k);
                }
            });
        },

        getAll() {
            const data = {};
            const keys = Object.keys(localStorage);
            keys.forEach((k) => {
                if (k.startsWith(PREFIX)) {
                    try {
                        data[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k));
                    } catch {
                        data[k.slice(PREFIX.length)] = localStorage.getItem(k);
                    }
                }
            });
            return data;
        }
    };
})();
