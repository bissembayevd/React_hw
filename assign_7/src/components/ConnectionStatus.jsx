import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function ConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [waiting, setWaiting] = useState(null);

  useEffect(() => {
    const refresh = () => setOnline(navigator.onLine);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    const workers = navigator.serviceWorker;
    let registration;
    let disposed = false;
    let hadController = Boolean(workers.controller);
    let reloading = false;
    const watched = new Set();
    const showUpdate = () => {
      if (!disposed && workers.controller && registration?.waiting) {
        setWaiting(registration.waiting);
      }
    };
    const watch = () => {
      const worker = registration.installing;
      if (!worker || watched.has(worker)) return;
      watched.add(worker);
      worker.addEventListener("statechange", showUpdate);
    };
    const controllerChanged = () => {
      if (hadController && !reloading) {
        reloading = true;
        window.location.reload();
      }
      hadController = Boolean(workers.controller);
    };
    workers.addEventListener("controllerchange", controllerChanged);
    workers.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: "none" })
      .then((result) => {
        if (disposed) return;
        registration = result;
        registration.addEventListener("updatefound", watch);
        watch();
        showUpdate();
      })
      .catch(() => {});
    return () => {
      disposed = true;
      workers.removeEventListener("controllerchange", controllerChanged);
      registration?.removeEventListener("updatefound", watch);
      for (const worker of watched) worker.removeEventListener("statechange", showUpdate);
    };
  }, []);

  return (
    <div className="connection-bar" role="status">
      {online ? <span>Online</span> : <Link to="/offline">Offline</Link>}
      {waiting && (
        <>
          <span>Доступна новая версия</span>
          <button type="button" onClick={() => waiting.postMessage("SKIP_WAITING")}>
            Обновить
          </button>
        </>
      )}
    </div>
  );
}
