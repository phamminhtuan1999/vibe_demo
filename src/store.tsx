import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { ACTORS, validateBackup, type Actor, type State } from "./domain";
import { seedState } from "./seed";
import { ZodError } from "zod";
const KEY = "ahabenefits:v1";
function readState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw
      ? { state: validateBackup(JSON.parse(raw)), error: "" }
      : { state: seedState(), error: "" };
  } catch {
    return {
      state: seedState(),
      error:
        "Saved data could not be read. Demo data is loaded in memory. Export your browser data before saving changes.",
    };
  }
}
const Store = createContext<null | {
  state: State;
  actor: Actor;
  setActor: (a: Actor) => void;
  commit: (fn: (s: State) => State, message?: string) => boolean;
  notice: string;
  notify: (text: string) => void;
  storageError: string;
  replace: (s: State) => void;
}>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readState);
  const [state, setState] = useState(initial.state);
  const stateRef = useRef(state);
  const [storageError, setStorageError] = useState(initial.error);
  const [actor, setActor] = useState<Actor>(ACTORS[0]);
  const [notice, notify] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          const next = validateBackup(JSON.parse(e.newValue));
          stateRef.current = next;
          setState(next);
          notify("Demo data updated in another tab.");
        } catch {
          setStorageError(
            "Data from another tab is invalid. Reload or restore a valid backup.",
          );
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function commit(fn: (s: State) => State, message = "Changes saved") {
    try {
      const stored = localStorage.getItem(KEY);
      const current = stored
        ? validateBackup(JSON.parse(stored))
        : stateRef.current;
      const next = fn(current);
      localStorage.setItem(KEY, JSON.stringify(next));
      stateRef.current = next;
      setState(next);
      setStorageError("");
      notify(message);
      return true;
    } catch (e) {
      notify(
        e instanceof ZodError
          ? e.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .slice(0, 3)
              .join("; ")
          : e instanceof Error
            ? e.message
            : "Could not save changes.",
      );
      return false;
    }
  }
  return (
    <Store.Provider
      value={{
        state,
        actor,
        setActor,
        commit,
        notice,
        notify,
        storageError,
        replace: (s) => {
          commit(() => s, "Demo data replaced.");
        },
      }}
    >
      {children}
    </Store.Provider>
  );
}
export function useStore() {
  const store = useContext(Store);
  if (!store) throw Error("Store not initialized");
  return store;
}
export function download(
  filename: string,
  content: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
