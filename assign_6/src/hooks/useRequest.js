import { useEffect, useState } from "react";
export default function useRequest(load, key = "") {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({
    data: null,
    error: "",
    loading: true,
    key: null,
    version: -1,
  });
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    load(key, controller.signal)
      .then((data) => {
        if (current)
          setState({ data, error: "", loading: false, key, version });
      })
      .catch((error) => {
        if (current && error.name !== "AbortError")
          setState({
            data: null,
            error: error.message,
            loading: false,
            key,
            version,
          });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [load, key, version]);
  const current = state.key === key && state.version === version;
  return {
    data: current ? state.data : null,
    error: current ? state.error : "",
    loading: !current || state.loading,
    reload: () => setVersion((value) => value + 1),
  };
}
